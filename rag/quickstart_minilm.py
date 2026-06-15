from sentence_transformers import SentenceTransformer


def main() -> None:
    model_name = "sentence-transformers/all-MiniLM-L6-v2"

    try:
        model = SentenceTransformer(model_name, local_files_only=True)
    except Exception as exc:
        raise RuntimeError(
            "Failed to load the embedding model. "
            "Run `python3 download_model.py` in the `rag` folder first "
            "to cache all-MiniLM-L6-v2 locally."
        ) from exc

    sentences = [
        "That is a happy person",
        "That is a happy dog",
        "That is a very happy person",
        "Today is a sunny day",
    ]

    embeddings = model.encode(sentences)
    similarities = model.similarity(embeddings, embeddings)

    print("embeddings shape:", getattr(embeddings, "shape", None))
    print("similarities shape:", similarities.shape)
    print(similarities)


if __name__ == "__main__":
    main()
