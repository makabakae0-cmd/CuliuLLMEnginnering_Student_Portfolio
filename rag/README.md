# RAG Quickstart

This folder contains the local RAG setup for the fungi project.

## Embedding model

- `sentence-transformers/all-MiniLM-L6-v2`

## Vector store

- `ChromaDB`

## Install

```bash
cd rag
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install -r requirements.txt
```

If `chromadb` previously failed while building `pandas`, the upgrade step above is important.

## Download the embedding model once

```bash
python3 download_model.py
```

## Test embedding

```bash
python3 quickstart_minilm.py
```

## Ingest fungi JSON into ChromaDB

```bash
python3 ingest_json_to_chroma.py
```

This will:
- read `zombie_fungi_rag_knowledge_base (2).json`
- embed `rag_chunks` with `sentence-transformers/all-MiniLM-L6-v2`
- write vectors into local `ChromaDB`

If the collection already exists, `upsert` will refresh the same records.
After one successful model download, the scripts use the cached files locally.

## Query local ChromaDB

```bash
python3 query_chroma.py "What is the death grip?"
```

You can also change the retrieval size:

```bash
python3 query_chroma.py "How do ants defend themselves?" --top-k 5
```

## Expected local outputs

- Chroma database directory: `rag/chroma_db`
- Default collection: `zombie_fungi_kb`

This script is the direct working version of:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
sentences = [
    "That is a happy person",
    "That is a happy dog",
    "That is a very happy person",
    "Today is a sunny day",
]
embeddings = model.encode(sentences)
similarities = model.similarity(embeddings, embeddings)
print(similarities.shape)
```

Note:
- The final parenthesis in your pasted snippet should be `)` not `）`.
