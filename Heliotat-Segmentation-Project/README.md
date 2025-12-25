# Cat-Dog-Recognition-Project
（已升级为定日镜检测系统）本项目基于 Ultralytics YOLO-Seg，可对定日镜图像执行目标检测与分割，实时输出检测到的镜面、中心点坐标与置信度。配套 Flask + Streamlit 前后端分离架构，支持浏览器上传图片查看推理结果，并将检测明细持久化到 SQLite，可按文件名查询并导出为 Excel。
# 一、项目概述
当前版本聚焦定日镜镜面状态的实例分割，借助 YOLO-Seg 对上传图像生成检测框、掩码及置信度。系统提供“YOLO 训练（可选）→ 推理 → Web 展示 → SQLite 记录”完整链路，可直接用于定日镜巡检或扩展至其他分割场景。
# 二、数据集
默认示例接入了定日镜分割数据集（heliotat），您也可以替换为其他符合 YOLO-Seg 标注格式的数据。典型做法是提供 train/val/test 目录与 `data.yaml`，并使用 Ultralytics 工具训练得到 `best.pt` 权重。  
# 三、功能特点
1.YOLO-Seg 训练与评估：通过 Ultralytics 工具链训练分割模型（如 `yolov8n-seg`），将生成的 `best.pt` 放置在项目根目录即可被后端与前端复用。  
2.Web 端推理展示：Streamlit 前端支持上传图片，由 Flask 后端调用 YOLO-Seg 推理，实时可视化分割结果和检测列表。  
3.SQLite 历史记录：每条检测结果包含时间、文件名、检测目标、中心点坐标、置信度，可在前端查看/检索并导出 Excel。后端内置“文件哈希去重”，相同图片再次上传会直接复用历史推理结果。  
# 四、技术栈
编程语言：Python  
模型框架：Ultralytics YOLO-Seg、PyTorch  
前端：Streamlit（Web）  
后端：Flask、SQLite（存储检测记录）  
数据处理：pandas、numpy、PIL 等  
# 五、项目结构
- `heliotat/`：示例定日镜分割数据集，包含样例图片及标注，可按需替换。  
- `backend.py`：Flask 服务，接收上传、调用 YOLO-Seg、返回可视化结果并记录 SQLite。  
- `streamlit_app.py`：Streamlit 前端，上传图片、展示分割图、查询历史记录并导出 Excel。  
- `database.py`：SQLite 访问层，建表 `detection_results` 并提供查询/写入。  
- `best.pt`：训练得到的 YOLO-Seg 权重，默认从根目录加载。  
- `classification_results.db`：运行 Flask 服务后自动生成的 SQLite 文件（含检测明细与缓存）。  
# 六、使用方法
1.数据准备：将定日镜图像整理为 YOLO-Seg 需要的目录/标注格式（示例放在 `./heliotat`）。  
2.模型训练（可选）：若需自行训练，使用 Ultralytics CLI 或脚本（示例：`yolo segment train data=xxx.yaml model=yolov8n-seg.pt`）并将生成的 `best.pt` 放到仓库根目录。  
3.运行前后端分离 Web 应用：  
确保安装 requirements.txt 中的依赖（`pip install -r requirements.txt`，其中包含 ultralytics、pandas/openpyxl 等）。  
启动后端：`python backend.py`（默认监听 http://localhost:5000，首次运行会创建/更新 classification_results.db）。  
启动前端：`streamlit run streamlit_app.py`，如需访问远程后端可设置 `BACKEND_URL=http://<host>:5000/api`。  
在浏览器中上传定日镜图片，前端会调用后端完成分割并显示检测结果；“历史查询”区可检索 SQLite 中的记录并导出 Excel。  
注意：后端依据文件 MD5 做去重，相同图片会直接返回缓存结果并标记 `cached=true`，避免重复推理。  
# 七、未来改进方向
- 结合轻量化部署（TensorRT、ONNX Runtime 等）提升推理速度，便于落地到边缘设备；  
- 根据定日镜场景需求扩展更多类别或状态类型，并支持批量推理/自动化巡检流程；  
- 在前端增加批量上传、分割掩码透明度调节等交互功能，优化巡检报告导出体验。  
# 八、贡献指南
欢迎对本项目进行贡献。若有任何改进建议或发现问题，请提交 issue 或 pull request。提交代码时，请遵循以下规范：  
1.确保代码的可读性和可维护性，添加必要的注释。  
2.进行代码测试，确保新功能或修改不会影响现有功能的正常运行。  
