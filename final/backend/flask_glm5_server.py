#!/usr/bin/env python3
"""Flask proxy for GLM-5 based on BigModel docs.

API:
- POST /api/generate
  body:
    {"prompt": "...", "temperature": 0.7}
    or OpenAI-style: {"messages": [...], "temperature": 0.7}

Env:
- ZHIPUAI_API_KEY=your_key
- GLM5_MODEL=glm-5 (optional)
- PORT=8002 (optional)
"""

from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

BIGMODEL_CHAT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
DEFAULT_MODEL = os.getenv("GLM5_MODEL", "glm-5")
DEFAULT_EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DEFAULT_CHROMA_DIR = os.getenv(
    "RAG_CHROMA_DIR",
    "/Users/zhongmeier/Documents/GitHub/CuliuLLMEnginnering_Student_Portfolio/rag/chroma_db",
)
DEFAULT_CHROMA_COLLECTION = os.getenv("RAG_CHROMA_COLLECTION", "zombie_fungi_kb")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_RAG_FILES = [
    PROJECT_ROOT / "Lesson10_student_workbook.md",
    PROJECT_ROOT / "ppt_pagesscript.md",
]
LOCAL_RAG_SNIPPETS = [
    {
        "chunk_id": "builtin:death_grip",
        "title": "Death grip / 死亡紧咬",
        "tags": "death grip,死亡紧咬,Ophiocordyceps,host behavior",
        "document": (
            "Death grip（死亡紧咬，也可译作死亡抓握）是僵尸蚂蚁真菌感染后期的标志性行为。"
            "受感染的蚂蚁会爬到适合真菌传播的位置，用下颚牢牢咬住叶脉、枝条或其他植物表面，"
            "在死亡前把身体固定住。这个固定姿势为真菌从宿主体内长出子实体、释放孢子提供稳定位置。"
            "它不是简单的主动抓握，而是感染导致宿主行为和肌肉功能异常后的结果。"
        ),
    },
    {
        "chunk_id": "builtin:behavior_manipulation",
        "title": "Fungal behavior manipulation / 真菌行为操控",
        "tags": "fungi,host,behavior manipulation,zombie ant,Ophiocordyceps",
        "document": (
            "某些 Ophiocordyceps 真菌会改变宿主昆虫的行为，使宿主离开原本活动区域，"
            "移动到更适合真菌生长和孢子传播的微环境。典型过程包括异常移动、定位到植被上、"
            "死亡紧咬固定，以及宿主死亡后真菌子实体发育。"
        ),
    },
]
LOCAL_SEARCH_STOPWORDS = {
    "a", "an", "and", "are", "as", "is", "it", "of", "or", "the", "to", "what",
    "whats", "what's", "why", "how", "which", "who", "where", "when", "in", "on",
    "for", "with", "about", "does", "do", "did", "be", "by",
}

_embed_model = None
_chroma_client = None


def _get_embed_model():
    global _embed_model
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError(
            "RAG embedding dependency is not installed. Install backend/requirements.txt to enable RAG."
        ) from exc

    if _embed_model is None:
        _embed_model = SentenceTransformer(DEFAULT_EMBED_MODEL, local_files_only=True)
    return _embed_model


def _get_api_key() -> str:
    api_key = '42dff12511954dd28f2dbf817f7ca02b.rydbMVpCkl8HjfA3'
    if not api_key:
        raise RuntimeError('Please set ZHIPUAI_API_KEY before starting the Flask server.')

    try:
        api_key.encode('latin-1')
    except UnicodeEncodeError as exc:
        raise RuntimeError('ZHIPUAI_API_KEY contains non-ASCII characters. Please use a plain ASCII key.') from exc

    return api_key


def _get_chroma_collection():
    global _chroma_client
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError(
            "RAG vector database dependency is not installed. Install backend/requirements.txt to enable RAG."
        ) from exc

    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=DEFAULT_CHROMA_DIR)
    return _chroma_client.get_collection(DEFAULT_CHROMA_COLLECTION)


def _error_payload(exc: Exception) -> Dict[str, str]:
    return {"type": exc.__class__.__name__, "message": str(exc)}


def _build_rag_diagnostics(check_embedding: bool = False) -> Dict[str, Any]:
    chroma_dir = Path(DEFAULT_CHROMA_DIR)
    sqlite_path = chroma_dir / "chroma.sqlite3"
    diagnostics: Dict[str, Any] = {
        "chroma_dir": DEFAULT_CHROMA_DIR,
        "chroma_dir_exists": chroma_dir.exists(),
        "chroma_sqlite_exists": sqlite_path.exists(),
        "collection": DEFAULT_CHROMA_COLLECTION,
        "collection_exists": False,
        "collection_count": None,
        "embedding_model": DEFAULT_EMBED_MODEL,
        "embedding_available": None,
        "local_fallback_files": [str(path.name) for path in LOCAL_RAG_FILES if path.exists()],
    }

    try:
        collection = _get_chroma_collection()
        diagnostics["collection_exists"] = True
        diagnostics["collection_count"] = collection.count()
    except Exception as exc:
        diagnostics["chroma_error"] = _error_payload(exc)

    sqlite_info = _inspect_chroma_sqlite()
    diagnostics.update(sqlite_info)
    if not diagnostics["collection_exists"] and sqlite_info.get("sqlite_collection_exists"):
        diagnostics["collection_exists"] = True
    if diagnostics["collection_count"] is None and sqlite_info.get("sqlite_embedding_count") is not None:
        diagnostics["collection_count"] = sqlite_info["sqlite_embedding_count"]

    if check_embedding:
        try:
            model = _get_embed_model()
            vector = model.encode(["health check"]).tolist()[0]
            diagnostics["embedding_available"] = True
            diagnostics["embedding_dim"] = len(vector)
        except Exception as exc:
            diagnostics["embedding_available"] = False
            diagnostics["embedding_error"] = _error_payload(exc)

    return diagnostics


def _inspect_chroma_sqlite() -> Dict[str, Any]:
    sqlite_path = Path(DEFAULT_CHROMA_DIR) / "chroma.sqlite3"
    info: Dict[str, Any] = {
        "sqlite_collection_exists": False,
        "sqlite_embedding_count": None,
        "sqlite_dimension": None,
    }
    if not sqlite_path.exists():
        return info

    try:
        conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
        row = conn.execute(
            "select id, dimension from collections where name = ?",
            (DEFAULT_CHROMA_COLLECTION,),
        ).fetchone()
        if row:
            info["sqlite_collection_exists"] = True
            info["sqlite_dimension"] = row[1]
            info["sqlite_embedding_count"] = conn.execute(
                "select count(*) from embeddings"
            ).fetchone()[0]
        conn.close()
    except Exception as exc:
        info["sqlite_error"] = _error_payload(exc)
    return info


def _tokenize_for_local_search(text: str) -> List[str]:
    normalized = text.lower()
    tokens = re.findall(r"[a-z][a-z0-9_-]+|\d+|[\u4e00-\u9fff]", normalized)
    return [token for token in tokens if token not in LOCAL_SEARCH_STOPWORDS]


def _chunk_text(text: str, max_chars: int = 900) -> List[str]:
    raw_parts = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    chunks: List[str] = []
    for part in raw_parts:
        if len(part) <= max_chars:
            chunks.append(part)
            continue
        for start in range(0, len(part), max_chars):
            chunk = part[start:start + max_chars].strip()
            if chunk:
                chunks.append(chunk)
    return chunks


def _local_rag_search(question: str, top_k: int = 3) -> List[Dict[str, Any]]:
    query_terms = set(_tokenize_for_local_search(question))
    scored: List[Dict[str, Any]] = []

    for snippet in LOCAL_RAG_SNIPPETS:
        searchable = " ".join([snippet["title"], snippet["tags"], snippet["document"]])
        terms = set(_tokenize_for_local_search(searchable))
        overlap = len(query_terms & terms)
        phrase_bonus = 3 if question.lower().strip() in searchable.lower() else 0
        if overlap + phrase_bonus <= 0:
            continue
        scored.append(
            {
                "score": overlap + phrase_bonus + 5,
                "chunk_id": snippet["chunk_id"],
                "document": snippet["document"],
                "metadata": {
                    "title": snippet["title"],
                    "source": "builtin_biology_fallback",
                    "tags": snippet["tags"],
                },
                "distance": round(1 / (overlap + phrase_bonus + 2), 4),
            }
        )

    for file_path in LOCAL_RAG_FILES:
        if not file_path.exists():
            continue
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        for index, chunk in enumerate(_chunk_text(text)):
            terms = set(_tokenize_for_local_search(chunk))
            overlap = len(query_terms & terms)
            if overlap <= 0:
                continue
            scored.append(
                {
                    "score": overlap,
                    "chunk_id": f"local:{file_path.name}:{index + 1}",
                    "document": chunk,
                    "metadata": {
                        "title": file_path.stem,
                        "source": file_path.name,
                        "tags": "local_fallback",
                    },
                    "distance": round(1 / (overlap + 1), 4),
                }
            )

    scored.sort(key=lambda item: item["score"], reverse=True)
    retrieved = scored[:max(1, top_k)]
    for item in retrieved:
        item.pop("score", None)
    return retrieved


def _build_context_lines(retrieved: List[Dict[str, Any]]) -> List[str]:
    context_lines: List[str] = []
    for item in retrieved:
        meta = item["metadata"]
        context_lines.append(f"[{item['chunk_id']}] {meta.get('title', '')}")
        context_lines.append(item["document"])
        context_lines.append("")
    return context_lines


def _build_evidence_only_answer(retrieved: List[Dict[str, Any]], reason: str = "") -> str:
    if not retrieved:
        return "没有检索到相关知识片段，当前无法基于知识库回答这个问题。"

    top = retrieved[0]
    title = top.get("metadata", {}).get("title", "最相关知识片段")
    prefix = "当前先展示检索到的最相关证据。"
    if reason:
        prefix = f"{prefix}（{reason}）"
    return (
        f"{prefix}\n"
        f"证据标题：{title}\n"
        f"证据内容：{top.get('document', '')}"
    )


def _call_glm(messages: List[Dict[str, str]], model: str, temperature: float = 0.4, max_tokens: int = 1200) -> Dict[str, Any]:
    api_key = _get_api_key()
    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "thinking": {"type": "disabled"},
    }
    resp = requests.post(
        BIGMODEL_CHAT_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json=body,
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()


def _to_messages(payload: Dict[str, Any]) -> List[Dict[str, str]]:
    messages = payload.get("messages")
    if isinstance(messages, list) and messages:
        return messages

    prompt = payload.get("prompt", "")
    if not isinstance(prompt, str) or not prompt.strip():
        return []

    return [{"role": "user", "content": prompt.strip()}]


@app.get("/api/health")
def health() -> Any:
    return jsonify({"status": "ok", "service": "flask-glm5-proxy", "model": DEFAULT_MODEL})


@app.get("/api/rag/health")
def rag_health() -> Any:
    diagnostics = _build_rag_diagnostics(check_embedding=True)
    chroma_ready = (
        not diagnostics.get("chroma_error")
        and bool(diagnostics.get("collection_exists"))
        and bool(diagnostics.get("collection_count"))
    )
    sqlite_ready = bool(diagnostics.get("sqlite_collection_exists")) and bool(diagnostics.get("sqlite_embedding_count"))
    embedding_ready = diagnostics.get("embedding_available") is True
    fallback_ready = bool(diagnostics.get("local_fallback_files"))

    if chroma_ready and embedding_ready:
        status = "ok"
    elif fallback_ready or sqlite_ready:
        status = "degraded"
    else:
        status = "error"

    return jsonify(
        {
            "status": status,
            "service": "fungi-rag",
            "embedding_model": DEFAULT_EMBED_MODEL,
            "collection": DEFAULT_CHROMA_COLLECTION,
            "chroma_dir": DEFAULT_CHROMA_DIR,
            "db_exists": diagnostics["chroma_dir_exists"],
            "count": diagnostics.get("collection_count"),
            "source": "chromadb" if chroma_ready and embedding_ready else "local_fallback",
            "diagnostics": diagnostics,
        }
    )


@app.post("/api/rag/ask")
def rag_ask() -> Any:
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    top_k = int(payload.get("top_k", 3))
    if not question:
        return jsonify({"error": "invalid_input", "message": "Need question"}), 400

    diagnostics = _build_rag_diagnostics(check_embedding=False)
    source = "chromadb"
    query_embedding = []
    retrieved: List[Dict[str, Any]] = []

    try:
        embed_model = _get_embed_model()
        collection = _get_chroma_collection()
        query_embedding = embed_model.encode([question]).tolist()[0]
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        for index, chunk_id in enumerate(ids):
            retrieved.append(
                {
                    "chunk_id": chunk_id,
                    "document": documents[index],
                    "metadata": metadatas[index] or {},
                    "distance": distances[index],
                }
            )
    except Exception as exc:
        source = "local_fallback"
        diagnostics["retrieval_error"] = _error_payload(exc)
        retrieved = _local_rag_search(question, top_k=top_k)

    if not retrieved and source == "chromadb":
        source = "local_fallback"
        diagnostics["retrieval_warning"] = "ChromaDB returned no results; local fallback was attempted."
        retrieved = _local_rag_search(question, top_k=top_k)

    context_lines = _build_context_lines(retrieved)

    answer = ""
    raw = None
    if retrieved:
        prompt = (
            "你是一个生物学课堂助手。请只基于给定检索证据回答用户关于 fungi 和 host 的问题。"
            "回答要求：中文、准确、简洁、适合课堂解释；如果证据不足，要明确说证据不足；"
            "不要编造检索结果之外的事实。\n\n"
            f"【用户问题】\n{question}\n\n"
            f"【检索证据】\n{chr(10).join(context_lines)}\n"
        )
        try:
            raw = _call_glm(
                messages=[{"role": "user", "content": prompt}],
                model=DEFAULT_MODEL,
                temperature=0.2,
                max_tokens=900,
            )
            answer = raw.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        except Exception as exc:
            diagnostics["glm_error"] = _error_payload(exc)
            answer = _build_evidence_only_answer(retrieved, "GLM-5 暂时不可用")
    else:
        answer = _build_evidence_only_answer(retrieved)

    return jsonify(
        {
            "question": question,
            "answer": answer,
            "retrieved": retrieved,
            "query_vector_dim": len(query_embedding) if query_embedding else None,
            "source": source,
            "diagnostics": diagnostics,
            "raw": raw,
        }
    )


@app.post("/api/generate")
def generate() -> Any:
    try:
        api_key = _get_api_key()
    except RuntimeError as exc:
        return jsonify({"error": "missing_api_key", "message": str(exc)}), 500

    payload = request.get_json(silent=True) or {}
    messages = _to_messages(payload)
    if not messages:
        return jsonify({"error": "invalid_input", "message": "Need prompt or messages"}), 400

    model = payload.get("model") or DEFAULT_MODEL
    temperature = payload.get("temperature", 0.7)
    max_tokens = payload.get("max_tokens", 4096)

    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # 默认关闭思考模式，避免 reasoning_tokens 吃满导致 content 为空。
    thinking = payload.get("thinking")
    body["thinking"] = thinking if isinstance(thinking, dict) else {"type": "disabled"}

    try:
        resp = requests.post(
            BIGMODEL_CHAT_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=body,
            timeout=90,
        )
    except requests.RequestException as exc:
        return jsonify({"error": "upstream_network_error", "message": str(exc)}), 502

    if resp.status_code >= 400:
        return jsonify({"error": "upstream_http_error", "status_code": resp.status_code, "body": resp.text}), 502

    data = resp.json()

    text = ""
    finish_reason = None
    try:
        choice0 = data.get("choices", [{}])[0]
        finish_reason = choice0.get("finish_reason")
        msg = choice0.get("message", {})
        text = msg.get("content", "") or ""
    except Exception:
        pass

    if not text:
        return jsonify(
            {
                "error": "empty_content",
                "message": "GLM-5 returned empty content. Try larger max_tokens or ensure thinking is disabled.",
                "model": model,
                "finish_reason": finish_reason,
                "raw": data,
            }
        ), 502

    return jsonify(
        {
            "response": text,
            "model": model,
            "finish_reason": finish_reason,
            "raw": data,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8002")), debug=False)
