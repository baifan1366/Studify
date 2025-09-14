# QStash Testing Commands

## Prerequisites
1. Make sure your Next.js dev server is running: `npm run dev`
2. Make sure QStash development server is running: `npx @upstash/qstash-cli@latest dev`

## Environment Variables for Testing
```bash
# For local development with QStash dev server
QSTASH_TOKEN="eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0="
QSTASH_URL="http://127.0.0.1:8080"
QSTASH_DEV_URL="http://127.0.0.1:8080"
QSTASH_CURRENT_SIGNING_KEY="sig_7kYjw48mhY7kAjqNGcy6cr29RJ6r"
QSTASH_NEXT_SIGNING_KEY="sig_5ZB6DVzB1wjE8S6rZ7eenA8Pdnhs"
NEXT_PUBLIC_NODE_ENV="development"
```

## 1. Test QStash Connection

### PowerShell Commands (Windows):

```powershell
# Test GET - Check QStash connection
Invoke-WebRequest -Uri "http://localhost:3000/api/qstash/test" -Method GET

# Test POST - Publish test message
Invoke-WebRequest -Uri "http://localhost:3000/api/qstash/test" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"url": "https://httpbin.org/post", "message": "test"}'
```

### Curl Commands (if available):

```bash
# Test GET - Check QStash connection
curl -X GET http://localhost:3000/api/qstash/test

# Test POST - Publish test message
curl -X POST http://localhost:3000/api/qstash/test \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/post", "message": "test"}'
```

## 3. Test Individual Webhooks Directly

### Embeddings Webhook:

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/embeddings/process-webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"contentType": "profile", "contentId": 123, "priority": 2}'
```

```bash
# Curl
curl -X POST http://localhost:3000/api/embeddings/process-webhook \
  -H "Content-Type: application/json" \
  -d '{"contentType": "profile", "contentId": 123, "priority": 2}'
```

### Reactions Webhook:

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/reactions/process-webhook" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"action": "added", "user_id": 456, "target_type": "post", "target_id": 789, "emoji": "👍"}'
```

```bash
# Curl
curl -X POST http://localhost:3000/api/reactions/process-webhook \
  -H "Content-Type: application/json" \
  -d '{"action": "added", "user_id": 456, "target_type": "post", "target_id": 789, "emoji": "👍"}'
```

## 4. Test QStash Development Server Directly

### PowerShell:

```powershell
# Test QStash dev server directly
Invoke-WebRequest -Uri "http://127.0.0.1:8080/v2/publish/https://httpbin.org/post" -Method POST -Headers @{"Authorization"="Bearer eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0="; "Content-Type"="application/json"} -Body '{"message": "test from powershell"}'
```

### Curl:

```bash
# Test QStash dev server directly
curl -X POST http://127.0.0.1:8080/v2/publish/https://httpbin.org/post \
  -H "Authorization: Bearer eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=" \
  -H "Content-Type: application/json" \
  -d '{"message": "test from curl"}'
```

## Expected Responses

### Successful QStash Connection Test:
```json
{
  "success": true,
  "message": "QStash connection successful",
  "token_prefix": "eyJVc2VySUQiOiJkZWZhd...",
  "test_message_id": "msg_...",
  "environment": {
    "QSTASH_URL": "http://127.0.0.1:8080",
    "QSTASH_CURRENT_SIGNING_KEY": "Set",
    "QSTASH_NEXT_SIGNING_KEY": "Set"
  }
}
```

### Successful Webhook Test:
```json
{
  "success": true,
  "summary": "4/4 tests passed",
  "results": [...],
  "environment": {...}
}
```

## Troubleshooting

1. **401 Unauthorized**: Make sure Next.js dev server is running (`npm run dev`)
2. **Connection refused**: Check if QStash dev server is running (`npx @upstash/qstash-cli@latest dev`)
3. **Environment variables**: Make sure all QStash environment variables are set
4. **CORS issues**: Use the same origin (localhost:3000) for all requests
