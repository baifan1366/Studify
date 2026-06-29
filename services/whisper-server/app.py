import asyncio
import hmac
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock
from typing import Literal
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
from mega import Mega
from pydantic import BaseModel, Field
from supabase import Client, create_client


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(500 * 1024 * 1024)))
FFMPEG_TIMEOUT_SECONDS = int(os.getenv("FFMPEG_TIMEOUT_SECONDS", "900"))
WHISPER_API_TOKEN = os.getenv("WHISPER_API_TOKEN")
JOB_TTL_SECONDS = int(os.getenv("JOB_TTL_SECONDS", "86400"))
TEMP_DIR = Path(os.getenv("WHISPER_TEMP_DIR", tempfile.gettempdir()))
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
E5_EMBEDDING_URL = os.getenv(
    "E5_HG_EMBEDDING_SERVER_API_URL",
    "https://edusocial-e5-small-embedding-server.hf.space",
)
BGE_EMBEDDING_URL = os.getenv(
    "BGE_HG_EMBEDDING_SERVER_API_URL",
    "https://edusocial-bge-m3-embedding-server.hf.space",
)
EMBEDDING_TIMEOUT_SECONDS = int(os.getenv("EMBEDDING_TIMEOUT_SECONDS", "180"))
EMBEDDING_API_TOKEN = os.getenv("EMBEDDING_API_TOKEN")
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
SEMANTIC_SIMILARITY_THRESHOLD = float(
    os.getenv("SEMANTIC_SIMILARITY_THRESHOLD", "0.70")
)
MIN_CHUNK_CHARS = int(os.getenv("MIN_CHUNK_CHARS", "300"))
MAX_CHUNK_CHARS = int(os.getenv("MAX_CHUNK_CHARS", "900"))
MAX_SEGMENT_GAP_SECONDS = float(os.getenv("MAX_SEGMENT_GAP_SECONDS", "8"))
FASTSTART_ENABLED = os.getenv("FASTSTART_ENABLED", "true").lower() == "true"
MEGA_EMAIL = os.getenv("MEGA_EMAIL")
MEGA_PASSWORD = os.getenv("MEGA_PASSWORD")

model: WhisperModel | None = None
semaphore: asyncio.Semaphore | None = None
jobs: dict[str, dict] = {}
tasks: dict[str, asyncio.Task] = {}
jobs_lock = Lock()
supabase: Client | None = None


class TranscriptSegment(BaseModel):
    text: str
    start: float = Field(ge=0)
    end: float = Field(ge=0)
    confidence: float | None = Field(default=None, ge=0, le=1)
    speaker: str | None = None


class TranscriptResult(BaseModel):
    text: str
    language: str | None
    language_probability: float | None = None
    duration: float
    segments: list[TranscriptSegment]


def _cleanup_stale_jobs() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    with jobs_lock:
        stale = [
            job_id
            for job_id, job in jobs.items()
            if job.get("completed_at", job.get("failed_at", job["created_at"])) < cutoff
            and job.get("status") in {"completed", "failed"}
        ]
        for job_id in stale:
            jobs.pop(job_id, None)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model, semaphore, supabase
    logging.info(
        "Loading Whisper model=%s device=%s compute_type=%s",
        MODEL_SIZE,
        DEVICE,
        COMPUTE_TYPE,
    )
    model = await asyncio.to_thread(
        WhisperModel,
        MODEL_SIZE,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
    )
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("Supabase service credentials are required")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    await asyncio.to_thread(
        lambda: supabase.table("video_processing_queue").select("id").limit(1).execute()
    )
    yield
    for task in list(tasks.values()):
        task.cancel()


app = FastAPI(title="Studify Whisper ASR", version="2.0.0", lifespan=lifespan)


@app.get("/")
async def health():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "active_jobs": sum(
            1 for job in jobs.values() if job.get("status") in {"queued", "processing"}
        ),
    }


async def _save_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "audio.bin").suffix[:12] or ".bin"
    fd, name = tempfile.mkstemp(prefix="studify-asr-", suffix=suffix, dir=TEMP_DIR)
    os.close(fd)
    path = Path(name)
    total = 0
    try:
        with path.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "uploaded media exceeds size limit")
                output.write(chunk)
        return path
    except Exception:
        path.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()


def _download_mega(url: str) -> Path:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"mega.nz", "www.mega.nz"}:
        raise ValueError("only HTTPS mega.nz URLs are supported")

    work_dir = Path(tempfile.mkdtemp(prefix="studify-mega-", dir=TEMP_DIR))
    try:
        downloaded = Path(Mega().login().download_url(url, str(work_dir)))
        if not downloaded.exists():
            raise RuntimeError("MEGA download did not create a file")
        if downloaded.stat().st_size > MAX_UPLOAD_BYTES:
            raise ValueError("downloaded media exceeds size limit")
        return downloaded
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


def _validate_media(path: Path) -> None:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        error = result.stderr.decode("utf-8", errors="replace")[-1000:]
        raise ValueError(f"invalid media: {error}")


def _read_mp4_atom_positions(path: Path) -> dict[str, int]:
    positions: dict[str, int] = {}
    file_size = path.stat().st_size
    with path.open("rb") as source:
        offset = 0
        while offset + 8 <= file_size:
            source.seek(offset)
            header = source.read(16)
            if len(header) < 8:
                break
            atom_size = int.from_bytes(header[0:4], "big")
            atom_type = header[4:8].decode("latin-1")
            header_size = 8
            if atom_size == 1:
                if len(header) < 16:
                    break
                atom_size = int.from_bytes(header[8:16], "big")
                header_size = 16
            elif atom_size == 0:
                atom_size = file_size - offset
            if atom_size < header_size or offset + atom_size > file_size:
                break
            positions.setdefault(atom_type, offset)
            offset += atom_size
    return positions


def _is_faststart_compatible(path: Path) -> bool:
    return path.suffix.lower() in {".mp4", ".m4v", ".mov"}


def _has_faststart(path: Path) -> bool:
    atoms = _read_mp4_atom_positions(path)
    moov = atoms.get("moov")
    mdat = atoms.get("mdat")
    if moov is None or mdat is None:
        raise ValueError("media is missing top-level moov or mdat atom")
    return moov < mdat


def _optimize_faststart(source: Path) -> tuple[Path, dict]:
    if not FASTSTART_ENABLED:
        return source, {"status": "disabled", "was_optimized": False}
    if not _is_faststart_compatible(source):
        return source, {"status": "not_applicable", "was_optimized": False}
    if _has_faststart(source):
        return source, {"status": "already_optimized", "was_optimized": False}

    fd, name = tempfile.mkstemp(
        prefix="studify-faststart-",
        suffix=".mp4",
        dir=TEMP_DIR,
    )
    os.close(fd)
    output = Path(name)
    started = time.monotonic()
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-y",
                "-i",
                str(source),
                "-map",
                "0",
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(output),
            ],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT_SECONDS,
            check=False,
        )
        if result.returncode != 0:
            error = result.stderr.decode("utf-8", errors="replace")[-2000:]
            raise RuntimeError(f"faststart ffmpeg failed: {error}")
        _validate_media(output)
        if not _has_faststart(output):
            raise RuntimeError("ffmpeg output still has moov after mdat")
        return output, {
            "status": "optimized",
            "was_optimized": True,
            "processing_ms": round((time.monotonic() - started) * 1000),
            "original_size": source.stat().st_size,
            "optimized_size": output.stat().st_size,
        }
    except Exception:
        output.unlink(missing_ok=True)
        raise


def _upload_optimized_to_mega(path: Path, attachment_id: int) -> str:
    if not MEGA_EMAIL or not MEGA_PASSWORD:
        raise RuntimeError("MEGA_EMAIL and MEGA_PASSWORD are required for Fast Start upload")
    upload_name = f"studify-video-{attachment_id}-faststart.mp4"
    upload_path = path.with_name(upload_name)
    shutil.copyfile(path, upload_path)
    try:
        account = Mega().login(MEGA_EMAIL, MEGA_PASSWORD)
        uploaded = account.upload(str(upload_path))
        return str(account.get_upload_link(uploaded))
    finally:
        upload_path.unlink(missing_ok=True)


def _persist_faststart_result(
    attachment_id: int,
    queue_id: int | None,
    result: dict,
    optimized_url: str | None = None,
) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not ready")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    attachment_update = {
        "faststart_status": result["status"],
        "faststart_processed_at": now,
        "faststart_error": result.get("error"),
        "updated_at": now,
    }
    if optimized_url:
        attachment_update["url"] = optimized_url
        if result.get("optimized_size"):
            attachment_update["size"] = result["optimized_size"]
    supabase.table("course_attachments").update(attachment_update).eq(
        "id", attachment_id
    ).execute()
    if queue_id is not None:
        queue = supabase.table("video_processing_queue").select(
            "processing_metadata"
        ).eq("id", queue_id).single().execute()
        metadata = (queue.data or {}).get("processing_metadata") or {}
        metadata["faststart"] = result
        supabase.table("video_processing_queue").update(
            {"processing_metadata": metadata}
        ).eq("id", queue_id).execute()


def _convert_to_wav(source: Path) -> Path:
    fd, name = tempfile.mkstemp(prefix="studify-asr-", suffix=".wav", dir=TEMP_DIR)
    os.close(fd)
    output = Path(name)
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-y",
                "-i",
                str(source),
                "-vn",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(output),
            ],
            capture_output=True,
            timeout=FFMPEG_TIMEOUT_SECONDS,
            check=False,
        )
        if result.returncode != 0:
            error = result.stderr.decode("utf-8", errors="replace")[-2000:]
            raise RuntimeError(f"ffmpeg failed: {error}")
        return output
    except Exception:
        output.unlink(missing_ok=True)
        raise


def _segment_confidence(avg_logprob: float | None) -> float | None:
    if avg_logprob is None:
        return None
    # avg_logprob is negative. exp() gives a bounded, interpretable proxy.
    import math

    return max(0.0, min(1.0, math.exp(avg_logprob)))


def _transcribe_sync(
    source: Path,
    task: Literal["transcribe", "translate"],
    beam_size: int,
) -> TranscriptResult:
    if model is None:
        raise RuntimeError("Whisper model is not ready")

    _validate_media(source)
    wav = _convert_to_wav(source)
    try:
        segment_iter, info = model.transcribe(
            str(wav),
            task=task,
            beam_size=beam_size,
            vad_filter=True,
            word_timestamps=True,
        )
        segments: list[TranscriptSegment] = []
        texts: list[str] = []
        for segment in segment_iter:
            text = segment.text.strip()
            if not text:
                continue
            texts.append(text)
            segments.append(
                TranscriptSegment(
                    text=text,
                    start=round(float(segment.start), 3),
                    end=round(float(segment.end), 3),
                    confidence=_segment_confidence(
                        getattr(segment, "avg_logprob", None)
                    ),
                )
            )

        duration = (
            max((segment.end for segment in segments), default=0.0)
            or float(getattr(info, "duration", 0.0) or 0.0)
        )
        return TranscriptResult(
            text=" ".join(texts).strip(),
            language=getattr(info, "language", None),
            language_probability=getattr(info, "language_probability", None),
            duration=round(duration, 3),
            segments=segments,
        )
    finally:
        wav.unlink(missing_ok=True)


async def _embed_batch(
    base_url: str,
    texts: list[str],
    expected_dimension: int,
    task: Literal["query", "passage"] | None = None,
) -> list[list[float]]:
    if not EMBEDDING_API_TOKEN:
        raise RuntimeError("EMBEDDING_API_TOKEN is not configured")
    embeddings: list[list[float]] = []
    headers = {"Authorization": f"Bearer {EMBEDDING_API_TOKEN}"}
    async with httpx.AsyncClient(
        timeout=EMBEDDING_TIMEOUT_SECONDS,
        headers=headers,
    ) as client:
        for offset in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[offset : offset + EMBEDDING_BATCH_SIZE]
            response: httpx.Response | None = None
            for attempt in range(3):
                response = await client.post(
                    f"{base_url.rstrip('/')}/embed/batch",
                    json={
                        "inputs": batch,
                        **({"task": task} if task is not None else {}),
                    },
                )
                if response.status_code < 400:
                    break
                if response.status_code not in {429, 500, 502, 503, 504}:
                    response.raise_for_status()
                if attempt < 2:
                    delay = 2 ** attempt
                    logging.warning(
                        "Embedding batch returned %s; retrying in %ss",
                        response.status_code,
                        delay,
                    )
                    await asyncio.sleep(delay)
            assert response is not None
            response.raise_for_status()
            payload = response.json()
            batch_embeddings = payload.get("embeddings")
            if not isinstance(batch_embeddings, list) or len(batch_embeddings) != len(batch):
                raise RuntimeError(
                    f"embedding batch mismatch at offset {offset}"
                )
            embeddings.extend(batch_embeddings)

    if len(embeddings) != len(texts):
        raise RuntimeError(
            f"embedding count mismatch: expected {len(texts)}, got {len(embeddings)}"
        )
    for index, embedding in enumerate(embeddings):
        if (
            not isinstance(embedding, list)
            or len(embedding) != expected_dimension
            or not all(isinstance(value, (int, float)) for value in embedding)
        ):
            raise RuntimeError(
                f"invalid embedding at index {index}; expected {expected_dimension} dimensions"
            )
    return embeddings


async def _generate_embeddings(
    segments: list[TranscriptSegment],
) -> tuple[list[list[float]], list[list[float]]]:
    texts = [segment.text for segment in segments]
    e5_result, bge_result = await asyncio.gather(
        _embed_batch(E5_EMBEDDING_URL, texts, 384, "passage"),
        _embed_batch(BGE_EMBEDDING_URL, texts, 1024),
        return_exceptions=True,
    )
    if isinstance(e5_result, Exception) and isinstance(bge_result, Exception):
        raise RuntimeError(
            f"both embedding models failed: E5={e5_result}; BGE={bge_result}"
        )

    if isinstance(e5_result, Exception):
        logging.error("E5 embedding failed; storing BGE-only rows: %s", e5_result)
        e5_embeddings: list[list[float]] = []
    else:
        e5_embeddings = e5_result
    if isinstance(bge_result, Exception):
        logging.error("BGE embedding failed; storing E5-only rows: %s", bge_result)
        bge_embeddings: list[list[float]] = []
    else:
        bge_embeddings = bge_result
    return e5_embeddings, bge_embeddings


def _cosine_for_normalized(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def _structural_chunk_segments(
    source: list[TranscriptSegment],
) -> list[TranscriptSegment]:
    chunks: list[TranscriptSegment] = []
    group: list[TranscriptSegment] = []

    def flush() -> None:
        if not group:
            return
        values = [item.confidence for item in group if item.confidence is not None]
        chunks.append(
            TranscriptSegment(
                text=" ".join(item.text.strip() for item in group).strip(),
                start=group[0].start,
                end=group[-1].end,
                confidence=sum(values) / len(values) if values else None,
            )
        )
        group.clear()

    for item in source:
        candidate_length = sum(len(entry.text) + 1 for entry in group) + len(item.text)
        gap = max(0.0, item.start - group[-1].end) if group else 0
        if group and (
            candidate_length > MAX_CHUNK_CHARS
            or gap > MAX_SEGMENT_GAP_SECONDS
        ):
            flush()
        group.append(item)
    flush()
    return chunks


async def _semantic_chunk_segments(
    source: list[TranscriptSegment],
) -> list[TranscriptSegment]:
    if len(source) <= 1:
        return source

    try:
        unit_embeddings = await _embed_batch(
            E5_EMBEDDING_URL,
            [segment.text for segment in source],
            384,
            "passage",
        )
    except Exception:
        logging.exception(
            "Semantic breakpoint embeddings failed; using timestamped structural chunks"
        )
        return _structural_chunk_segments(source)
    chunks: list[TranscriptSegment] = []
    group: list[TranscriptSegment] = [source[0]]

    def flush() -> None:
        if not group:
            return
        confidence_values = [
            item.confidence for item in group if item.confidence is not None
        ]
        chunks.append(
            TranscriptSegment(
                text=" ".join(item.text.strip() for item in group).strip(),
                start=group[0].start,
                end=group[-1].end,
                confidence=(
                    sum(confidence_values) / len(confidence_values)
                    if confidence_values
                    else None
                ),
            )
        )
        group.clear()

    for index in range(1, len(source)):
        current = source[index]
        current_length = sum(len(item.text) + 1 for item in group)
        candidate_length = current_length + len(current.text) + 1
        similarity = _cosine_for_normalized(
            unit_embeddings[index - 1],
            unit_embeddings[index],
        )
        time_gap = max(0.0, current.start - group[-1].end)
        must_break = (
            candidate_length > MAX_CHUNK_CHARS
            or time_gap > MAX_SEGMENT_GAP_SECONDS
        )
        semantic_break = (
            current_length >= MIN_CHUNK_CHARS
            and similarity < SEMANTIC_SIMILARITY_THRESHOLD
        )
        if must_break or semantic_break:
            flush()
        group.append(current)
    flush()
    return chunks


def _count_text_units(text: str) -> int:
    import re

    cjk = len(re.findall(r"[\u3400-\u9fff]", text))
    non_cjk = re.sub(r"[\u3400-\u9fff]", " ", text).split()
    return cjk + len(non_cjk)


def _persist_completed_job(
    queue_id: int,
    attachment_id: int,
    result: TranscriptResult,
    e5_embeddings: list[list[float]],
    bge_embeddings: list[list[float]],
    faststart_result: dict | None = None,
) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not ready")

    rows = []
    for index, segment in enumerate(result.segments):
        e5 = e5_embeddings[index] if index < len(e5_embeddings) else None
        bge = bge_embeddings[index] if index < len(bge_embeddings) else None
        rows.append(
            {
                "attachment_id": attachment_id,
                "content_type": "course",
                "content_text": segment.text,
                "chunk_type": "segment",
                "hierarchy_level": 1,
                "embedding_e5_small": e5,
                "embedding_bge_m3": bge,
                "has_e5_embedding": e5 is not None,
                "has_bge_embedding": bge is not None,
                "segment_start_time": segment.start,
                "segment_end_time": segment.end,
                "segment_index": index,
                "total_segments": len(result.segments),
                "word_count": _count_text_units(segment.text),
                "sentence_count": 1,
                "confidence_score": (
                    segment.confidence
                    if segment.confidence is not None
                    else 1.0
                ),
                "embedding_model": (
                    "dual:BAAI/bge-m3+intfloat/e5-small"
                    if e5 is not None and bge is not None
                    else "intfloat/e5-small"
                    if e5 is not None
                    else "BAAI/bge-m3"
                ),
                "language": result.language or "auto",
                "status": "completed",
                "is_deleted": False,
            }
        )

    if not rows:
        raise RuntimeError("transcription produced no indexable segments")

    # The RPC performs delete + insert in one PostgreSQL transaction. Any
    # validation or insert failure rolls back and leaves the previous index live.
    replaced = supabase.rpc(
        "replace_video_embeddings",
        {"p_attachment_id": attachment_id, "p_rows": rows},
    ).execute()
    if replaced.data != len(rows):
        raise RuntimeError(
            f"atomic index replacement returned {replaced.data}, expected {len(rows)}"
        )

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    supabase.table("video_processing_steps").update(
        {
            "status": "completed",
            "completed_at": now,
            "output_data": {
                "transcription_text": result.text,
                "transcription_segments": [
                    segment.model_dump(exclude_none=True)
                    for segment in result.segments
                ],
                "language": result.language,
                "language_probability": result.language_probability,
                "duration": result.duration,
                "embeddings_saved": len(rows),
            },
        }
    ).eq("queue_id", queue_id).eq("step_name", "transcribe").execute()
    supabase.table("video_processing_steps").update(
        {
            "status": "completed",
            "completed_at": now,
            "output_data": {
                "segments_created": len(rows),
                "embeddings_saved": len(rows),
                "timestamp_source": "faster-whisper",
            },
        }
    ).eq("queue_id", queue_id).eq("step_name", "embed").execute()
    supabase.table("video_processing_queue").update(
        {
            "status": "completed",
            "current_step": "embed",
            "progress_percentage": 100,
            "completed_at": now,
            "error_message": None,
            "step_data": {
                "language": result.language,
                "duration": result.duration,
                "segment_count": len(rows),
                "timestamp_source": "faster-whisper",
                "faststart": faststart_result,
            },
        }
    ).eq("id", queue_id).eq("attachment_id", attachment_id).execute()


def _claim_queue(queue_id: int, attachment_id: int) -> None:
    if supabase is None:
        raise RuntimeError("Supabase client is not ready")
    queue = supabase.table("video_processing_queue").select(
        "id,attachment_id,status"
    ).eq("id", queue_id).eq("attachment_id", attachment_id).single().execute()
    if not queue.data:
        raise ValueError("queue and attachment do not match")
    supabase.table("video_processing_queue").update(
        {
            "status": "processing",
            "current_step": "transcribe",
            "progress_percentage": 60,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "error_message": None,
        }
    ).eq("id", queue_id).execute()
    supabase.table("video_processing_steps").update(
        {
            "status": "processing",
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "error_message": None,
        }
    ).eq("queue_id", queue_id).eq("step_name", "transcribe").execute()


def _persist_failed_job(queue_id: int, attachment_id: int, error: str) -> None:
    if supabase is None:
        return
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    safe_error = error[:2000]
    supabase.table("video_processing_queue").update(
        {
            "status": "failed",
            "error_message": safe_error,
            "last_error_at": now,
        }
    ).eq("id", queue_id).eq("attachment_id", attachment_id).execute()
    supabase.table("video_processing_steps").update(
        {
            "status": "failed",
            "error_message": safe_error,
            "completed_at": now,
        }
    ).eq("queue_id", queue_id).in_(
        "step_name", ["transcribe", "embed"]
    ).execute()


def _cleanup_source(path: Path) -> None:
    try:
        parent = path.parent
        path.unlink(missing_ok=True)
        if parent.name.startswith("studify-mega-"):
            shutil.rmtree(parent, ignore_errors=True)
    except Exception:
        logging.exception("Temporary file cleanup failed for %s", path)


async def _run_job(
    job_id: str,
    source: Path | None,
    source_url: str | None,
    task: Literal["transcribe", "translate"],
    beam_size: int,
    queue_id: int | None,
    attachment_id: int | None,
) -> None:
    original_source: Path | None = source
    optimized_source: Path | None = None
    faststart_result: dict | None = None
    try:
        if source is None:
            if not source_url:
                raise RuntimeError("job has no media source")
            source = await asyncio.to_thread(_download_mega, source_url)
            original_source = source
        if attachment_id is not None:
            try:
                optimized_source, faststart_result = await asyncio.to_thread(
                    _optimize_faststart,
                    source,
                )
                if faststart_result.get("was_optimized"):
                    optimized_url = await asyncio.to_thread(
                        _upload_optimized_to_mega,
                        optimized_source,
                        attachment_id,
                    )
                    await asyncio.to_thread(
                        _persist_faststart_result,
                        attachment_id,
                        queue_id,
                        faststart_result,
                        optimized_url,
                    )
                    source = optimized_source
                else:
                    await asyncio.to_thread(
                        _persist_faststart_result,
                        attachment_id,
                        queue_id,
                        faststart_result,
                    )
            except Exception as faststart_error:
                logging.exception(
                    "Fast Start processing failed for attachment %s; continuing ASR",
                    attachment_id,
                )
                faststart_result = {
                    "status": "failed",
                    "was_optimized": False,
                    "error": str(faststart_error)[:1000],
                }
                await asyncio.to_thread(
                    _persist_faststart_result,
                    attachment_id,
                    queue_id,
                    faststart_result,
                )
        assert semaphore is not None
        async with semaphore:
            with jobs_lock:
                jobs[job_id]["status"] = "processing"
            result = await asyncio.to_thread(
                _transcribe_sync,
                source,
                task,
                beam_size,
            )

        if queue_id is not None and attachment_id is not None:
            result.segments = await _semantic_chunk_segments(result.segments)
            e5_embeddings, bge_embeddings = await _generate_embeddings(result.segments)
            await asyncio.to_thread(
                _persist_completed_job,
                queue_id,
                attachment_id,
                result,
                e5_embeddings,
                bge_embeddings,
                faststart_result,
            )

        with jobs_lock:
            jobs[job_id].update(
                status="completed",
                result=result.model_dump(),
                completed_at=time.time(),
            )

    except Exception as error:
        logging.exception("ASR job %s failed", job_id)
        with jobs_lock:
            jobs[job_id].update(
                status="failed",
                error=str(error),
                failed_at=time.time(),
            )
        if queue_id is not None and attachment_id is not None:
            try:
                await asyncio.to_thread(
                    _persist_failed_job,
                    queue_id,
                    attachment_id,
                    str(error),
                )
            except Exception:
                logging.exception("Failed to persist failure state for job %s", job_id)
    finally:
        if source is not None:
            _cleanup_source(source)
        if original_source is not None and original_source != source:
            _cleanup_source(original_source)
        if (
            optimized_source is not None
            and optimized_source != source
            and optimized_source != original_source
        ):
            _cleanup_source(optimized_source)
        tasks.pop(job_id, None)
        _cleanup_stale_jobs()


@app.post("/transcribe", status_code=202)
async def transcribe(
    file: UploadFile | None = File(default=None),
    url: str | None = Query(default=None),
    task: Literal["transcribe", "translate"] = Query(default="transcribe"),
    beam_size: int = Query(default=5, ge=1, le=10),
    queue_id: int | None = Query(default=None, ge=1),
    attachment_id: int | None = Query(default=None, ge=1),
    authorization: str | None = Header(default=None),
):
    if not WHISPER_API_TOKEN:
        raise HTTPException(503, "WHISPER_API_TOKEN is not configured")
    supplied_token = (
        authorization[7:]
        if authorization and authorization.startswith("Bearer ")
        else ""
    )
    if not hmac.compare_digest(supplied_token, WHISPER_API_TOKEN):
        raise HTTPException(401, "unauthorized")

    if bool(file) == bool(url):
        raise HTTPException(400, "provide exactly one of file or url")
    if (queue_id is None) != (attachment_id is None):
        raise HTTPException(400, "queue_id and attachment_id must be provided together")
    if queue_id is not None and attachment_id is not None:
        try:
            await asyncio.to_thread(_claim_queue, queue_id, attachment_id)
        except Exception as error:
            raise HTTPException(409, f"cannot claim processing queue: {error}") from error

    source: Path | None = None
    if not url:
        assert file is not None
        source = await _save_upload(file)

    job_id = str(uuid.uuid4())
    with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "created_at": time.time(),
            "queue_id": queue_id,
            "attachment_id": attachment_id,
        }

    background = asyncio.create_task(
        _run_job(
            job_id,
            source,
            url,
            task,
            beam_size,
            queue_id,
            attachment_id,
        )
    )
    tasks[job_id] = background
    return JSONResponse(
        status_code=202,
        content={
            "job_id": job_id,
            "status": "accepted",
            "status_url": f"/status/{job_id}",
        },
    )


@app.get("/status/{job_id}")
async def status(
    job_id: str,
    authorization: str | None = Header(default=None),
):
    supplied_token = (
        authorization[7:]
        if authorization and authorization.startswith("Bearer ")
        else ""
    )
    if not WHISPER_API_TOKEN or not hmac.compare_digest(
        supplied_token, WHISPER_API_TOKEN
    ):
        raise HTTPException(401, "unauthorized")
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(404, "job not found")
        return dict(job)


@app.delete("/jobs/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    authorization: str | None = Header(default=None),
):
    if not WHISPER_API_TOKEN or authorization != f"Bearer {WHISPER_API_TOKEN}":
        raise HTTPException(401, "unauthorized")
    task = tasks.get(job_id)
    if task and not task.done():
        task.cancel()
    with jobs_lock:
        jobs.pop(job_id, None)
    return None
