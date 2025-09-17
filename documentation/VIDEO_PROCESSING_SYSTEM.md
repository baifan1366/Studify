# Video Processing System Documentation

## Overview

The video processing system has been completely refactored to use QStash queues for asynchronous handling of video upload, compression, audio conversion, Whisper transcription, and embedding generation. This addresses Hugging Face server sleep issues with automatic retry logic, provides real-time progress updates, and includes user notifications.

## Architecture

### Processing Flow
1. **Video Upload** → Creates processing queue and initializes steps
2. **Video Compression** → Optimizes video via Cloudinary
3. **Audio Conversion** → Extracts audio from compressed video
4. **Whisper Transcription** → Converts audio to text with retry logic
5. **Embedding Generation** → Creates AI embeddings with fallback servers
6. **Completion** → Sends notification and updates database

### Key Features
- **Asynchronous Processing**: Each step runs independently via QStash
- **Automatic Retries**: Up to 3 retries with 1-minute intervals for server wake-up
- **Real-time Progress**: Frontend shows detailed step progress
- **User Notifications**: OneSignal notifications for completion/failure
- **Cancellation Support**: Users can cancel processing at any time
- **Error Handling**: Comprehensive error tracking and recovery

## Database Schema

### Tables Created
- `video_processing_queue`: Main processing job tracking
- `video_processing_steps`: Individual step status and progress
- `video_processing_queue_status`: View for easy status querying

### Key Functions
- `initialize_video_processing_steps()`: Sets up processing steps
- `update_video_processing_step()`: Updates step status and progress
- `complete_processing_step()`: Marks step as completed
- `cancel_video_processing()`: Cancels entire processing job

## API Endpoints

### Core Processing APIs
- `POST /api/video-processing/upload`: Start processing for uploaded video
- `POST /api/video-processing/steps/compress`: Handle video compression
- `POST /api/video-processing/steps/audio-convert`: Convert video to audio
- `POST /api/video-processing/steps/transcribe`: Generate transcription
- `POST /api/video-processing/steps/embed`: Create embeddings

### Management APIs
- `GET /api/video-processing/status/[queueId]`: Get processing status
- `DELETE /api/video-processing/status/[queueId]`: Cancel processing
- `GET /api/video-processing/queue`: List user's processing queues

## Frontend Integration

### React Hooks
- `useStartVideoProcessing()`: Initiate video processing
- `useVideoProcessingStatus()`: Monitor processing progress
- `useCancelVideoProcessing()`: Cancel processing job
- `useVideoProcessingQueues()`: List processing queues

### Components
- `VideoProcessingProgress`: Real-time progress display with cancellation
- `StorageDialog`: Updated to integrate with new processing system

## Environment Variables Required

```env
# Hugging Face API Endpoints
BGE_HG_EMBEDDING_SERVER_API_URL=https://your-bge-server.com
E5_HG_EMBEDDING_SERVER_API_URL=https://your-e5-server.com
WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL=https://your-whisper-server.com

# QStash Configuration
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-current-key
QSTASH_NEXT_SIGNING_KEY=your-next-key

# MEGA File Storage
MEGA_EMAIL=your-mega-email
MEGA_PASSWORD=your-mega-password

# OneSignal Notifications
ONESIGNAL_REST_API_KEY=your-onesignal-key

# Base URL for callbacks
NEXTAUTH_URL=https://your-domain.com
# OR
VERCEL_URL=your-vercel-url
```

## Notification System

### Notification Types
- **Started**: Processing has begun
- **Progress**: Step updates (optional)
- **Completed**: Processing finished successfully
- **Failed**: Processing failed after retries
- **Cancelled**: User cancelled processing

### Integration
The notification system uses the existing OneSignal infrastructure and creates database notifications for tracking.

## Error Handling & Retry Logic

### Server Sleep Detection
- Detects Hugging Face server sleep responses
- Automatically schedules retries with exponential backoff
- Maximum 3 retries per step with 1-minute intervals

### Failure Scenarios
- Network timeouts
- Server errors
- Invalid responses
- Maximum retry exceeded

### Recovery Mechanisms
- Automatic retry scheduling
- Fallback embedding servers (BGE-M3 → E5-small)
- Detailed error logging and user feedback

## Testing

### Test Script
Run the comprehensive test script to verify system readiness:

```bash
npx ts-node scripts/test-video-processing.ts
```

### Test Coverage
- Database table structure
- Environment variable configuration
- QStash connectivity
- Hugging Face endpoint availability
- Notification system setup

## Usage Examples

### Starting Video Processing
```typescript
const { mutate: startProcessing } = useStartVideoProcessing();

startProcessing(attachmentId, {
  onSuccess: (data) => {
    console.log('Processing started:', data.queue_id);
  },
  onError: (error) => {
    console.error('Failed to start processing:', error);
  }
});
```

### Monitoring Progress
```typescript
const { data: status, isLoading } = useVideoProcessingStatus(queueId, {
  refetchInterval: 2000, // Poll every 2 seconds
});

if (status) {
  console.log(`Progress: ${status.progress_percentage}%`);
  console.log(`Current step: ${status.current_step}`);
}
```

### Cancelling Processing
```typescript
const { mutate: cancelProcessing } = useCancelVideoProcessing();

cancelProcessing(queueId, {
  onSuccess: () => {
    console.log('Processing cancelled successfully');
  }
});
```

## Performance Considerations

### Optimization Features
- Cloudinary video compression reduces file sizes
- Batch processing prevents server overload
- Intelligent retry scheduling minimizes resource waste
- Progress tracking reduces user anxiety

### Monitoring
- Detailed step timing and error tracking
- Queue status monitoring
- Retry attempt logging
- User notification delivery tracking

## Security

### Authorization
- All endpoints require `tutor` role authorization
- Queue access restricted to owning user
- QStash signature verification on processing endpoints

### Data Protection
- Secure file handling via Cloudinary and MEGA
- Encrypted environment variables
- Audit trail for all processing activities

## Troubleshooting

### Common Issues
1. **Server Sleep**: Automatically handled with retries
2. **Network Timeouts**: Configurable timeout settings
3. **Invalid Files**: Validation at upload stage
4. **Queue Stuck**: Manual cancellation and retry options

### Debug Information
- Comprehensive logging at each step
- Error details stored in database
- Processing timeline tracking
- User notification delivery status

## Migration from Old System

### Breaking Changes
- Old direct processing endpoints deprecated
- New queue-based flow required for all video processing
- Updated frontend components and hooks

### Compatibility
- Existing video attachments remain unchanged
- Old embeddings and transcriptions preserved
- Gradual migration path available

## Future Enhancements

### Planned Features
- Batch video processing
- Custom processing pipelines
- Advanced progress analytics
- Multi-language transcription support
- Custom embedding models

### Scalability
- Horizontal scaling via QStash
- Load balancing across multiple servers
- Distributed processing capabilities
- Advanced queue management
