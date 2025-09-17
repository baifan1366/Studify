# Client-Side File Upload with MEGA

This document describes the client-side file upload implementation that bypasses Next.js API route limitations to handle files larger than 4MB.

## Problem Solved

- **Issue**: Next.js API routes have a default 4MB limit for file uploads, causing `413 Content Too Large` errors
- **Solution**: Client-side upload to MEGA cloud storage, then save metadata to database via lightweight API

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Client Side   │───▶│  MEGA Cloud  │───▶│ Metadata API    │───▶│   Database   │
│   (Browser)     │    │   Storage    │    │  (Next.js)      │    │  (Supabase)  │
└─────────────────┘    └──────────────┘    └─────────────────┘    └──────────────┘
      File Upload         Get Share URL      Save URL & Metadata    Store Records
     (No Size Limit)     (Public Access)    (Lightweight JSON)     (File Metadata)
```

## Environment Variables Required

For client-side MEGA uploads, you have two options:

### Option 1: Environment Variables (Less Secure)
```env
NEXT_PUBLIC_MEGA_EMAIL=your-mega-email@example.com
NEXT_PUBLIC_MEGA_PASSWORD=your-mega-password
```

⚠️ **Security Warning**: These will be visible in client-side code. Only use for development or if acceptable for your use case.

### Option 2: Runtime Credentials (Recommended)
Pass credentials at runtime through the hook parameters for better security control.

## Implementation Files

### 1. Client-Side Upload Library
- **File**: `lib/mega-client.ts`
- **Purpose**: Handles direct MEGA uploads from browser
- **Key Functions**:
  - `uploadToMegaClient()` - Upload files directly to MEGA
  - `testMegaConnectionClient()` - Test MEGA connection

### 2. Metadata API Route
- **File**: `app/api/attachments/save-metadata/route.ts`
- **Purpose**: Save file metadata after successful MEGA upload
- **Input**: `{ title, url, size, type }`
- **Output**: Database record with attachment info

### 3. Updated Hooks
- **File**: `hooks/course/use-attachments.ts`
- **New Hook**: `useUploadAttachment()` - Uses client-side upload
- **Legacy Hook**: `useUploadAttachmentLegacy()` - Uses original API route (4MB limit)

## Usage Examples

### Basic Upload with Environment Variables
```typescript
import { useUploadAttachment } from '@/hooks/course/use-attachments'

function FileUploadComponent() {
  const uploadMutation = useUploadAttachment()
  
  const handleUpload = (file: File) => {
    uploadMutation.mutate({
      title: "My Large File",
      file: file, // Can be > 4MB
      onProgress: (progress) => {
        console.log(`Upload: ${progress}%`)
      }
    })
  }
  
  return (
    <input 
      type="file" 
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
    />
  )
}
```

### Upload with Runtime Credentials (Secure)
```typescript
const handleSecureUpload = (file: File, credentials: { email: string, password: string }) => {
  uploadMutation.mutate({
    title: "My Large File",
    file: file,
    credentials: credentials, // Pass credentials at runtime
    onProgress: (progress) => {
      setUploadProgress(progress)
    }
  })
}
```

### Test MEGA Connection
```typescript
import { useTestMegaConnection } from '@/hooks/course/use-attachments'

function TestConnection() {
  const testMutation = useTestMegaConnection()
  
  const testConnection = () => {
    testMutation.mutate({
      email: "test@example.com",
      password: "password123"
    })
  }
  
  return <button onClick={testConnection}>Test MEGA Connection</button>
}
```

## API Endpoints

### Test Upload (Large Files)
```bash
POST /api/attachments/upload-mega
Content-Type: multipart/form-data

# Form fields:
# - file: The file to upload (any size)
# - title: File title
# - email: MEGA email (optional if env vars set)  
# - password: MEGA password (optional if env vars set)
```

### Save Metadata Only
```bash  
POST /api/attachments/save-metadata
Content-Type: application/json

{
  "title": "My File",
  "url": "https://mega.nz/file/...",
  "size": 52428800,
  "type": "video/mp4"
}
```

### Test MEGA Connection
```bash
GET /api/attachments/test-mega
```

## File Size Capabilities

| Method | Max File Size | Notes |
|--------|---------------|--------|
| Original API Route | ~4MB | Next.js limitation |  
| Client-Side MEGA Upload | **Unlimited*** | Bypasses Next.js entirely |

*Subject to MEGA account limits and browser memory constraints

## Benefits

1. **No Size Limits**: Upload files of any size supported by MEGA
2. **Better UX**: Progress tracking during upload  
3. **Reliability**: Direct upload reduces server load and timeout issues
4. **Scalability**: Server only handles lightweight metadata, not file content
5. **Backward Compatible**: Legacy upload method still available

## Security Considerations

1. **Credentials**: Use runtime credentials instead of environment variables when possible
2. **Validation**: File type and metadata validation still occurs server-side
3. **Authentication**: All metadata API calls require proper user authentication
4. **Access Control**: Files are stored with public MEGA links, ensure this fits your security model

## Error Handling

The system includes comprehensive error handling:
- MEGA authentication failures
- Network connectivity issues  
- File upload timeouts
- Metadata save failures
- Invalid file types

All errors are surfaced through React Query mutations with user-friendly messages.

## Testing

Use the test endpoint to verify large file uploads:
```bash
curl -X POST "http://localhost:3000/api/attachments/upload-mega" \
  -F "file=@large-file.mp4" \
  -F "title=Test Large File" \
  -F "email=your-mega-email@example.com" \
  -F "password=your-mega-password"
```

## Migration Guide

To migrate existing upload components:

1. **Replace hook import**:
   ```typescript
   // Old
   import { useUploadAttachment } from '@/hooks/course/use-attachments'
   
   // New (same import, updated implementation)
   import { useUploadAttachment } from '@/hooks/course/use-attachments'
   ```

2. **Add progress handling** (optional):
   ```typescript
   uploadMutation.mutate({
     title,
     file,
     onProgress: (progress) => setProgress(progress) // Add this
   })
   ```

3. **Add credentials** (recommended):
   ```typescript
   uploadMutation.mutate({
     title,
     file, 
     credentials: { email, password } // Add this for security
   })
   ```

The existing API will continue to work for files under 4MB, while automatically switching to client-side upload for larger files.
