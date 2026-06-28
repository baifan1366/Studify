# Studify E5 embedding server

Required environment:

```text
MODEL_PATH=/app/model
DEVICE=cpu
EMBEDDING_API_TOKEN=<shared server-side secret>
MAX_BATCH_SIZE=64
MAX_LENGTH=512
```

The API requires an explicit `task` contract:

- search queries: `query`
- indexed chunks/documents: `passage`

The default is `passage` to make accidental ingestion safer.
