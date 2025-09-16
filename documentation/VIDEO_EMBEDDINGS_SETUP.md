# Video Embeddings Setup Guide

## Overview

The video embeddings system automatically processes uploaded video files through the following pipeline:

1. **Video Upload** → **Audio Conversion** → **Whisper Transcription** → **Embedding Generation** → **Database Storage**

## Required Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Whisper API Configuration
WHISPER_API_URL=https://api.openai.com/v1/audio
WHISPER_API_KEY=your_openai_api_key_here

# Embedding API Configuration  
EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_API_KEY=your_openai_api_key_here

# Base URL for internal API calls
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Database Schema

### video_embeddings Table

```sql
CREATE TABLE video_embeddings (
    id SERIAL PRIMARY KEY,
    attachment_id INTEGER NOT NULL REFERENCES course_attachments(id),
    content_type VARCHAR(50) NOT NULL DEFAULT 'course',
    embedding VECTOR(1536) NOT NULL, -- OpenAI ada-002 embedding dimension
    content_text TEXT NOT NULL,
    chunk_type VARCHAR(50) DEFAULT 'video_transcript',
    hierarchy_level INTEGER DEFAULT 1,
    parent_chunk_id INTEGER REFERENCES video_embeddings(id),
    section_title VARCHAR(255),
    semantic_density DECIMAL(3,2),
    key_terms TEXT[],
    sentence_count INTEGER,
    word_count INTEGER,
    has_code_block BOOLEAN DEFAULT FALSE,
    has_table BOOLEAN DEFAULT FALSE,
    has_list BOOLEAN DEFAULT FALSE,
    chunk_language VARCHAR(10) DEFAULT 'auto',
    embedding_model VARCHAR(50) DEFAULT 'text-embedding-ada-002',
    language VARCHAR(10) DEFAULT 'auto',
    token_count INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_video_embeddings_attachment_id ON video_embeddings(attachment_id);
CREATE INDEX idx_video_embeddings_status ON video_embeddings(status);
CREATE INDEX idx_video_embeddings_is_deleted ON video_embeddings(is_deleted);
```

## API Endpoints

### Process Video for Embeddings
- **POST** `/api/embeddings/video-embeddings/process`
- **Body**: `{ "attachment_id": number }`
- **Description**: Processes a video file through the complete pipeline

### Get Video Embeddings
- **GET** `/api/embeddings/video-embeddings`
- **Description**: Lists all video embeddings

### Get by Attachment ID
- **GET** `/api/embeddings/video-embeddings/attachment/{attachmentId}`
- **Description**: Gets embeddings for a specific attachment

## How It Works

### Automatic Processing
When a video file is uploaded via the Storage Dialog:

1. File is uploaded to course_attachments table
2. System detects it's a video file
3. Automatically triggers the processing pipeline
4. User sees toast notifications for progress

### Manual Processing
For existing video files:

1. Go to Storage Dialog → Manage tab
2. Find video file in the list
3. Click the dropdown menu (⋮)
4. Select "Process for AI"

### Processing Pipeline Details

1. **Audio Conversion**: Uses existing Cloudinary integration to convert video to MP3
2. **Whisper Transcription**: Sends audio URL to Whisper API for speech-to-text
3. **Embedding Generation**: Processes transcript text through OpenAI embeddings API
4. **Metadata Calculation**: Analyzes text for word count, sentence count, etc.
5. **Database Storage**: Saves all data to video_embeddings table

## Error Handling

- Duplicate processing prevention (checks existing embeddings)
- Graceful fallbacks for each step
- User-friendly error messages via toast notifications
- Retry capability for failed processing

## Usage in Components

```typescript
import { useProcessVideoEmbeddings } from '@/hooks/embedding/use-video-embeddings'

const processVideoMutation = useProcessVideoEmbeddings()

// Process a video
await processVideoMutation.mutateAsync({
  attachment_id: videoAttachment.id
})
```

## Security Features

- User authentication required (student role)
- Attachment ownership verification
- Input validation with Zod schemas
- Rate limiting protection (inherited from existing system)
