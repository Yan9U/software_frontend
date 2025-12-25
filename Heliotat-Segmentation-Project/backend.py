"""Flask 后端：调用 YOLO-Seg 模型完成分割并记录检测结果。"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO
from werkzeug.utils import secure_filename

from database import ResultRepository


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp"}

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Path to training images for sample display
TRAIN_IMAGES_PATH = Path(__file__).parent / "heliotat" / "images" / "train"

# Settings storage file
SETTINGS_FILE = Path(__file__).parent / "settings.json"

# Mirror field data file
MIRROR_DATA_FILE = Path(__file__).parent / "mirror_data.json"

# Default settings
DEFAULT_SETTINGS = {
    "modbus_host": "192.168.1.100",
    "modbus_port": 502,
    "sync_interval": 60,
    "threshold_excellent": 95,
    "threshold_good": 85,
    "threshold_warning": 75,
    "model_confidence": 0.85,
}

# Simulated drone status
DRONE_STATUS = {
    "battery": 78,
    "position": "C区-15排",
    "status": "待机",
    "progress": 0,
    "is_inspecting": False,
}

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


@app.route("/api/history/export", methods=["GET"])
def export_history():
    """Export all detection history without limit (for Excel export)."""
    search = request.args.get("search")
    # Fetch all results without limit
    rows = REPOSITORY.fetch_results(limit=10000, search=search)
    results = [
        {
            "id": idx + 1,
            "time": row["created_at"],
            "filename": row["filename"],
            "target": row["target"],
            "center_x": row["center_x"],
            "center_y": row["center_y"],
            "confidence": row["confidence"],
        }
        for idx, row in enumerate(rows)
    ]
    return jsonify({"results": results, "total": len(results)})


# ============== NEW API ENDPOINTS ==============

@app.route("/api/mirror/image/<mirror_id>", methods=["GET"])
def get_mirror_image(mirror_id: str):
    """Get a random sample image for a mirror (simulated)."""
    try:
        # Get list of available training images
        if TRAIN_IMAGES_PATH.exists():
            images = list(TRAIN_IMAGES_PATH.glob("*.jpg"))
            if images:
                # Use mirror_id hash to get consistent but random-looking image
                idx = hash(mirror_id) % len(images)
                image_path = images[idx]
                return send_file(image_path, mimetype='image/jpeg')

        # Fallback: return a placeholder
        return jsonify({"error": "No images available"}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/mirror/image/random", methods=["GET"])
def get_random_image():
    """Get a random sample image."""
    try:
        if TRAIN_IMAGES_PATH.exists():
            images = list(TRAIN_IMAGES_PATH.glob("*.jpg"))
            if images:
                image_path = random.choice(images)
                return send_file(image_path, mimetype='image/jpeg')
        return jsonify({"error": "No images available"}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """Get dashboard statistics."""
    # Simulated real-time stats
    return jsonify({
        "total_mirrors": 14500,
        "avg_cleanliness": round(random.uniform(85, 92), 1),
        "mirrors_need_cleaning": random.randint(700, 1000),
        "inspections_this_month": random.randint(10, 15),
        "last_inspection": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
    })


@app.route("/api/dashboard/refresh", methods=["POST"])
def refresh_dashboard():
    """Refresh dashboard data."""
    return jsonify({
        "success": True,
        "message": "Data refreshed successfully",
        "timestamp": datetime.now().isoformat(),
        "stats": {
            "total_mirrors": 14500,
            "avg_cleanliness": round(random.uniform(85, 92), 1),
            "mirrors_need_cleaning": random.randint(700, 1000),
            "inspections_this_month": random.randint(10, 15),
        }
    })


@app.route("/api/drone/status", methods=["GET"])
def get_drone_status():
    """Get current drone status."""
    return jsonify(DRONE_STATUS)


@app.route("/api/drone/inspection/start", methods=["POST"])
def start_inspection():
    """Start drone inspection."""
    global DRONE_STATUS

    data = request.get_json() or {}
    zones = data.get("zones", "全场")

    DRONE_STATUS = {
        "battery": random.randint(85, 100),
        "position": f"{zones[:2] if len(zones) > 1 else 'A'}区-1排",
        "status": "巡检中",
        "progress": 0,
        "is_inspecting": True,
        "start_time": datetime.now().isoformat(),
        "zones": zones,
    }

    return jsonify({
        "success": True,
        "message": f"Inspection started for {zones}",
        "drone_status": DRONE_STATUS,
    })


@app.route("/api/drone/inspection/stop", methods=["POST"])
def stop_inspection():
    """Stop drone inspection."""
    global DRONE_STATUS

    DRONE_STATUS = {
        "battery": DRONE_STATUS.get("battery", 78) - random.randint(5, 15),
        "position": "基站",
        "status": "待机",
        "progress": 0,
        "is_inspecting": False,
    }

    return jsonify({
        "success": True,
        "message": "Inspection stopped",
        "drone_status": DRONE_STATUS,
    })


@app.route("/api/zones/stats", methods=["GET"])
def get_zone_stats():
    """Get zone statistics with cleanliness data."""
    zones = [
        {"zone": "A区", "count": 3647, "cleanliness": round(random.uniform(88, 95), 1), "status": "good"},
        {"zone": "B区", "count": 3563, "cleanliness": round(random.uniform(82, 90), 1), "status": "warning"},
        {"zone": "C区", "count": 3647, "cleanliness": round(random.uniform(87, 94), 1), "status": "good"},
        {"zone": "D区", "count": 3643, "cleanliness": round(random.uniform(72, 82), 1), "status": "critical"},
    ]

    # Update status based on cleanliness
    for zone in zones:
        if zone["cleanliness"] >= 90:
            zone["status"] = "good"
        elif zone["cleanliness"] >= 80:
            zone["status"] = "warning"
        else:
            zone["status"] = "critical"

    return jsonify({"zones": zones})


@app.route("/api/cleanliness/history", methods=["GET"])
def get_cleanliness_history():
    """Get cleanliness history for charts."""
    days = int(request.args.get("days", 30))

    history = []
    base_date = datetime.now()
    for i in range(days, 0, -4):
        date = base_date - timedelta(days=i)
        avg = round(random.uniform(85, 94), 1)
        history.append({
            "date": date.strftime("%m-%d"),
            "avg": avg,
            "min": round(avg - random.uniform(5, 10), 1),
            "max": round(avg + random.uniform(3, 7), 1),
        })

    return jsonify({"history": history})


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get system alerts."""
    alerts = [
        {"id": 1, "type": "warning", "message": "D区清洁度低于阈值", "time": "10分钟前", "zone": "D区"},
        {"id": 2, "type": "info", "message": f"无人机任务完成 - 批次#{datetime.now().strftime('%Y%m%d')}01", "time": "25分钟前", "zone": "全场"},
        {"id": 3, "type": "warning", "message": "B区部分定日镜需要清洗", "time": "1小时前", "zone": "B区"},
        {"id": 4, "type": "success", "message": "A区清洗作业完成", "time": "2小时前", "zone": "A区"},
    ]
    return jsonify({"alerts": alerts})


@app.route("/api/inspection/records", methods=["GET"])
def get_inspection_records():
    """Get inspection history records."""
    records = []
    base_date = datetime.now()

    for i in range(10):
        date = base_date - timedelta(days=i * 4)
        records.append({
            "id": f"INS-{date.strftime('%Y%m%d')}01",
            "date": date.strftime("%Y-%m-%d %H:%M"),
            "zones": random.choice(["全场", "A-C区", "D-F区", "A区", "B区"]),
            "mirrors": random.choice([14500, 7250, 3647]),
            "avgCleanliness": round(random.uniform(85, 94), 1),
            "status": "completed",
            "duration": f"{random.randint(25, 50)}min",
        })

    return jsonify({"records": records})


@app.route("/api/inspection/filter", methods=["POST"])
def filter_inspection_records():
    """Filter inspection records."""
    data = request.get_json() or {}
    search = data.get("search", "")
    zone = data.get("zone", "")
    date_from = data.get("dateFrom", "")

    # Return filtered mock data
    records = []
    base_date = datetime.now()

    for i in range(5):
        date = base_date - timedelta(days=i * 4)
        record_zone = random.choice(["全场", "A-C区", "D-F区"])
        if zone and zone != "全部区域" and zone[0] not in record_zone:
            continue
        records.append({
            "id": f"INS-{date.strftime('%Y%m%d')}01",
            "date": date.strftime("%Y-%m-%d %H:%M"),
            "zones": record_zone,
            "mirrors": random.choice([14500, 7250, 3647]),
            "avgCleanliness": round(random.uniform(85, 94), 1),
            "status": "completed",
            "duration": f"{random.randint(25, 50)}min",
        })

    return jsonify({"records": records, "filtered": True})


@app.route("/api/settings", methods=["GET"])
def get_settings():
    """Get current settings."""
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                settings = json.load(f)
                return jsonify(settings)
        except Exception:
            pass
    return jsonify(DEFAULT_SETTINGS)


@app.route("/api/settings", methods=["POST"])
def save_settings():
    """Save settings."""
    data = request.get_json() or {}

    # Merge with defaults
    settings = {**DEFAULT_SETTINGS, **data}

    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings, f, indent=2)
        return jsonify({"success": True, "message": "Settings saved successfully", "settings": settings})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/settings/test-connection", methods=["POST"])
def test_modbus_connection():
    """Test MODBUS TCP connection (simulated)."""
    data = request.get_json() or {}
    host = data.get("host", "192.168.1.100")
    port = data.get("port", 502)

    # Simulate connection test (random success/failure for demo)
    success = random.random() > 0.3  # 70% success rate

    if success:
        return jsonify({
            "success": True,
            "message": f"Successfully connected to {host}:{port}",
            "latency_ms": random.randint(5, 50),
        })
    else:
        return jsonify({
            "success": False,
            "message": f"Failed to connect to {host}:{port} - Connection timeout",
        }), 503


@app.route("/api/data/import", methods=["POST"])
def import_data():
    """Import cleaning records from file."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Simulate import process
    return jsonify({
        "success": True,
        "message": f"Successfully imported {file.filename}",
        "records_imported": random.randint(50, 200),
    })


@app.route("/api/mirrors/<zone>", methods=["GET"])
def get_mirrors_by_zone(zone: str):
    """Get mirror data for a specific zone."""
    # Simulated mirror data
    count = {"A": 3647, "B": 3563, "C": 3647, "D": 3643}.get(zone.upper(), 1000)

    mirrors = []
    for i in range(min(count, 100)):  # Return max 100 for performance
        mirrors.append({
            "id": f"{zone.upper()}-{i:04d}",
            "x": random.uniform(-500, 500),
            "y": random.uniform(-500, 500),
            "cleanliness": round(random.uniform(70, 99), 1),
            "zone": zone.upper(),
        })

    return jsonify({
        "zone": zone.upper(),
        "total_count": count,
        "mirrors": mirrors,
    })


@app.route("/api/mirror-field/data", methods=["GET"])
def get_mirror_field_data():
    """Get all mirror field data for the map visualization."""
    try:
        if MIRROR_DATA_FILE.exists():
            with open(MIRROR_DATA_FILE, "r") as f:
                mirror_data = json.load(f)
            return jsonify({
                "success": True,
                "total": len(mirror_data),
                "mirrors": mirror_data,
                "center": {"lat": 43.618492, "lng": 94.965492},
            })
        else:
            return jsonify({
                "success": False,
                "error": "Mirror data file not found",
            }), 404
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": str(exc),
        }), 500


@app.route("/api/mirror-field/zones", methods=["GET"])
def get_mirror_field_zones():
    """Get mirror data grouped by zones."""
    try:
        if MIRROR_DATA_FILE.exists():
            with open(MIRROR_DATA_FILE, "r") as f:
                mirror_data = json.load(f)

            # Group by zone
            zones = {}
            for mirror in mirror_data:
                zone = mirror.get("z", "Unknown")
                if zone not in zones:
                    zones[zone] = {"count": 0, "mirrors": [], "avg_cleanliness": 0, "total_c": 0}
                zones[zone]["count"] += 1
                zones[zone]["mirrors"].append(mirror)
                zones[zone]["total_c"] += mirror.get("c", 0)

            # Calculate averages
            zone_stats = []
            for zone_name, data in zones.items():
                zone_stats.append({
                    "zone": zone_name,
                    "count": data["count"],
                    "avg_cleanliness": round(data["total_c"] / data["count"], 1) if data["count"] > 0 else 0,
                })

            return jsonify({
                "success": True,
                "zones": zone_stats,
            })
        else:
            return jsonify({
                "success": False,
                "error": "Mirror data file not found",
            }), 404
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": str(exc),
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
