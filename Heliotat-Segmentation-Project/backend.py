"""Flask 后端：调用 YOLO-Seg 模型完成分割并记录检测结果。"""

from __future__ import annotations

import base64
import hashlib
import io
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO
from werkzeug.utils import secure_filename

from database import ResultRepository


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp"}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

WEIGHTS_PATH = Path("best.pt")
if not WEIGHTS_PATH.exists():
    raise FileNotFoundError("未找到 best.pt,请将训练好的 YOLO-Seg 权重放到项目根目录。")

MODEL = YOLO(str(WEIGHTS_PATH))
REPOSITORY = ResultRepository(Path("classification_results.db"))


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _predict(image: Image.Image, conf: float = 0.25) -> Tuple[Dict, bytes]:
    np_image = np.array(image)
    results = MODEL.predict(np_image, conf=conf, save=False, verbose=False)
    if not results:
        return {"detections": []}, b""

    result = results[0]
    detections = []
    names = result.names
    boxes = getattr(result, "boxes", None)
    if boxes is not None:
        xywh = boxes.xywh.cpu().numpy()
        cls = boxes.cls.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        for i in range(len(cls)):
            center_x, center_y, _, _ = xywh[i]
            target = names.get(int(cls[i]), str(int(cls[i])))
            detections.append(
                {
                    "target": target,
                    "center": [float(center_x), float(center_y)],
                    "confidence": float(confs[i]),
                }
            )

    annotated = result.plot()
    buffer = io.BytesIO()
    Image.fromarray(annotated).save(buffer, format="PNG")
    annotated_bytes = buffer.getvalue()
    return {"detections": detections}, annotated_bytes


@app.route("/api/health", methods=["GET"])
def health() -> Tuple[str, int]:
    return jsonify({"status": "ok"}), 200


def _rows_to_detections(rows: List) -> Tuple[List[Dict[str, object]], str]:  # type: ignore[type-arg]
    detections = [
        {
            "target": row["target"],
            "center": [row["center_x"], row["center_y"]],
            "confidence": row["confidence"],
        }
        for row in rows
        if row["target"] != "none"
    ]
    annotated_b64 = rows[0]["annotated_image"] if rows and rows[0]["annotated_image"] else ""
    return detections, annotated_b64


@app.route("/api/classify", methods=["POST"])
def classify():
    if "file" not in request.files:
        return jsonify({"error": "缺少文件字段 file"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "未选择文件"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "只支持 jpg/jpeg/png 格式"}), 400

    filename = secure_filename(file.filename)
    try:
        image_bytes = file.read()
        file_hash = hashlib.md5(image_bytes).hexdigest()
        existing_rows = REPOSITORY.get_results_by_hash(file_hash)
        if existing_rows:
            detections, annotated_b64 = _rows_to_detections(existing_rows)
            return jsonify(
                {
                    "filename": filename,
                    "detections": detections,
                    "annotated_image": annotated_b64,
                    "cached": True,
                }
            )

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        data, annotated_bytes = _predict(image)
        detections = data.get("detections", [])
        annotated_b64 = (
            base64.b64encode(annotated_bytes).decode("utf-8") if annotated_bytes else ""
        )

        if not detections:
            REPOSITORY.insert_result(
                filename,
                "none",
                -1.0,
                -1.0,
                0.0,
                file_hash,
                annotated_b64,
            )
        else:
            for det in detections:
                center = det.get("center", [0.0, 0.0])
                REPOSITORY.insert_result(
                    filename,
                    det.get("target", "unknown"),
                    center[0],
                    center[1],
                    det.get("confidence", 0.0),
                    file_hash,
                    annotated_b64,
                )

        return jsonify(
            {
                "filename": filename,
                "detections": detections,
                "annotated_image": annotated_b64,
                "cached": False,
            }
        )
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"推理失败: {exc}"}), 500


@app.route("/api/history", methods=["GET"])
def history():
    try:
        limit = int(request.args.get("limit", 50))
    except ValueError:
        limit = 50
    limit = max(1, min(200, limit))
    search = request.args.get("search")
    rows = REPOSITORY.fetch_results(limit=limit, search=search)
    results = [
        {
            "time": row["created_at"],
            "filename": row["filename"],
            "target": row["target"],
            "center_x": row["center_x"],
            "center_y": row["center_y"],
            "confidence": row["confidence"],
        }
        for row in rows
    ]
    return jsonify({"results": results})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
