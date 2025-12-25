# Repository Guidelines

## 项目结构与模块
- `heliotat/`：示例定日镜分割数据，可按 YOLO-Seg 标注格式替换成自有数据。
- `best.pt`：Ultralytics YOLO-Seg 权重文件，Flask 后端与独立脚本默认加载此路径。
- `backend.py`：Flask API，负责接收上传、执行 YOLO 推理、写入 SQLite（`classification_results.db`）并通过文件 MD5 去重复用历史结果。
- `streamlit_app.py`：Web 前端，支持上传图片、查看推理列表与分割叠加图、查询历史并导出 Excel。
- `database.py`：SQLite 访问层，维护 `detection_results` 表结构（含 `file_hash`、`annotated_image`）。

## 构建、运行与常用命令
- `pip install -r requirements.txt`：安装 Ultralytics、Streamlit、Flask、pandas 等依赖。
- `python backend.py`：启动后端 API（默认 `http://0.0.0.0:5000`），首次运行会创建或迁移 `classification_results.db`。
- `streamlit run streamlit_app.py`：启动前端，必要时设置 `BACKEND_URL=http://<host>:5000/api` 指向后端。

## 开发规范
- 统一使用 Python 3.9+、PEP 8 风格与 4 空格缩进；函数/变量用 `snake_case`，类使用 `PascalCase`。
- 后端返回 JSON 字段维持 `filename`、`detections`、`annotated_image`、`cached`；历史 API 必须输出 `time/filename/target/center_x/center_y/confidence`。
- 修改数据库结构时务必在 `database.py` 中编写自动迁移（`ALTER TABLE` 等），保证旧库兼容。

## 测试与验证
- Web 流程：`python backend.py` + `streamlit run streamlit_app.py`，上传样例图片确认推理与历史查询/导出正常。
- 脚本流程：运行 `python yolo_seg_infer.py` 验证权重及数据格式无误，再检查 `seg_results/` 输出。
- 若调整去重逻辑，需确保同一文件重复上传会返回 `cached=true` 且不会重复写入数据库。

## 提交与协作
- 提交信息使用简洁祈使句（例：`add hash cache`），确保未提交临时输出（如 `seg_results/`）。
- PR 描述需包含变更概要、运行过的命令及关键输出；涉及数据库或权重迁移需在描述中附操作步骤。

## 安全与配置
- `classification_results.db`、`best.pt` 体积较大，请勿随意上传到公共渠道；必要时使用 release 附件并注明来源。
- 生产部署请置于受控网络，Flask 仅用于开发调试；线上请通过反向代理/WSGI 服务并做好端口访问限制。
