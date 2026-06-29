# Studify Whisper ASR

This service performs the long-running ASR, embedding, and Supabase persistence
work outside Vercel's execution window. QStash only triggers the job; the
Whisper container writes timestamped segments and embeddings directly.

## Required environment

```text
WHISPER_API_TOKEN=<shared trigger secret>
WHISPER_MODEL_SIZE=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
E5_HG_EMBEDDING_SERVER_API_URL=...
BGE_HG_EMBEDDING_SERVER_API_URL=...
EMBEDDING_API_TOKEN=<same secret configured on both embedding servers>
FASTSTART_ENABLED=true
MEGA_EMAIL=<server-side MEGA account>
MEGA_PASSWORD=<server-side MEGA password>
```

The `/transcribe` endpoint accepts one uploaded file or one HTTPS MEGA URL and
returns HTTP 202. When `queue_id` and `attachment_id` are present, the service
detects MP4/MOV files whose `moov` atom is after `mdat`, performs an FFmpeg
stream-copy Fast Start remux, uploads the optimized MP4 back to MEGA, and
updates the attachment URL before transcription. It then
generates dual embeddings, replaces that attachment's segment index
idempotently, and completes the Supabase processing records.

Configure the same `WHISPER_API_TOKEN` in the Studify/Vercel environment. Never
expose the Supabase service-role key to the browser; it belongs only in the
Whisper container's server-side secrets.

Run locally:

```bash
uvicorn app:app --host 0.0.0.0 --port 7860
```
