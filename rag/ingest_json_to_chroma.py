import argparse
import json
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer


DEFAULT_JSON_PATH = (
    "/Users/zhongmeier/Documents/GitHub/"
    "CuliuLLMEnginnering_Student_Portfolio/"
    "zombie_fungi_rag_knowledge_base (2).json"
)
DEFAULT_DB_DIR = (
    "/Users/zhongmeier/Documents/GitHub/"
    "CuliuLLMEnginnering_Student_Portfolio/rag/chroma_db"
)
DEFAULT_COLLECTION = "zombie_fungi_kb"
DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def load_json(json_path: Path) -> dict:
    with json_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_source_lookup(payload: dict) -> dict:
    lookup = {}
    for source in payload.get("sources", []):
        source_id = source.get("source_id")
        if source_id:
            lookup[source_id] = source
    return lookup


def build_records(payload: dict) -> list[dict]:
    source_lookup = build_source_lookup(payload)
    records = []

    for chunk in payload.get("rag_chunks", []):
        chunk_id = chunk.get("chunk_id")
        text = chunk.get("text")
        if not chunk_id or not text:
            continue

        source_ids = chunk.get("source_ids", [])
        source_titles = []
        for source_id in source_ids:
            source = source_lookup.get(source_id, {})
            source_titles.append(source.get("title", source_id))

        metadata = {
            "title": chunk.get("title", ""),
            "topic": payload.get("topic", ""),
            "language": payload.get("language", ""),
            "version": payload.get("version", ""),
            "tags": ", ".join(chunk.get("tags", [])),
            "source_ids": ", ".join(source_ids),
            "source_titles": " | ".join(source_titles),
        }

        records.append(
            {
                "id": chunk_id,
                "document": text,
                "metadata": metadata,
            }
        )

    return records


def ingest(
    json_path: Path,
    db_dir: Path,
    collection_name: str,
    model_name: str,
) -> None:
    payload = load_json(json_path)
    records = build_records(payload)
    if not records:
        raise ValueError("No rag_chunks found in the JSON file.")

    db_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading embedding model: {model_name}")
    try:
        model = SentenceTransformer(model_name, local_files_only=True)
    except Exception as exc:
        raise RuntimeError(
            "Failed to load the embedding model. "
            "Run `python3 download_model.py` in the `rag` folder first "
            "to cache all-MiniLM-L6-v2 locally."
        ) from exc

    documents = [record["document"] for record in records]
    ids = [record["id"] for record in records]
    metadatas = [record["metadata"] for record in records]

    print(f"Encoding {len(documents)} chunks...")
    embeddings = model.encode(documents, show_progress_bar=True).tolist()

    print(f"Opening ChromaDB at: {db_dir}")
    client = chromadb.PersistentClient(path=str(db_dir))
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"description": "Zombie fungi RAG knowledge base"},
    )

    print(f"Upserting into collection: {collection_name}")
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    print("Done.")
    print(f"Collection name: {collection_name}")
    print(f"Chunk count: {collection.count()}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest fungi RAG JSON into ChromaDB.")
    parser.add_argument("--json-path", default=DEFAULT_JSON_PATH, help="Path to input JSON file")
    parser.add_argument("--db-dir", default=DEFAULT_DB_DIR, help="Directory for Chroma persistent DB")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="Chroma collection name")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="SentenceTransformer model name")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ingest(
        json_path=Path(args.json_path),
        db_dir=Path(args.db_dir),
        collection_name=args.collection,
        model_name=args.model,
    )


if __name__ == "__main__":
    main()
