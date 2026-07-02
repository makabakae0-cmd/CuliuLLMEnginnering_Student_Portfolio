# Flask GLM-5 Backend

## 1) Install
```bash
cd /Users/zhongmeier/Documents/fungi/final/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Set API Key
```bash
export ZHIPUAI_API_KEY="your_real_key"
```

## 3) Run
```bash
python3 flask_glm5_server.py
```

Health:
- `GET http://127.0.0.1:8002/api/health`

Generate:
- `POST http://127.0.0.1:8002/api/generate`
- body: `{"prompt":"你好"}`
