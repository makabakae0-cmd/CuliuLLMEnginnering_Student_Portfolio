from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def main() -> None:
    print(f"Downloading or loading cached embedding model: {MODEL_NAME}")
    SentenceTransformer(MODEL_NAME)
    print("Model ready.")


if __name__ == "__main__":
    main()
