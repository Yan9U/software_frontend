"""Streamlit 前端：上传图片、调用后端并查询历史记录。"""

from __future__ import annotations

import os
from base64 import b64decode
from io import BytesIO
from typing import Dict, List

import pandas as pd
import requests
import streamlit as st
from PIL import Image


API_BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:5000/api")


def classify_image(file) -> Dict[str, object]:
    files = {
        "file": (
            file.name,
            file.getvalue(),
            file.type or "application/octet-stream",
        )
    }
    response = requests.post(f"{API_BASE_URL}/classify", files=files, timeout=30)
    return response.json()


def fetch_history(search: str, limit: int) -> List[Dict[str, object]]:
    params = {"limit": limit}
    if search:
        params["search"] = search
    response = requests.get(f"{API_BASE_URL}/history", params=params, timeout=15)
    data = response.json()
    return data.get("results", [])


def main() -> None:
    st.set_page_config(page_title="定日镜检测系统")
    st.title("定日镜检测系统（Streamlit 前端）")
    st.caption("上传定日镜图片获取 YOLO-Seg 推理结果，并同步记录到 SQLite 中")

    uploaded_file = st.file_uploader("上传待分割的定日镜图片", type=["jpg", "jpeg", "png", "bmp"])
    if uploaded_file:
        image = Image.open(uploaded_file)
        st.image(image, caption=uploaded_file.name, width="stretch")
        if st.button("开始分割", width="stretch"):
            with st.spinner("模型推理中..."):
                try:
                    result = classify_image(uploaded_file)
                except requests.RequestException as exc:  # noqa: PERF203
                    st.error(f"请求后端失败: {exc}")
                else:
                    if "error" in result:
                        st.error(result["error"])
                    else:
                        detections = result.get("detections", [])
                        st.success(f"推理完成，共检测到 {len(detections)} 个目标。")
                        if result.get("cached"):
                            st.info("命中文件哈希，复用了历史推理结果。")

                        if detections:
                            det_df = pd.DataFrame(detections)
                            det_df["center_x"] = det_df["center"].apply(lambda c: c[0])
                            det_df["center_y"] = det_df["center"].apply(lambda c: c[1])
                            det_df = det_df.drop(columns=["center"])
                            st.dataframe(det_df, width="stretch")

                        annotated_b64 = result.get("annotated_image")
                        if annotated_b64:
                            annotated_bytes = b64decode(annotated_b64)
                            annotated_img = Image.open(BytesIO(annotated_bytes))
                            st.image(annotated_img, caption="分割结果", width="stretch")

    st.divider()
    st.subheader("历史查询")
    search = st.text_input("按文件名模糊查询 (可选)")
    limit = st.slider("返回记录条数", min_value=10, max_value=100, value=30, step=10)
    if "history" not in st.session_state:
        st.session_state.history = []

    if st.button("刷新历史记录"):
        with st.spinner("加载历史记录..."):
            try:
                st.session_state.history = fetch_history(search, limit)
            except requests.RequestException as exc:  # noqa: PERF203
                st.error(f"获取历史记录失败: {exc}")

    if st.session_state.history:
        df = pd.DataFrame(st.session_state.history)
        ordered_cols = ["time", "filename", "target", "center_x", "center_y", "confidence"]
        df = df[[col for col in ordered_cols if col in df.columns]]
        st.dataframe(df, width="stretch")

        buffer = BytesIO()
        df.to_excel(buffer, index=False)
        buffer.seek(0)
        st.download_button(
            "导出查询结果为 Excel",
            buffer,
            file_name="history.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    else:
        st.info("暂无历史数据，请先上传图片或点击刷新。")


if __name__ == "__main__":
    main()
