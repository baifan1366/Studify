# Embedding Queue Setup Guide

## Problem Overview

Your embedding queue items were stuck in "queued" status because:

1. The queue-monitor was trying to process items directly (wrong approach)
2. No proper QStash schedule was triggering the processor
3. The processing logic was in the wrong endpoint

## Solution Architecture

```
┌─────────────────┐
│  Data Changes   │ (Profile, Course, Post, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Trigger│ (queue_for_embedding function)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ embedding_queue │ (status: "queued")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  QStash Schedule│ (runs every 5 minutes)
│  queue-monitor  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QStash Queue    │ (embedding-processor)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/embeddings │
│    /process     │ (actual processing)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   embeddings    │ (status: "completed")
└─────────────────┘
```

## Setup Steps

### 1. Verify Database Schema

Ensure dual embedding columns exist:

```sql
-- Check if columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'embeddings'
AND column_name IN ('embedding_e5_small', 'embedding_bge_m3', 'has_e5_embedding', 'has_bge_embedding');

-- If missing, add them:
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_e5_small vector(384);
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_bge_m3 vector(1024);
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_e5_embedding boolean DEFAULT false;
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS has_bge_embedding boolean DEFAULT false;
```

### 2. Configure QStash Schedules

#### Option A: Using the Setup Script (Recommended)

```bash
# Set environment variables
export QSTASH_TOKEN="your_token_here"
export NEXT_PUBLIC_SITE_URL="https://studify-platform.vercel.app"

# Run setup script
npx tsx scripts/setup-embedding-schedule.ts
```

#### Option B: Manual Setup via QStash Dashboard

1. Go to [Upstash Console](https://console.upstash.com/qstash)
2. Create schedules:

**Schedule 1: Queue Monitor (Every 5 minutes)**

- URL: `https://studify-platform.vercel.app/api/embeddings/queue-monitor`
- Cron: `*/5 * * * *`
- Method: POST

**Schedule 2: Daily Cleanup (2 AM)**

- URL: `https://studify-platform.vercel.app/api/embeddings/maintenance`
- Cron: `0 2 * * *`
- Method: POST
- Body: `{"task": "cleanup"}`

**Schedule 3: Weekly Retry (3 AM Sunday)**

- URL: `https://studify-platform.vercel.app/api/embeddings/maintenance`
- Cron: `0 3 * * 0`
- Method: POST
- Body: `{"task": "retry_failed"}`

### 3. Create QStash Queue

```bash
# Using QStash API
curl -X POST https://qstash.upstash.io/v2/queues \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queueName": "embedding-processor",
    "parallelism": 2
  }'
```

### 4. Test the System

#### Test 1: Manual Trigger

```bash
curl -X POST https://studify-platform.vercel.app/api/embeddings/trigger
```

#### Test 2: Check Queue Status

```bash
curl https://studify-platform.vercel.app/api/embeddings/queue-monitor
```

#### Test 3: Add Test Item

```sql
-- Insert a test item
INSERT INTO embedding_queue (content_type, content_id, content_text, content_hash, priority, status)
VALUES ('test', 1, 'This is a test embedding', md5('test'), 5, 'queued');

-- Check if it gets processed
SELECT * FROM embedding_queue WHERE content_type = 'test';
```

## Endpoints

### `/api/embeddings/queue-monitor` (POST)

- **Purpose**: Monitor queue and trigger processing
- **Called by**: QStash schedule (every 5 minutes)
- **Action**: Counts queued items and triggers batch processing

### `/api/embeddings/process` (POST)

- **Purpose**: Actually process embeddings
- **Called by**: QStash queue (triggered by monitor)
- **Action**: Generates dual embeddings and stores them

### `/api/embeddings/trigger` (POST)

- **Purpose**: Manual trigger for testing
- **Called by**: Developers for testing
- **Action**: Immediately processes queue

### `/api/embeddings/maintenance` (POST)

- **Purpose**: Cleanup and retry failed items
- **Called by**: QStash schedule (daily/weekly)
- **Action**: Cleans up old items, retries failed ones

## Monitoring

### Check Queue Status

```bash
# Get queue statistics
curl https://studify-platform.vercel.app/api/embeddings/queue-monitor

# Response:
{
  "queuedCount": 10,
  "triggered": 1,
  "batches": 1,
  "items": [...]
}
```

### Check Database

```sql
-- Count by status
SELECT status, COUNT(*)
FROM embedding_queue
GROUP BY status;

-- Recent items
SELECT id, content_type, content_id, status, retry_count, error_message, created_at
FROM embedding_queue
ORDER BY created_at DESC
LIMIT 10;

-- Failed items
SELECT * FROM embedding_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### Check QStash Dashboard

1. Visit [QStash Console](https://console.upstash.com/qstash)
2. View:
   - Schedules (should see 3 schedules)
   - Queues (should see "embedding-processor")
   - Messages (recent processing activity)
   - DLQ (dead letter queue for failed messages)

## Troubleshooting

### Items Stuck in "queued"

**Symptom**: Items remain in queued status, retry_count stays at 0

**Causes**:

1. QStash schedule not configured
2. Queue not created
3. Processing endpoint not accessible

**Fix**:

```bash
# 1. Check if schedule exists
curl https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN"

# 2. Manually trigger processing
curl -X POST https://studify-platform.vercel.app/api/embeddings/trigger

# 3. Check logs in Vercel dashboard
```

### Items Failing with Errors

**Symptom**: Items move to "failed" status with error messages

**Check**:

```sql
SELECT error_message, COUNT(*)
FROM embedding_queue
WHERE status = 'failed'
GROUP BY error_message;
```

**Common errors**:

- "Failed to generate embeddings": Embedding server down
- "Database error": Schema issues
- "Timeout": Text too long

### Embedding Servers Down

**Symptom**: All embeddings fail with connection errors

**Check servers**:

```bash
# E5 Small
curl https://edusocial-e5-small-embedding-server.hf.space/healthz

# BGE-M3
curl https://edusocial-bge-m3-embedding-server.hf.space/healthz
```

**Response should be**:

```json
{
  "status": "ok",
  "device": "cpu",
  "model": "SentenceTransformer"
}
```

## Performance Tuning

### Adjust Processing Frequency

Change the cron schedule in QStash:

- More frequent: `*/2 * * * *` (every 2 minutes)
- Less frequent: `*/10 * * * *` (every 10 minutes)

### Adjust Batch Size

Edit `/api/embeddings/process/route.ts`:

```typescript
.limit(10); // Change to 20 for larger batches
```

### Adjust Queue Parallelism

```bash
# Update queue parallelism
curl -X PUT https://qstash.upstash.io/v2/queues/embedding-processor \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parallelism": 5}'
```

## Environment Variables

Required:

```env
QSTASH_TOKEN=your_token_here
QSTASH_CURRENT_SIGNING_KEY=your_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
NEXT_PUBLIC_SITE_URL=https://studify-platform.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Migration from Old System

If you have items stuck in the old system:

```sql
-- Reset stuck items
UPDATE embedding_queue
SET status = 'queued',
    retry_count = 0,
    error_message = NULL,
    scheduled_at = NOW()
WHERE status IN ('processing', 'failed');

-- Then trigger processing
-- curl -X POST https://studify-platform.vercel.app/api/embeddings/trigger
```

## Success Metrics

Your system is working correctly when:

- ✅ Items move from "queued" to "processing" to completed
- ✅ Retry count increases on failures
- ✅ Error messages are logged for failed items
- ✅ Embeddings table receives new entries
- ✅ QStash dashboard shows successful message delivery
