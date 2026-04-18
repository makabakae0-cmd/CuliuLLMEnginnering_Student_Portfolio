# Week02 MVP Run Guide

## 1) 启动后端
```bash
cd demo/fungi_mvp_week02/backend
python3 server.py
```
默认地址：`http://localhost:8080`

## 2) 启动前端静态服务（另一个终端）
```bash
cd demo/fungi_mvp_week02/frontend
python3 -m http.server 5502
```
访问：`http://localhost:5502`

## 3) 验证点
- 页面能打开
- 点击“检查后端健康状态”可返回 JSON
- `db/schema.sql` 和 `db/erd.mmd` 可用于后续正式开发
