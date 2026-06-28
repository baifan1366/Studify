# Studify BGE-M3 dense embedding server

Required environment:

```text
MODEL_PATH=/app/model
DEVICE=cpu
EMBEDDING_API_TOKEN=<shared server-side secret>
MAX_BATCH_SIZE=32
MAX_LENGTH=1024
```

This endpoint exposes the dense 1024-dimensional BGE-M3 representation. It is
not a cross-encoder reranker.
