import asyncio
import hmac
import os
from contextlib import asynccontextmanager

import torch
import torch.nn.functional as F
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from transformers import AutoModel, AutoTokenizer


MODEL_PATH = os.getenv("MODEL_PATH", "/app/model")
DEVICE = os.getenv("DEVICE", "cpu")
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "32"))
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "1024"))
EXPECTED_DIMENSION = 1024
API_TOKEN = os.getenv("EMBEDDING_API_TOKEN")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

st_model: SentenceTransformer | None = None
hf_model = None
hf_tokenizer = None
encode_lock: asyncio.Lock | None = None


def _load_model() -> None:
    global st_model, hf_model, hf_tokenizer
    try:
        st_model = SentenceTransformer(MODEL_PATH, device=DEVICE)
        st_model.max_seq_length = MAX_LENGTH
    except Exception:
        hf_tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        hf_model = AutoModel.from_pretrained(MODEL_PATH).to(DEVICE)
        hf_model.eval()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global encode_lock
    await asyncio.to_thread(_load_model)
    if st_model is None and hf_model is None:
        raise RuntimeError("BGE-M3 model failed to load")
    encode_lock = asyncio.Lock()
    yield


app = FastAPI(
    title="Studify BGE-M3 Dense Embeddings",
    version="2.0.0",
    lifespan=lifespan,
)
if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )


class EmbeddingRequest(BaseModel):
    input: str = Field(min_length=1)


class BatchRequest(BaseModel):
    inputs: list[str] = Field(min_length=1)


def _authorize(authorization: str | None) -> None:
    if not API_TOKEN:
        raise HTTPException(503, "EMBEDDING_API_TOKEN is not configured")
    supplied = (
        authorization[7:]
        if authorization and authorization.startswith("Bearer ")
        else ""
    )
    if not hmac.compare_digest(supplied, API_TOKEN):
        raise HTTPException(401, "unauthorized")


def _encode(texts: list[str]) -> list[list[float]]:
    if st_model is not None:
        return st_model.encode(
            texts,
            batch_size=min(16, len(texts)),
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).tolist()

    if hf_model is None or hf_tokenizer is None:
        raise RuntimeError("model is not loaded")
    inputs = hf_tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt",
    ).to(DEVICE)
    with torch.inference_mode():
        outputs = hf_model(**inputs)
        # BGE-M3 dense representation uses the first-token/CLS embedding.
        pooled = outputs.last_hidden_state[:, 0]
        normalized = F.normalize(pooled, p=2, dim=1)
    return normalized.cpu().tolist()


async def _encode_safely(texts: list[str]) -> list[list[float]]:
    if len(texts) > MAX_BATCH_SIZE:
        raise HTTPException(413, f"batch exceeds MAX_BATCH_SIZE={MAX_BATCH_SIZE}")
    if any(not text.strip() for text in texts):
        raise HTTPException(422, "inputs cannot contain empty strings")
    assert encode_lock is not None
    async with encode_lock:
        try:
            vectors = await asyncio.to_thread(_encode, texts)
            if any(len(vector) != EXPECTED_DIMENSION for vector in vectors):
                raise RuntimeError(
                    f"model dimension mismatch; expected {EXPECTED_DIMENSION}"
                )
            return vectors
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(500, f"embedding failed: {error}") from error


@app.get("/")
@app.get("/healthz")
async def health():
    if st_model is None and hf_model is None:
        raise HTTPException(503, "model not loaded")
    return {
        "status": "ok",
        "device": DEVICE,
        "model_path": MODEL_PATH,
        "dimension": EXPECTED_DIMENSION,
        "mode": "dense",
    }


@app.post("/embed")
async def embed(
    request: EmbeddingRequest,
    authorization: str | None = Header(default=None),
):
    _authorize(authorization)
    vectors = await _encode_safely([request.input.strip()])
    return {"embedding": vectors[0], "dim": len(vectors[0])}


@app.post("/embed/batch")
async def embed_batch(
    request: BatchRequest,
    authorization: str | None = Header(default=None),
):
    _authorize(authorization)
    vectors = await _encode_safely([text.strip() for text in request.inputs])
    return {
        "embeddings": vectors,
        "count": len(vectors),
        "dim": len(vectors[0]),
    }
