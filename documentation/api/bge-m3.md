

🔹 1. Health Check
GET https://edusocial-bge-m3-embedding-server.hf.space

Check if the server is alive.

Response

{
  "status": "running",
  "msg": "embedding server is alive"
}

🔹 2. Healthz (Model Status)
GET https://edusocial-bge-m3-embedding-server.hf.space/healthz

Check if the model is successfully loaded.

Response (ok)

{
  "status": "ok",
  "device": "cpu",
  "model": "SentenceTransformer"
}


Response (error)

{
  "status": "error",
  "msg": "model not loaded"
}

🔹 3. Single Text Embedding
POST https://edusocial-bge-m3-embedding-server.hf.space/embed

Generate an embedding vector for a single input text.

Request Body

{
  "input": "This is a test sentence."
}


Response

{
  "embedding": [0.123, -0.456, 0.789, ...],
  "dim": 1024
}

🔹 4. Batch Text Embedding
POST https://edusocial-bge-m3-embedding-server.hf.space/embed/batch

Generate embeddings for multiple texts at once.

Request Body

{
  "inputs": [
    "First text input.",
    "Second text input."
  ]
}


Response

{
  "embeddings": [
    [0.123, -0.456, 0.789, ...],
    [0.321, -0.654, 0.987, ...]
  ],
  "count": 2,
  "dim": 1024
}