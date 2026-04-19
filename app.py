import os
import tempfile
import subprocess
import logging
import uuid
import asyncio
import time
import re
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from threading import Lock
from dataclasses import dataclass
from fastapi import FastAPI, UploadFile, File, Query
from faster_whisper import WhisperModel
from mega import Mega

try:
    import httpx
except ImportError:
    httpx = None

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

# =========================
# CONFIG
# =========================
logging.basicConfig(level=logging.DEBUG,
                    format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(title="🎧 Whisper Stable API")

# Whisper Configuration
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

# Supabase Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SITE_URL = os.getenv("NEXT_PUBLIC_SITE_URL")

# Embedding Server Configuration
BGE_HG_EMBEDDING_SERVER_API_URL = os.getenv("BGE_HG_EMBEDDING_SERVER_API_URL", "https://edusocial-bge-m3-embedding-server.hf.space")
E5_HG_EMBEDDING_SERVER_API_URL = os.getenv("E5_HG_EMBEDDING_SERVER_API_URL", "https://edusocial-e5-small-embedding-server.hf.space")

# Segmentation Configuration
WORDS_PER_MINUTE = int(os.getenv("TRANSCRIPT_WORDS_PER_MINUTE", "150"))
EMBEDDING_API_TIMEOUT = int(os.getenv("EMBEDDING_API_TIMEOUT", "10"))
MAX_RETRIES = int(os.getenv("MAX_DATABASE_RETRIES", "3"))
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "10"))
EMBEDDING_REQUEST_TIMEOUT = int(os.getenv("EMBEDDING_REQUEST_TIMEOUT", "30"))

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

jobs: Dict[str, dict] = {}
tasks: Dict[str, asyncio.Task] = {}
jobs_lock = Lock()

semaphore = asyncio.Semaphore(2)

# Supabase client (initialized on startup)
supabase_client: Optional[Client] = None


# =========================
# DATA MODELS
# =========================
@dataclass
class VideoSegment:
    text: str
    start_time: float
    end_time: float
    position: int


# =========================
# SUPABASE CLIENT
# =========================
def init_supabase_client():
    """Initialize Supabase client on startup"""
    global supabase_client
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logging.warning("Supabase credentials not configured - database features disabled")
        return
    
    if not create_client:
        logging.warning("supabase-py not installed - database features disabled")
        return
    
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        # Test connection
        supabase_client.table("course_lesson").select("id").limit(1).execute()
        logging.info("✅ Supabase connection validated")
    except Exception as e:
        logging.warning(f"⚠️ Supabase connection validation failed: {e}")
        logging.warning("Continuing without database features")


@app.on_event("startup")
async def startup_event():
    """Log configuration and validate connections on startup"""
    logging.info("=" * 60)
    logging.info("🎧 Whisper Server Starting")
    logging.info("=" * 60)
    logging.info(f"Whisper Model: {MODEL_SIZE}")
    logging.info(f"Device: {DEVICE}")
    logging.info(f"Compute Type: {COMPUTE_TYPE}")
    logging.info(f"Words per minute: {WORDS_PER_MINUTE}")
    logging.info(f"Max retries: {MAX_RETRIES}")
    logging.info(f"Embedding API timeout: {EMBEDDING_API_TIMEOUT}s")
    logging.info(f"Embedding batch size: {EMBEDDING_BATCH_SIZE}")
    logging.info(f"Embedding request timeout: {EMBEDDING_REQUEST_TIMEOUT}s")
    
    if SUPABASE_URL:
        logging.info(f"Supabase URL: {SUPABASE_URL[:30]}...")
    else:
        logging.info("Supabase URL: Not configured")
    
    if SITE_URL:
        logging.info(f"Site URL: {SITE_URL}")
    else:
        logging.info("Site URL: Not configured")
    
    logging.info(f"BGE Embedding Server: {BGE_HG_EMBEDDING_SERVER_API_URL}")
    logging.info(f"E5 Embedding Server: {E5_HG_EMBEDDING_SERVER_API_URL}")
    
    logging.info("=" * 60)
    
    # Initialize Supabase
    init_supabase_client()


# =========================
# TEXT SEGMENTATION
# =========================
def segment_transcript(transcript: str, duration: float) -> List[VideoSegment]:
    """Split transcript into time-based segments"""
    if not transcript or not transcript.strip():
        return []
    
    # Split by sentence boundaries
    sentences = re.split(r'([.!?]+)', transcript)
    
    # Recombine sentences with their punctuation
    combined = []
    for i in range(0, len(sentences) - 1, 2):
        text = sentences[i]
        if i + 1 < len(sentences):
            text += sentences[i + 1]
        combined.append(text.strip())
    
    # Add last sentence if no punctuation at end
    if len(sentences) % 2 == 1 and sentences[-1].strip():
        combined.append(sentences[-1].strip())
    
    # Filter out short fragments
    filtered = [s for s in combined if len(s) >= 20]
    
    if not filtered:
        return []
    
    # Calculate timing for each segment
    segments = []
    current_time = 0.0
    
    for i, text in enumerate(filtered):
        word_count = len(text.split())
        segment_duration = (word_count / WORDS_PER_MINUTE) * 60.0
        
        start_time = current_time
        end_time = current_time + segment_duration
        
        segments.append(VideoSegment(
            text=text,
            start_time=round(start_time, 2),
            end_time=round(end_time, 2),
            position=i
        ))
        
        current_time = end_time
    
    return segments


def generate_content_hash(text: str) -> str:
    """Generate SHA-256 hash for content deduplication"""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


# =========================
# DATABASE OPERATIONS
# =========================2=--==-=
async def retry_with_backoff(operation, *args, max_retries=MAX_RETRIES, **kwargs):
    """Execute operation with exponential backoff retry"""
    backoff_delays = [1.0, 2.0, 4.0]
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return await asyncio.to_thread(operation, *args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                delay = backoff_delays[min(attempt, len(backoff_delays) - 1)]
                logging.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}")
                await asyncio.sleep(delay)
            else:
                logging.error(f"Max retries ({max_retries}) exceeded")
    
    raise last_exception


async def update_lesson_transcript(lesson_id: str, transcript: str, language: str, duration: float) -> bool:
    """Update course_lesson record with transcription"""
    if not supabase_client:
        logging.warning("Supabase client not initialized")
        return False
    
    def _update():
        # Try to find lesson by public_id first, then by id
        try:
            # Try as UUID (public_id)
            result = supabase_client.table("course_lesson").update({
                "transcript": transcript
            }).eq("public_id", lesson_id).eq("is_deleted", False).execute()
            
            if result.data:
                return True
        except:
            pass
        
        # Try as integer ID
        try:
            result = supabase_client.table("course_lesson").update({
                "transcript": transcript
            }).eq("id", int(lesson_id)).eq("is_deleted", False).execute()
            
            if result.data:
                return True
        except:
            pass
        
        raise ValueError(f"Lesson not found: {lesson_id}")
    
    return await retry_with_backoff(_update)


async def get_lesson_internal_id(lesson_id: str) -> int:
    """Get internal ID from public_id or return as int"""
    if not supabase_client:
        raise ValueError("Supabase client not initialized")
    
    def _get_id():
        # Try as UUID (public_id)
        try:
            result = supabase_client.table("course_lesson").select("id").eq(
                "public_id", lesson_id
            ).eq("is_deleted", False).single().execute()
            
            if result.data:
                return result.data["id"]
        except:
            pass
        
        # Try as integer ID
        try:
            return int(lesson_id)
        except:
            pass
        
        raise ValueError(f"Lesson not found: {lesson_id}")
    
    return await asyncio.to_thread(_get_id)


async def insert_video_segments(lesson_internal_id: int, segments: List[VideoSegment]) -> List[int]:
    """Insert video segment records"""
    if not supabase_client:
        logging.warning("Supabase client not initialized")
        return []
    
    def _insert():
        records = []
        for seg in segments:
            records.append({
                "lesson_id": lesson_internal_id,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": seg.text,
                "metadata": {"position": seg.position}
            })
        
        result = supabase_client.table("video_segments").insert(records).execute()
        return [row["id"] for row in result.data]
    
    return await retry_with_backoff(_insert)


async def trigger_embedding_api():
    """Trigger embedding API to process queue (legacy fallback)"""
    if not httpx or not SITE_URL:
        logging.warning("Cannot trigger embedding API - httpx or SITE_URL not configured")
        return
    
    try:
        url = f"{SITE_URL}/api/embeddings/queue-monitor"
        async with httpx.AsyncClient(timeout=EMBEDDING_API_TIMEOUT) as client:
            await client.post(url, json={"trigger": "whisper"})
        logging.info("✅ Embedding API triggered")
    except Exception as e:
        logging.warning(f"⚠️ Embedding API trigger failed (non-critical): {e}")


async def save_to_database(job_id: str, lesson_id: str, transcript: str, language: str, duration: float):
    """Save transcription results to database"""
    try:
        logging.info(f"[job {job_id}] 📊 Starting database save")
        logging.debug(f"[job {job_id}] Lesson ID: {lesson_id}")
        logging.debug(f"[job {job_id}] Transcript length: {len(transcript)} chars")
        logging.debug(f"[job {job_id}] Language: {language}, Duration: {duration:.2f}s")
        
        with jobs_lock:
            jobs[job_id]["status"] = "saving_to_db"
            jobs[job_id]["progress"] = "updating_lesson"
        
        logging.info(f"[job {job_id}] Saving to database for lesson {lesson_id}")
        
        # Step 1: Update lesson transcript
        logging.debug(f"[job {job_id}] Step 1: Updating lesson transcript...")
        await update_lesson_transcript(lesson_id, transcript, language, duration)
        logging.info(f"[job {job_id}] ✅ Lesson transcript updated")
        
        # Step 2: Get internal lesson ID
        logging.debug(f"[job {job_id}] Step 2: Getting internal lesson ID...")
        lesson_internal_id = await get_lesson_internal_id(lesson_id)
        logging.debug(f"[job {job_id}] Internal lesson ID: {lesson_internal_id}")
        
        # Step 3: Create video segments
        with jobs_lock:
            jobs[job_id]["progress"] = "creating_segments"
        
        logging.debug(f"[job {job_id}] Step 3: Creating video segments...")
        segments = segment_transcript(transcript, duration)
        logging.info(f"[job {job_id}] Created {len(segments)} segments")
        
        if not segments:
            logging.warning(f"[job {job_id}] No segments created (transcript too short)")
            with jobs_lock:
                jobs[job_id]["segments_created"] = 0
            return
        
        logging.debug(f"[job {job_id}] Step 4: Inserting segments into database...")
        segment_ids = await insert_video_segments(lesson_internal_id, segments)
        logging.info(f"[job {job_id}] ✅ Inserted {len(segment_ids)} video segments")
        logging.debug(f"[job {job_id}] Segment IDs: {segment_ids}")
        
        with jobs_lock:
            jobs[job_id]["segments_created"] = len(segment_ids)
            jobs[job_id]["segment_ids"] = segment_ids
            jobs[job_id]["database_saved"] = True
            
            # Also store segment texts for easy access
            jobs[job_id]["segments"] = [
                {
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "position": seg.position
                }
                for seg in segments
            ]
        
        logging.info(f"[job {job_id}] ✅ Database operations completed")
        
    except Exception as e:
        logging.exception(f"[job {job_id}] ❌ Database operation failed")
        logging.error(f"[job {job_id}] Exception type: {type(e).__name__}")
        logging.error(f"[job {job_id}] Exception message: {str(e)}")
        with jobs_lock:
            jobs[job_id]["database_error"] = str(e)
        raise


# =========================
# UTIL
# =========================
def is_valid_media(path: str) -> tuple[bool, str]:
    """Validate media file with ffprobe. Returns (is_valid, error_message)"""
    logging.debug(f"[is_valid_media] Validating file: {path}")
    logging.debug(f"[is_valid_media] File exists: {os.path.exists(path)}")
    
    if not os.path.exists(path):
        logging.error(f"[is_valid_media] File does not exist: {path}")
        return False, f"File not found: {path}"
    
    try:
        logging.debug(f"[is_valid_media] Running ffprobe on: {path}")
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_format", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10  # Add timeout to prevent hanging
        )
        
        logging.debug(f"[is_valid_media] ffprobe return code: {result.returncode}")
        
        if result.returncode == 0:
            logging.debug(f"[is_valid_media] ✅ File is valid: {path}")
            return True, ""
        else:
            error_msg = result.stderr.decode('utf-8', errors='ignore').strip()
            logging.error(f"[is_valid_media] ❌ ffprobe failed: {error_msg}")
            return False, f"ffprobe failed: {error_msg or 'unknown error'}"
    except subprocess.TimeoutExpired:
        logging.error(f"[is_valid_media] ❌ ffprobe timeout for: {path}")
        return False, "ffprobe timeout (file may be corrupted)"
    except Exception as e:
        logging.error(f"[is_valid_media] ❌ Exception: {str(e)}")
        return False, f"ffprobe error: {str(e)}"


def convert_to_wav(input_path: str) -> str:
    logging.debug(f"[convert_to_wav] Converting file: {input_path}")
    
    # Ensure input_path is a string (in case it's a PosixPath)
    input_path = str(input_path)
    
    logging.debug(f"[convert_to_wav] Input file exists: {os.path.exists(input_path)}")
    
    output_path = f"{input_path}.wav"
    logging.debug(f"[convert_to_wav] Output path: {output_path}")

    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        output_path
    ]
    
    logging.debug(f"[convert_to_wav] Running command: {' '.join(cmd)}")

    # ⚠️ RISK: no timeout → ffmpeg can freeze worker
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    logging.debug(f"[convert_to_wav] ffmpeg return code: {result.returncode}")

    if result.returncode != 0:
        error_msg = result.stderr.decode('utf-8', errors='ignore').strip()
        logging.error(f"[convert_to_wav] ❌ ffmpeg failed: {error_msg}")
        raise RuntimeError(f"ffmpeg failed: {error_msg}")
    
    logging.debug(f"[convert_to_wav] Output file exists: {os.path.exists(output_path)}")
    logging.debug(f"[convert_to_wav] ✅ Conversion successful")

    return output_path


def cleanup(*paths):
    for p in paths:
        try:
            if p and os.path.exists(p):
                os.remove(p)
        except Exception:
            pass


def download_mega_sync(url: str) -> str:
    logging.debug(f"[download_mega_sync] Starting download from: {url}")
    
    # ⚠️ RISK: blocking network call inside thread is OK, BUT no validation
    try:
        mega = Mega()
        logging.debug(f"[download_mega_sync] Mega instance created")
        
        m = mega.login()
        logging.debug(f"[download_mega_sync] Logged in anonymously")
        
        path = m.download_url(url, "/tmp")
        # Convert PosixPath to string if needed
        path = str(path)
        logging.debug(f"[download_mega_sync] Downloaded to: {path}")
        logging.debug(f"[download_mega_sync] File exists: {os.path.exists(path)}")

        if not os.path.exists(path):
            logging.error(f"[download_mega_sync] ❌ Download failed - file not found: {path}")
            raise ValueError("download failed")
        
        file_size = os.path.getsize(path)
        logging.debug(f"[download_mega_sync] ✅ Download successful - size: {file_size} bytes")
        
        return path
    except Exception as e:
        logging.error(f"[download_mega_sync] ❌ Exception during download: {str(e)}")
        raise


# =========================
# CALLBACK
# =========================
async def send_callback(url, payload):
    if not httpx:
        return
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            await client.post(url, json=payload)
    except Exception as e:
        logging.error(f"[callback] {e}")


# =========================
# CORE JOB
# =========================
def process_job_sync(job_id, input_path, task, beam_size, callback_url, lesson_id):
    temp_files = [input_path]

    try:
        logging.info(f"[job {job_id}] START")
        logging.debug(f"[job {job_id}] Input path: {input_path}")
        logging.debug(f"[job {job_id}] Task: {task}, Beam size: {beam_size}")
        logging.debug(f"[job {job_id}] Lesson ID: {lesson_id}")
        logging.debug(f"[job {job_id}] Callback URL: {callback_url}")

        with jobs_lock:
            jobs[job_id]["status"] = "processing"

        logging.debug(f"[job {job_id}] Validating media file...")
        is_valid, error_msg = is_valid_media(input_path)
        if not is_valid:
            logging.error(f"[job {job_id}] ❌ Media validation failed: {error_msg}")
            raise ValueError(f"Invalid media file: {error_msg}")
        
        logging.debug(f"[job {job_id}] ✅ Media file validated")

        logging.debug(f"[job {job_id}] Converting to WAV...")
        wav_path = convert_to_wav(input_path)
        temp_files.append(wav_path)
        logging.debug(f"[job {job_id}] ✅ WAV conversion complete: {wav_path}")

        with jobs_lock:
            jobs[job_id]["progress"] = "transcribing"

        logging.info(f"[job {job_id}] WHISPER START")
        logging.debug(f"[job {job_id}] Whisper model: {MODEL_SIZE}, Device: {DEVICE}, Compute: {COMPUTE_TYPE}")

        start = time.time()

        segments, info = model.transcribe(
            wav_path,
            task=task,
            beam_size=beam_size
        )

        segments = list(segments)
        elapsed = time.time() - start

        logging.info(f"[job {job_id}] WHISPER DONE {elapsed:.2f}s")
        logging.debug(f"[job {job_id}] Segments count: {len(segments)}")
        logging.debug(f"[job {job_id}] Language: {info.language}, Duration: {info.duration:.2f}s")

        text = " ".join(s.text for s in segments)
        logging.debug(f"[job {job_id}] Transcript length: {len(text)} characters")

        result = {
            "text": text.strip(),
            "language": info.language,
            "duration": info.duration,
        }

        with jobs_lock:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["result"] = result

        logging.info(f"[job {job_id}] DONE")
        logging.debug(f"[job {job_id}] ✅ Job completed successfully")

        # Return result for async processing
        return result

    except Exception as e:
        logging.exception(f"[job {job_id}] FAIL")
        logging.error(f"[job {job_id}] ❌ Exception type: {type(e).__name__}")
        logging.error(f"[job {job_id}] ❌ Exception message: {str(e)}")
        with jobs_lock:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
            jobs[job_id]["failed_at"] = time.time()
        raise

    finally:
        logging.debug(f"[job {job_id}] Cleaning up temp files: {temp_files}")
        cleanup(*temp_files)
        logging.debug(f"[job {job_id}] ✅ Cleanup complete")


# =========================
# ASYNC WRAPPER WITH EMBEDDINGS
# =========================
async def run_job_with_embeddings(job_id, input_path, task, beam_size, callback_url, queue_id, attachment_id):
    """Run transcription job with embedding generation and database save"""
    try:
        logging.debug(f"[job {job_id}] 🚀 run_job_with_embeddings started")
        logging.debug(f"[job {job_id}] Acquiring semaphore...")
        
        async with semaphore:
            logging.debug(f"[job {job_id}] ✅ Semaphore acquired")
            
            # Step 1: Run transcription
            logging.debug(f"[job {job_id}] Step 1: Starting transcription in thread...")
            result = await asyncio.to_thread(
                process_job_sync,
                job_id,
                input_path,
                task,
                beam_size,
                callback_url,
                None  # No lesson_id needed
            )
            logging.debug(f"[job {job_id}] ✅ Transcription completed")
            logging.info(f"[job {job_id}] Transcript: {len(result['text'])} characters")
        
        logging.debug(f"[job {job_id}] Semaphore released")
        
        # Step 2: Create segments from transcript
        logging.debug(f"[job {job_id}] Step 2: Creating segments...")
        with jobs_lock:
            jobs[job_id]["progress"] = "creating_segments"
        
        segments = segment_transcript(result["text"], result["duration"])
        logging.info(f"[job {job_id}] Created {len(segments)} segments")
        
        if not segments:
            logging.warning(f"[job {job_id}] No segments created (transcript too short)")
            with jobs_lock:
                jobs[job_id]["segments_created"] = 0
                jobs[job_id]["status"] = "completed"
                jobs[job_id]["completed_at"] = time.time()
            
            # Send callback with no segments
            if callback_url:
                await send_callback(callback_url, {
                    "job_id": job_id,
                    "status": "completed",
                    "result": result,
                    "segments": 0,
                    "embeddings_generated": False,
                    "timestamp": time.time()
                })
            return
        
        # Step 3: Generate embeddings for all segments
        logging.debug(f"[job {job_id}] Step 3: Generating embeddings...")
        with jobs_lock:
            jobs[job_id]["progress"] = "generating_embeddings"
        
        segment_texts = [seg.text for seg in segments]
        
        # Call BGE embedding server
        bge_embeddings = []
        bge_dimension = 0
        
        try:
            if httpx:
                logging.info(f"[job {job_id}] Calling BGE embedding server...")
                async with httpx.AsyncClient(timeout=EMBEDDING_REQUEST_TIMEOUT) as client:
                    response = await client.post(
                        f"{BGE_HG_EMBEDDING_SERVER_API_URL}/embed/batch",
                        json={"inputs": segment_texts}
                    )
                    response.raise_for_status()
                    data = response.json()
                    bge_embeddings = data.get("embeddings", [])
                    bge_dimension = data.get("dim", 0)
                    logging.info(f"[job {job_id}] ✅ BGE embeddings: {len(bge_embeddings)} (dim: {bge_dimension})")
        except Exception as e:
            logging.error(f"[job {job_id}] ❌ BGE embedding failed: {e}")
        
        # Call E5 embedding server
        e5_embeddings = []
        e5_dimension = 0
        
        try:
            if httpx:
                logging.info(f"[job {job_id}] Calling E5 embedding server...")
                async with httpx.AsyncClient(timeout=EMBEDDING_REQUEST_TIMEOUT) as client:
                    response = await client.post(
                        f"{E5_HG_EMBEDDING_SERVER_API_URL}/embed/batch",
                        json={"inputs": segment_texts}
                    )
                    response.raise_for_status()
                    data = response.json()
                    e5_embeddings = data.get("embeddings", [])
                    e5_dimension = data.get("dim", 0)
                    logging.info(f"[job {job_id}] ✅ E5 embeddings: {len(e5_embeddings)} (dim: {e5_dimension})")
        except Exception as e:
            logging.error(f"[job {job_id}] ❌ E5 embedding failed: {e}")
        
        # Step 4: Save to database (if Supabase is configured)
        if supabase_client and queue_id and attachment_id:
            logging.debug(f"[job {job_id}] Step 4: Saving to database...")
            with jobs_lock:
                jobs[job_id]["progress"] = "saving_to_database"
            
            try:
                # Save video embeddings to database
                logging.info(f"[job {job_id}] Saving {len(segments)} embeddings to database...")
                
                def _save_embeddings():
                    records = []
                    for i, seg in enumerate(segments):
                        bge_emb = bge_embeddings[i] if i < len(bge_embeddings) else None
                        e5_emb = e5_embeddings[i] if i < len(e5_embeddings) else None
                        
                        record = {
                            "attachment_id": attachment_id,
                            "content_type": "lesson",  # Required field
                            "content_text": seg.text,
                            "chunk_type": "segment",
                            "segment_start_time": seg.start_time,
                            "segment_end_time": seg.end_time,
                            "segment_index": seg.position,
                            "total_segments": len(segments),
                            "word_count": len(seg.text.split()),
                            "sentence_count": len([s for s in seg.text.split('.') if s.strip()]),
                            "status": "completed"
                        }
                        
                        # Add embeddings if available (using correct column names)
                        if bge_emb:
                            record["embedding_bge_m3"] = bge_emb
                            record["has_bge_embedding"] = True
                        if e5_emb:
                            record["embedding_e5_small"] = e5_emb
                            record["has_e5_embedding"] = True
                        
                        records.append(record)
                    
                    # Insert all records
                    result = supabase_client.table("video_embeddings").insert(records).execute()
                    return [row["id"] for row in result.data]
                
                embedding_ids = await retry_with_backoff(_save_embeddings)
                logging.info(f"[job {job_id}] ✅ Saved {len(embedding_ids)} embeddings to database")
                
                with jobs_lock:
                    jobs[job_id]["database_saved"] = True
                    jobs[job_id]["segments_created"] = len(segments)
                    jobs[job_id]["embedding_ids"] = embedding_ids
                    jobs[job_id]["embeddings_generated"] = True
                
                # Update queue status to completed
                def _update_queue():
                    supabase_client.table("video_processing_queue").update({
                        "status": "completed",
                        "progress_percentage": 100,
                        "completed_at": datetime.now().isoformat()
                    }).eq("id", queue_id).execute()
                
                await retry_with_backoff(_update_queue)
                logging.info(f"[job {job_id}] ✅ Queue {queue_id} marked as completed")
                
            except Exception as db_error:
                logging.error(f"[job {job_id}] ❌ Database save failed: {db_error}")
                with jobs_lock:
                    jobs[job_id]["database_error"] = str(db_error)
        
        # Mark as completed
        with jobs_lock:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["completed_at"] = time.time()
            jobs[job_id]["segments"] = [
                {
                    "text": seg.text,
                    "start_time": seg.start_time,
                    "end_time": seg.end_time,
                    "position": seg.position
                }
                for seg in segments
            ]
        
        logging.info(f"[job {job_id}] ✅ Job completed successfully")
        
        # Send success callback
        if callback_url:
            logging.debug(f"[job {job_id}] Sending success callback...")
            try:
                await send_callback(callback_url, {
                    "job_id": job_id,
                    "status": "completed",
                    "result": result,
                    "segments": len(segments),
                    "embeddings_generated": len(bge_embeddings) > 0 or len(e5_embeddings) > 0,
                    "timestamp": time.time()
                })
                logging.debug(f"[job {job_id}] ✅ Success callback sent")
            except Exception as e:
                logging.error(f"[callback] failed {e}")
    
    except Exception as e:
        logging.exception(f"[job {job_id}] Job failed")
        logging.error(f"[job {job_id}] ❌ Exception type: {type(e).__name__}")
        logging.error(f"[job {job_id}] ❌ Exception message: {str(e)}")
        with jobs_lock:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
            jobs[job_id]["failed_at"] = time.time()
        
        # Send failure callback
        if callback_url:
            logging.debug(f"[job {job_id}] Sending failure callback...")
            try:
                await send_callback(callback_url, {
                    "job_id": job_id,
                    "status": "failed",
                    "error": str(e),
                    "timestamp": time.time()
                })
                logging.debug(f"[job {job_id}] ✅ Failure callback sent")
            except Exception as cb_error:
                logging.error(f"[callback] failed {cb_error}")
    
    finally:
        # Prevent task memory leak
        logging.debug(f"[job {job_id}] Removing task from tasks dict")
        tasks.pop(job_id, None)
        logging.debug(f"[job {job_id}] 🏁 run_job_with_embeddings finished")


# =========================
# ASYNC WRAPPER
# =========================
async def run_job(job_id, input_path, task, beam_size, callback_url, lesson_id):
    """Run transcription job with optional database save"""
    try:
        logging.debug(f"[job {job_id}] 🚀 run_job started")
        logging.debug(f"[job {job_id}] Acquiring semaphore...")
        
        async with semaphore:
            logging.debug(f"[job {job_id}] ✅ Semaphore acquired")
            
            # Run transcription
            logging.debug(f"[job {job_id}] Starting transcription in thread...")
            result = await asyncio.to_thread(
                process_job_sync,
                job_id,
                input_path,
                task,
                beam_size,
                callback_url,
                lesson_id
            )
            logging.debug(f"[job {job_id}] ✅ Transcription thread completed")
        
        logging.debug(f"[job {job_id}] Semaphore released")
        
        # If lesson_id provided, save to database
        if lesson_id and supabase_client:
            logging.debug(f"[job {job_id}] Lesson ID provided, saving to database...")
            try:
                await save_to_database(
                    job_id,
                    lesson_id,
                    result["text"],
                    result["language"],
                    result["duration"]
                )
                logging.debug(f"[job {job_id}] ✅ Database save completed")
            except Exception as e:
                logging.error(f"[job {job_id}] Database save failed: {e}")
                logging.error(f"[job {job_id}] Exception type: {type(e).__name__}")
                with jobs_lock:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = f"Database error: {str(e)}"
                    jobs[job_id]["failed_at"] = time.time()
                
                # Send failure callback
                if callback_url:
                    logging.debug(f"[job {job_id}] Sending failure callback...")
                    try:
                        await send_callback(callback_url, {
                            "job_id": job_id,
                            "status": "failed",
                            "error": str(e),
                            "timestamp": time.time()
                        })
                        logging.debug(f"[job {job_id}] ✅ Failure callback sent")
                    except Exception as cb_error:
                        logging.error(f"[callback] failed {cb_error}")
                
                return
        elif lesson_id and not supabase_client:
            logging.warning(f"[job {job_id}] lesson_id provided but Supabase not configured")
        
        # Mark as completed
        with jobs_lock:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["completed_at"] = time.time()
        
        logging.debug(f"[job {job_id}] Job marked as completed")
        
        # Send success callback
        if callback_url:
            logging.debug(f"[job {job_id}] Sending success callback...")
            try:
                await send_callback(callback_url, {
                    "job_id": job_id,
                    "status": "completed",
                    "result": result,
                    "timestamp": time.time()
                })
                logging.debug(f"[job {job_id}] ✅ Success callback sent")
            except Exception as e:
                logging.error(f"[callback] failed {e}")
    
    except Exception as e:
        logging.exception(f"[job {job_id}] Job failed")
        logging.error(f"[job {job_id}] ❌ Exception type: {type(e).__name__}")
        logging.error(f"[job {job_id}] ❌ Exception message: {str(e)}")
        with jobs_lock:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
            jobs[job_id]["failed_at"] = time.time()
        
        # Send failure callback
        if callback_url:
            logging.debug(f"[job {job_id}] Sending failure callback...")
            try:
                await send_callback(callback_url, {
                    "job_id": job_id,
                    "status": "failed",
                    "error": str(e),
                    "timestamp": time.time()
                })
                logging.debug(f"[job {job_id}] ✅ Failure callback sent")
            except Exception as cb_error:
                logging.error(f"[callback] failed {cb_error}")
    
    finally:
        # Prevent task memory leak
        logging.debug(f"[job {job_id}] Removing task from tasks dict")
        tasks.pop(job_id, None)
        logging.debug(f"[job {job_id}] 🏁 run_job finished")


# =========================
# API
# =========================
@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(None),
    url: str = Query(None),
    task: str = "transcribe",
    beam_size: int = 5,
    callback_url: str = None,
    queue_id: int = Query(None),  # NEW: Queue ID for tracking
    attachment_id: int = Query(None),  # NEW: Attachment ID for tracking
):
    job_id = str(uuid.uuid4())
    
    logging.info(f"[transcribe] New request - job_id: {job_id}")
    logging.debug(f"[transcribe] Parameters - task: {task}, beam_size: {beam_size}")
    logging.debug(f"[transcribe] File provided: {file is not None}")
    logging.debug(f"[transcribe] URL provided: {url}")
    logging.debug(f"[transcribe] Queue ID: {queue_id}")
    logging.debug(f"[transcribe] Attachment ID: {attachment_id}")
    logging.debug(f"[transcribe] Callback URL: {callback_url}")

    with jobs_lock:
        jobs[job_id] = {
            "status": "queued",
            "progress": "init",
            "created_at": time.time(),
            "queue_id": queue_id,
            "attachment_id": attachment_id,
            "database_saved": False,
            "segments_created": 0,
            "segment_ids": [],
            "embeddings_generated": False
        }

    try:
        # INPUT
        if url and "mega.nz" in url:
            logging.debug(f"[transcribe] Downloading from MEGA: {url}")
            input_path = await asyncio.to_thread(download_mega_sync, url)
            logging.debug(f"[transcribe] ✅ MEGA download complete: {input_path}")
        elif file:
            logging.debug(f"[transcribe] Processing uploaded file: {file.filename}")
            suffix = os.path.splitext(file.filename or ".wav")[1]
            logging.debug(f"[transcribe] File suffix: {suffix}")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                file_content = await file.read()
                logging.debug(f"[transcribe] Read {len(file_content)} bytes from upload")
                tmp.write(file_content)
                input_path = tmp.name
                logging.debug(f"[transcribe] ✅ Saved to temp file: {input_path}")
        else:
            logging.error(f"[transcribe] ❌ No input provided")
            raise ValueError("no input")

        logging.debug(f"[transcribe] Input path: {input_path}")
        logging.debug(f"[transcribe] Input file exists: {os.path.exists(input_path)}")
        
        if os.path.exists(input_path):
            file_size = os.path.getsize(input_path)
            logging.debug(f"[transcribe] Input file size: {file_size} bytes")

        with jobs_lock:
            jobs[job_id]["progress"] = "processing"

        logging.debug(f"[transcribe] Creating background task for job {job_id}")
        
        # Create background task
        task_obj = asyncio.create_task(
            run_job_with_embeddings(job_id, input_path, task, beam_size, callback_url, queue_id, attachment_id)
        )

        tasks[job_id] = task_obj
        
        logging.info(f"[transcribe] ✅ Job {job_id} accepted and queued")

        # Return immediately with HTTP 202
        return {
            "job_id": job_id,
            "status": "accepted",
            "status_url": f"/status/{job_id}"
        }, 202

    except Exception as e:
        logging.exception(f"[transcribe] ❌ Exception in transcribe endpoint")
        logging.error(f"[transcribe] Exception type: {type(e).__name__}")
        logging.error(f"[transcribe] Exception message: {str(e)}")
        with jobs_lock:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
        return {"error": str(e)}, 400


@app.get("/status/{job_id}")
def status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return {"error": "not found"}, 404
    
    # Build response
    response = {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress"),
        "created_at": job.get("created_at")
    }
    
    # Add result if completed
    if job.get("result"):
        response["result"] = job["result"]
        
        # Add segments if available
        if job.get("segments"):
            response["segments"] = job["segments"]
    
    # Add database info if saved
    if job.get("database_saved"):
        response["database_saved"] = True
        response["segments_created"] = job.get("segments_created", 0)
        response["segment_ids"] = job.get("segment_ids", [])
    
    # Add embedding info if generated
    if job.get("embeddings_generated"):
        response["embeddings_generated"] = job["embeddings_generated"]
    
    # Add timestamps
    if job.get("completed_at"):
        response["completed_at"] = job["completed_at"]
    if job.get("failed_at"):
        response["failed_at"] = job["failed_at"]
    
    # Add error if failed
    if job.get("error"):
        response["error"] = job["error"]
    if job.get("database_error"):
        response["database_error"] = job["database_error"]
    
    return response


@app.get("/jobs")
def list_jobs():
    return {
        "total": len(jobs),
        "jobs": list(jobs.keys())
    }


@app.delete("/jobs/{job_id}")
def delete(job_id: str):
    jobs.pop(job_id, None)
    tasks.pop(job_id, None)
    return {"deleted": job_id}


@app.post("/generate-embeddings")
async def generate_embeddings_endpoint(
    texts: List[str],
    lesson_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Generate embeddings for text segments by calling embedding servers directly"""
    if not httpx:
        return {"error": "httpx not installed"}, 500
    
    if not texts:
        return {"error": "texts required"}, 400
    
    embed_job_id = str(uuid.uuid4())
    
    try:
        logging.info(f"[embed {embed_job_id}] Generating embeddings for {len(texts)} texts")
        
        # Call BGE embedding server
        bge_embeddings = []
        bge_dimension = 0
        bge_success = 0
        bge_failed = 0
        
        try:
            async with httpx.AsyncClient(timeout=EMBEDDING_REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{BGE_HG_EMBEDDING_SERVER_API_URL}/embed/batch",
                    json={"inputs": texts}  # Changed from "texts" to "inputs"
                )
                response.raise_for_status()
                data = response.json()
                bge_embeddings = data.get("embeddings", [])
                bge_dimension = data.get("dim", 0)
                bge_success = len(bge_embeddings)
                logging.info(f"[embed {embed_job_id}] ✅ BGE embeddings generated: {bge_success} (dim: {bge_dimension})")
        except Exception as e:
            bge_failed = len(texts)
            logging.error(f"[embed {embed_job_id}] ❌ BGE embedding failed: {e}")
        
        # Call E5 embedding server
        e5_embeddings = []
        e5_dimension = 0
        e5_success = 0
        e5_failed = 0
        
        try:
            async with httpx.AsyncClient(timeout=EMBEDDING_REQUEST_TIMEOUT) as client:
                response = await client.post(
                    f"{E5_HG_EMBEDDING_SERVER_API_URL}/embed/batch",
                    json={"inputs": texts}  # Changed from "texts" to "inputs"
                )
                response.raise_for_status()
                data = response.json()
                e5_embeddings = data.get("embeddings", [])
                e5_dimension = data.get("dim", 0)
                e5_success = len(e5_embeddings)
                logging.info(f"[embed {embed_job_id}] ✅ E5 embeddings generated: {e5_success} (dim: {e5_dimension})")
        except Exception as e:
            e5_failed = len(texts)
            logging.error(f"[embed {embed_job_id}] ❌ E5 embedding failed: {e}")
        
        return {
            "job_id": embed_job_id,
            "status": "completed",
            "texts_processed": len(texts),
            "embeddings": {
                "bge": {
                    "embeddings": bge_embeddings,
                    "dimension": bge_dimension,
                    "success": bge_success,
                    "failed": bge_failed
                },
                "e5": {
                    "embeddings": e5_embeddings,
                    "dimension": e5_dimension,
                    "success": e5_success,
                    "failed": e5_failed
                }
            },
            "metadata": metadata
        }
    
    except Exception as e:
        logging.exception(f"[embed {embed_job_id}] Failed")
        return {"error": str(e)}, 500