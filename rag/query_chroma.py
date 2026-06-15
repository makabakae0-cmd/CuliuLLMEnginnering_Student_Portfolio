import argparse
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer


DEFAULT_DB_DIR = (
    "/Users/zhongmeier/Documents/GitHub/"
    "CuliuLLMEnginnering_Student_Portfolio/rag/chroma_db"
)
DEFAULT_COLLECTION = "zombie_fungi_kb"
DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def query_collection(
    question: str,
    db_dir: Path,
    collection_name: str,
    model_name: str,
    top_k: int,
) -> None:
    print(f"Loading embedding model: {model_name}")
    try:
        model = SentenceTransformer(model_name, local_files_only=True)
    except Exception as exc:
        raise RuntimeError(
            "Failed to load the embedding model. "
            "Run `python3 download_model.py` in the `rag` folder first "
            "to cache all-MiniLM-L6-v2 locally."
        ) from exc
    query_embedding = model.encode([question]).tolist()[0]

    print(f"Opening ChromaDB at: {db_dir}")
    client = chromadb.PersistentClient(path=str(db_dir))
    try:
        collection = client.get_collection(collection_name)
    except Exception as exc:
        raise RuntimeError(
            f"Collection `{collection_name}` was not found in `{db_dir}`. "
            "Run `python3 ingest_json_to_chroma.py` first."
        ) from exc

    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    print(f"\nQuestion: {question}\n")
    for index, chunk_id in enumerate(ids, start=1):
        metadata = metadatas[index - 1] or {}
        document = documents[index - 1]
        distance = distances[index - 1]
        print(f"[{index}] id={chunk_id}")
        print(f"title={metadata.get('title', '')}")
        print(f"tags={metadata.get('tags', '')}")
        print(f"source_ids={metadata.get('source_ids', '')}")
        print(f"distance={distance}")
        print(document)
        print("-" * 80)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query local fungi ChromaDB.")
    parser.add_argument("question", help="Question for semantic retrieval")
    parser.add_argument("--db-dir", default=DEFAULT_DB_DIR, help="Directory for Chroma persistent DB")
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="Chroma collection name")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="SentenceTransformer model name")
    parser.add_argument("--top-k", type=int, default=3, help="Number of chunks to retrieve")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    query_collection(
        question=args.question,
        db_dir=Path(args.db_dir),
        collection_name=args.collection,
        model_name=args.model,
        top_k=args.top_k,
    )


if __name__ == "__main__":
    main()
