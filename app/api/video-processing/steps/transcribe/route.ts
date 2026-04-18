import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { z } from "zod";

// Validation schema for QStash job payload
const TranscribeJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  audio_url: z.string().url("Invalid audio URL"),
  timestamp: z.string().optional(),
  retry_count: z.number().int().min(0).default(0),
  is_warmup_retry: z.boolean().optional(),
});

// Configuration for retries and timeouts
const RETRY_CONFIG = {
  MAX_RETRIES: 2, // Reduced to 2 retries (total 3 attempts: initial + 2 retries)
  WARMUP_TIMEOUT: 45000, // 45 second warmup timeout
  PROCESSING_TIMEOUT: 600000, // 10 minute processing timeout
  COLD_START_WAIT: 2000, // 2 second wait for cold start
  RETRY_DELAYS: [30, 90], // Slower retries to give server time: 30s, 90s (no warmup retry)
  SKIP_WARMUP_RETRY: true, // Skip warmup retry - just wait longer on first attempt
};

// Timeout threshold for early response prioritization (270 seconds = 4.5 minutes)
// This gives us 30 seconds buffer before Vercel's 300-second timeout
const TIMEOUT_THRESHOLD = 270000; // 270 seconds in milliseconds

/**
 * Calculate time remaining before Vercel timeout (300 seconds)
 * @param startTime - Request start time in milliseconds
 * @returns Milliseconds remaining before timeout
 */
function getRemainingTime(startTime: number): number {
  const elapsed = Date.now() - startTime;
  const VERCEL_TIMEOUT = 300000; // 300 seconds
  return VERCEL_TIMEOUT - elapsed;
}

/**
 * Check if we're approaching the timeout threshold
 * @param startTime - Request start time in milliseconds
 * @returns True if elapsed time exceeds TIMEOUT_THRESHOLD
 */
function isApproachingTimeout(startTime: number): boolean {
  const elapsed = Date.now() - startTime;
  return elapsed > TIMEOUT_THRESHOLD;
}

async function downloadAudioFile(audioUrl: string): Promise<Blob> {
  console.log("Downloading audio file from:", audioUrl);

  // Supported formats: .wav, .mp3, .m4a, .mp4, .mov, .ogg, .flac, .aac, .webm, .avi
  // The Whisper API uses ffmpeg internally to convert formats as needed

  const response = await fetch(audioUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Studify-Transcription-Service/1.0",
      Accept:
        "audio/*, video/*, application/octet-stream, audio/wav, audio/mp3, audio/m4a, video/mp4, video/mov, audio/mpeg, audio/ogg, audio/flac, audio/aac, video/webm, video/avi",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download audio file: ${response.status} ${response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const arrayBuffer = await response.arrayBuffer();

  // Log detailed response information for debugging
  console.log("📥 Download response details:", {
    url: audioUrl,
    status: response.status,
    contentType: contentType,
    size: arrayBuffer.byteLength,
    headers: Object.fromEntries(response.headers.entries()),
  });

  // Check for HTML/JSON error responses (common when URLs are wrong)
  const uint8Array = new Uint8Array(arrayBuffer);
  const firstBytes = uint8Array.slice(0, 100);
  const textPreview = new TextDecoder("utf-8", { fatal: false }).decode(
    firstBytes
  );

  // Detect common non-audio content
  if (
    textPreview.includes("<!DOCTYPE") ||
    textPreview.includes("<html") ||
    textPreview.includes('{"error') ||
    textPreview.includes("<?xml")
  ) {
    console.error(
      "❌ Downloaded content appears to be HTML/JSON/XML, not audio:",
      textPreview.substring(0, 200)
    );
    throw new Error(
      `Downloaded file is not audio data. Content starts with: ${textPreview.substring(
        0,
        100
      )}`
    );
  }

  // Validate audio/video file signatures (magic numbers)
  const isValidAudioFile =
    // MP3: FF FB or FF F3 or FF F2 or ID3
    (uint8Array[0] === 0xff && (uint8Array[1] & 0xe0) === 0xe0) ||
    (uint8Array[0] === 0x49 &&
      uint8Array[1] === 0x44 &&
      uint8Array[2] === 0x33) || // ID3
    // WAV: RIFF....WAVE
    (uint8Array[0] === 0x52 &&
      uint8Array[1] === 0x49 &&
      uint8Array[2] === 0x46 &&
      uint8Array[3] === 0x46) ||
    // MP4/M4A: ftyp
    (uint8Array[4] === 0x66 &&
      uint8Array[5] === 0x74 &&
      uint8Array[6] === 0x79 &&
      uint8Array[7] === 0x70) ||
    // OGG: OggS
    (uint8Array[0] === 0x4f &&
      uint8Array[1] === 0x67 &&
      uint8Array[2] === 0x67 &&
      uint8Array[3] === 0x53) ||
    // FLAC: fLaC
    (uint8Array[0] === 0x66 &&
      uint8Array[1] === 0x4c &&
      uint8Array[2] === 0x61 &&
      uint8Array[3] === 0x43) ||
    // WebM: 0x1A 0x45 0xDF 0xA3
    (uint8Array[0] === 0x1a &&
      uint8Array[1] === 0x45 &&
      uint8Array[2] === 0xdf &&
      uint8Array[3] === 0xa3);

  if (!isValidAudioFile) {
    const hexPreview = Array.from(uint8Array.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    console.error(
      "❌ File signature does not match any known audio format. First 16 bytes (hex):",
      hexPreview
    );
    throw new Error(
      `Invalid audio file format. File signature: ${hexPreview}. This is not a valid audio/video file.`
    );
  }

  // Validate supported media content types
  const isValidMediaType =
    contentType.includes("audio/") ||
    contentType.includes("video/") ||
    contentType.includes("application/octet-stream") ||
    [
      "audio/wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/m4a",
      "audio/ogg",
      "audio/flac",
      "audio/aac",
      "video/mp4",
      "video/mov",
      "video/webm",
      "video/avi",
    ].some((type) => contentType.includes(type));

  if (!isValidMediaType) {
    console.warn(
      `⚠️ Unusual content type detected: ${contentType}, but file signature is valid, continuing...`
    );
  }

  // Check for minimum file size (audio files are typically larger than 10KB for real content)
  if (arrayBuffer.byteLength < 10240) {
    console.warn(
      `⚠️ File is very small (${arrayBuffer.byteLength} bytes). This might be a stub or test file.`
    );
  }

  console.log("✅ Audio file downloaded and validated:", {
    size: arrayBuffer.byteLength,
    contentType,
    isValidSignature: isValidAudioFile,
  });

  // Create blob and verify it was created correctly
  const blob = new Blob([arrayBuffer], { type: contentType });
  
  if (blob.size !== arrayBuffer.byteLength) {
    throw new Error(
      `Blob creation failed: expected ${arrayBuffer.byteLength} bytes but got ${blob.size} bytes`
    );
  }
  
  console.log("✅ Blob created successfully:", {
    size: blob.size,
    type: blob.type,
  });

  return blob;
}

/**
 * Warm up the Whisper server by sending a lightweight request
 * This helps wake up sleeping Hugging Face servers
 */
async function warmupWhisperServer(): Promise<boolean> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;

  if (!whisperUrl) {
    throw new Error(
      "WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set"
    );
  }

  console.log("🔥 Warming up Whisper server...");

  try {
    // Create a valid 1-second silent WAV file (16kHz, mono, 16-bit PCM)
    // This is large enough to pass server validation (>10KB requirement)
    const sampleRate = 16000;
    const numSamples = sampleRate; // 1 second
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const fileSize = 44 + dataSize; // WAV header is 44 bytes

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // WAV file header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, fileSize - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
    view.setUint16(32, numChannels * bytesPerSample, true); // block align
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // Fill with silence (all zeros)
    for (let i = 44; i < fileSize; i++) {
      view.setUint8(i, 0);
    }

    const warmupBlob = new Blob([buffer], { type: "audio/wav" });

    console.log(`📊 Warmup audio created: ${warmupBlob.size} bytes`);

    // Convert Blob to File for proper FormData serialization
    const warmupFile = new File([warmupBlob], "warmup.wav", { type: "audio/wav" });
    
    console.log(`📊 Warmup file created: ${warmupFile.size} bytes, name: ${warmupFile.name}`);

    const formData = new FormData();
    formData.append("file", warmupFile);

    const response = await fetch(
      `${whisperUrl}/transcribe?task=transcribe&beam_size=1`,
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(RETRY_CONFIG.WARMUP_TIMEOUT),
      }
    );

    console.log(`✅ Warmup response status: ${response.status}`);

    // Even if the response is not OK, the server is now warming up
    return response.ok;
  } catch (error: any) {
    console.log(
      "⚠️ Warmup failed (expected for sleeping server):",
      error.message
    );
    // Return false but don't throw - the server is now waking up
    return false;
  }
}

/**
 * Transcribe audio using Whisper API with intelligent retry logic
 * Supports both direct file upload and URL-based transcription (including MEGA.nz)
 */
async function transcribeWithWhisper(
  audioSource: Blob | string, // Can be a Blob (file) or string (URL)
  retryCount: number = 0,
  isWarmupRetry: boolean = false,
  requestId: string = 'unknown',
  performanceMetrics?: any
): Promise<{ text: string; language?: string }> {
  const functionStartTime = Date.now();
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;

  console.log(`\n${'~'.repeat(80)}`);
  console.log(`[${requestId}] [WHISPER] 🎯 Function called at: ${new Date().toISOString()}`);
  console.log(`[${requestId}] [WHISPER] 📊 Parameters:`, {
    audioSourceType: typeof audioSource === 'string' ? 'URL' : 'Blob',
    audioSourceSize: typeof audioSource === 'string' ? 'N/A' : `${audioSource.size} bytes`,
    retryCount,
    isWarmupRetry,
  });
  console.log(`${'~'.repeat(80)}\n`);

  if (!whisperUrl) {
    throw new Error(
      "WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set"
    );
  }

  console.log(`[${requestId}] [WHISPER] 🌐 Whisper API URL: ${whisperUrl}`);

  const isUrl = typeof audioSource === "string";

  // Build the transcribe endpoint with query parameters
  const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=1`;

  // Log the request type
  if (isUrl) {
    console.log(`[${requestId}] [WHISPER] 🔗 URL-based request (attempt ${retryCount + 1}, warmup: ${isWarmupRetry})`);
    console.log(`[${requestId}] [WHISPER] 📍 Audio URL: ${(audioSource as string).substring(0, 100)}...`);
  } else {
    // Map MIME types to file extensions for proper type detection
    const mimeToExtension: Record<string, string> = {
      "audio/wav": ".wav",
      "audio/wave": ".wav",
      "audio/x-wav": ".wav",
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/mp4": ".m4a",
      "audio/m4a": ".m4a",
      "audio/x-m4a": ".m4a",
      "audio/ogg": ".ogg",
      "audio/flac": ".flac",
      "audio/aac": ".aac",
      "audio/webm": ".webm",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/webm": ".webm",
      "application/octet-stream": ".mp3", // Default fallback
    };

    // Determine file extension based on MIME type
    const blobType = audioSource.type || "audio/mpeg";
    const extension = mimeToExtension[blobType] || ".mp3"; // Default to .mp3 if unknown
    const filename = `media_file${extension}`;

    console.log(`[${requestId}] [WHISPER] 📁 File-based request (attempt ${retryCount + 1}, warmup: ${isWarmupRetry})`);
    console.log(`[${requestId}] [WHISPER] 📊 Audio blob details:`, {
      size: audioSource.size,
      type: blobType,
      filename: filename,
    });
  }

  try {
    // Use shorter timeout for warmup retries, longer for regular processing
    const timeout = isWarmupRetry
      ? RETRY_CONFIG.WARMUP_TIMEOUT
      : RETRY_CONFIG.PROCESSING_TIMEOUT;

    console.log(`[${requestId}] [WHISPER] ⏱️  Timeout configured: ${timeout}ms (${(timeout / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}] [WHISPER] 🚀 Preparing to send request to Whisper API...`);

    // Prepare request based on source type (URL or File)
    let response: Response;

    if (isUrl) {
      // For URL-based requests, send URL as query parameter (not FormData)
      // The Whisper server expects url as Query parameter, not FormData
      const urlWithParam = `${transcribeEndpoint}&url=${encodeURIComponent(audioSource as string)}`;
      
      console.log(`[${requestId}] [WHISPER] 📤 Sending URL-based POST request...`);
      console.log(`[${requestId}] [WHISPER] 🌐 Full endpoint: ${urlWithParam.substring(0, 150)}...`);
      
      const fetchStart = Date.now();
      
      // Send POST request with URL in query parameter, no body needed
      response = await fetch(urlWithParam, {
        method: "POST",
        signal: AbortSignal.timeout(timeout),
      });
      
      const fetchDuration = Date.now() - fetchStart;
      console.log(`[${requestId}] [WHISPER] ⏱️  ⚠️  CRITICAL: HTTP Request completed in ${fetchDuration}ms (${(fetchDuration / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}] [WHISPER] 📨 Response status: ${response.status} ${response.statusText}`);
      console.log(`[${requestId}] [WHISPER] ${response.ok ? '✅' : '❌'} HTTP Request: ${response.ok ? 'SUCCESS' : 'FAILED'}`);
    } else {
      // For file-based requests, use FormData
      const audioBlob = audioSource as Blob;
      
      // Validate blob size before sending
      if (audioBlob.size < 1000) {
        throw new Error(
          `Audio blob is too small (${audioBlob.size} bytes). This indicates a corrupted or empty file.`
        );
      }
      
      console.log(`[transcribeWithWhisper] 📤 Preparing file upload:`, {
        size: audioBlob.size,
        type: audioBlob.type,
      });
      
      const formData = new FormData();
      const blobType = audioBlob.type || "audio/mpeg";
      const mimeToExtension: Record<string, string> = {
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".m4a",
        "audio/m4a": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/ogg": ".ogg",
        "audio/flac": ".flac",
        "audio/aac": ".aac",
        "audio/webm": ".webm",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
        "video/webm": ".webm",
        "application/octet-stream": ".mp3",
      };
      const extension = mimeToExtension[blobType] || ".mp3";
      const filename = `media_file${extension}`;
      
      // Convert Blob to File for better compatibility
      const file = new File([audioBlob], filename, { type: blobType });
      formData.append("file", file);
      
      console.log(`[transcribeWithWhisper] 📤 File prepared for upload:`, {
        filename,
        size: file.size,
        type: file.type,
      });
      
      const fetchStart = Date.now();
      
      // Send POST request with FormData body
      response = await fetch(transcribeEndpoint, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(timeout),
      });
      
      const fetchDuration = Date.now() - fetchStart;
      console.log(`[transcribeWithWhisper] ⏱️ ⚠️ CRITICAL: Fetch completed in ${fetchDuration}ms (${(fetchDuration / 1000).toFixed(2)}s)`);
      console.log(`[transcribeWithWhisper] 📨 Response status: ${response.status} ${response.statusText}`);
    }

    console.log(`[transcribeWithWhisper] 📨 Whisper API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      
      console.error(`[transcribeWithWhisper] ❌ Whisper API returned error status: ${response.status}`);
      console.error(`[transcribeWithWhisper] ❌ Error response: ${errorText.substring(0, 500)}`);

      // Check if it's a server wake-up issue (503, 502, 504 or connection errors)
      if (
        response.status === 503 ||
        response.status === 502 ||
        response.status === 504
      ) {
        throw new Error(
          `SERVER_SLEEPING:Whisper server is sleeping (${response.status}): ${errorText}`
        );
      }

      // 429 means rate limit, should retry with delay
      if (response.status === 429) {
        throw new Error(
          `RATE_LIMIT:Whisper API rate limit (${response.status}): ${errorText}`
        );
      }

      throw new Error(
        `Whisper API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    console.log(`[transcribeWithWhisper] 📥 Parsing JSON response...`);
    const parseStart = Date.now();
    
    // Get response text first to check if it's empty
    const responseText = await response.text();
    console.log(`[transcribeWithWhisper] 📋 Raw response length: ${responseText.length} bytes`);
    console.log(`[transcribeWithWhisper] 📋 Raw response preview (first 500 chars):`, responseText.substring(0, 500));
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("Whisper API returned empty response body");
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error(`[transcribeWithWhisper] ❌ Failed to parse JSON response`);
      console.error(`[transcribeWithWhisper] 📋 Response text:`, responseText.substring(0, 1000));
      throw new Error(`Invalid JSON response from Whisper API: ${parseError.message}`);
    }
    
    const parseDuration = Date.now() - parseStart;
    console.log(`[transcribeWithWhisper] ⏱️ JSON parsing took: ${parseDuration}ms`);
    
    // Log the full response structure for debugging
    console.log(`[transcribeWithWhisper] 📋 Full API response structure:`, JSON.stringify(result, null, 2));
    console.log(`[transcribeWithWhisper] 🔍 Response keys:`, Object.keys(result));
    
    console.log(`[transcribeWithWhisper] ✅ Whisper API response received:`, {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      language: result.language,
      responseKeys: Object.keys(result),
    });
    
    const totalDuration = Date.now() - functionStartTime;
    console.log(`[transcribeWithWhisper] ⏱️ ⚠️ CRITICAL: Total function execution time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`[transcribeWithWhisper] ========================================`);

    if (!result.text) {
      console.error(`[transcribeWithWhisper] ❌ MISSING TEXT FIELD in response`);
      console.error(`[transcribeWithWhisper] 📋 Available fields:`, Object.keys(result));
      console.error(`[transcribeWithWhisper] 📋 Full response:`, JSON.stringify(result, null, 2));
      
      // Check for alternative field names that might contain the transcription
      const possibleTextFields = ['text', 'transcription', 'transcript', 'result', 'output'];
      let foundText = null;
      
      for (const field of possibleTextFields) {
        if (result[field] && typeof result[field] === 'string' && result[field].length > 0) {
          console.log(`[transcribeWithWhisper] 💡 Found transcription in alternative field: ${field}`);
          foundText = result[field];
          break;
        }
      }
      
      if (foundText) {
        console.log(`[transcribeWithWhisper] ✅ Using alternative field for transcription`);
        return {
          text: foundText,
          language: result.language,
        };
      }
      
      throw new Error(`No transcription text received from Whisper API. Response keys: ${Object.keys(result).join(', ')}`);
    }

    return {
      text: result.text,
      language: result.language,
    };
  } catch (error: any) {
    const errorDuration = Date.now() - functionStartTime;
    console.error(`[transcribeWithWhisper] ❌ Whisper API error after ${errorDuration}ms:`, error.message);
    console.error(`[transcribeWithWhisper] ❌ Error name: ${error.name}`);
    console.error(`[transcribeWithWhisper] ❌ Error stack:`, error.stack);

    // Check for timeout or connection errors (server sleeping)
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.includes("timeout") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("UND_ERR_HEADERS_TIMEOUT") ||
      error.message.includes("fetch failed") ||
      error.message.includes("SERVER_SLEEPING")
    ) {
      throw new Error(`SERVER_SLEEPING:${error.message}`);
    }

    // Check for rate limit
    if (error.message.includes("RATE_LIMIT")) {
      throw new Error(`RATE_LIMIT:${error.message}`);
    }

    throw error;
  }
}

async function queueNextStep(
  queueId: number,
  attachmentId: number,
  userId: string,
  transcriptionText: string
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://studify-platform.vercel.app";
  const embedEndpoint = `${baseUrl}/api/video-processing/steps/embed`;

  console.log("Queueing embedding step for queue:", queueId);

  try {
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = userId.replace(/-/g, "").substring(0, 12);
    const queueName = `video_${userIdHash}`;

    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);

    // Enqueue the next step
    const qstashResponse = await queueManager.enqueue(
      queueName,
      embedEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        transcription_text: transcriptionText,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 3, // Queue timing managed by QStash internally
      }
    );

    console.log("Embedding job queued:", qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error("Failed to queue embedding:", error);
    throw error;
  }
}

async function scheduleRetry(
  queueId: number,
  attachmentId: number,
  userId: string,
  audioUrl: string,
  retryCount: number,
  isWarmupRetry: boolean = false
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://studify-platform.vercel.app";
  const transcribeEndpoint = `${baseUrl}/api/video-processing/steps/transcribe`;

  // Use configured delays or exponential backoff
  const delaySeconds = isWarmupRetry
    ? 10 // 10秒后重试（服务器预热后）
    : RETRY_CONFIG.RETRY_DELAYS[retryCount - 1] ||
      RETRY_CONFIG.RETRY_DELAYS[RETRY_CONFIG.RETRY_DELAYS.length - 1];

  console.log(
    `⏰ Scheduling transcription retry ${retryCount} in ${delaySeconds} seconds for queue:`,
    queueId
  );

  try {
    const queueManager = getQueueManager();
    // Use consistent queue naming
    const userIdHash = userId.replace(/-/g, "").substring(0, 12);
    const queueName = `video_${userIdHash}`;

    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);

    // Enqueue the retry
    const qstashResponse = await queueManager.enqueue(
      queueName,
      transcribeEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        audio_url: audioUrl,
        retry_count: retryCount,
        is_warmup_retry: isWarmupRetry,
        timestamp: new Date().toISOString(),
      },
      {
        retries: 0, // Manual retry scheduling, no additional retries
      }
    );

    console.log(
      `🔄 Transcription retry ${retryCount} scheduled:`,
      qstashResponse.messageId
    );
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error("Failed to schedule transcription retry:", error);
    throw error;
  }
}

async function handler(req: Request) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Declare variables outside try block for catch block access
  let queue_id: number | undefined;
  let attachment_id: number | undefined;
  
  // Performance tracking object
  const performanceMetrics = {
    requestId,
    startTime: new Date().toISOString(),
    vercel: {
      region: process.env.VERCEL_REGION || 'unknown',
      environment: process.env.NODE_ENV,
      totalExecutionTime: 0,
    },
    supabase: {
      operations: [] as Array<{name: string, duration: number, success: boolean}>,
      totalTime: 0,
      errorCount: 0,
    },
    whisper: {
      serverUrl: process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL || 'not_set',
      warmupTime: 0,
      processingTime: 0,
      totalTime: 0,
      errorCount: 0,
      serverStatus: 'unknown' as 'sleeping' | 'active' | 'error' | 'unknown',
    },
    network: {
      downloadTime: 0,
      downloadSize: 0,
      uploadTime: 0,
    },
    breakdown: [] as Array<{step: string, duration: number, percentage: number}>,
    // TASK 3.7: Timeout tracking metrics
    timeout: {
      timeoutRisk: false,
      timeRemaining: 0,
      earlyResponseTriggered: false,
      duplicateDetected: false,
      timeoutRecoveryAttempted: false,
    },
  };
  
  // TASK 3.6: Database Optimization Strategy
  // - Batch updates using Promise.all to reduce round trips
  // - Add timing logs for all database operations
  // - Log warnings for slow queries (>1000ms)
  // - Use RPC functions for complex operations (already implemented)
  // - Track all operations in performanceMetrics for analysis
  
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${requestId}] 🎬 TRANSCRIPTION REQUEST STARTED`);
    console.log(`[${requestId}] ⏰ Start Time: ${performanceMetrics.startTime}`);
    console.log(`[${requestId}] 🌍 Environment: ${performanceMetrics.vercel.environment}`);
    console.log(`[${requestId}] 🔧 Vercel Region: ${performanceMetrics.vercel.region}`);
    console.log(`[${requestId}] 🌐 Whisper Server: ${performanceMetrics.whisper.serverUrl}`);
    console.log(`${'='.repeat(80)}\n`);

    // Parse and validate the QStash job payload
    const body = await req.json();
    console.log(`[${requestId}] 📦 Request body received:`, JSON.stringify(body, null, 2));
    
    const validation = TranscribeJobSchema.safeParse(body);

    if (!validation.success) {
      console.error(`[${requestId}] ❌ VALIDATION FAILED:`, validation.error.errors);
      return NextResponse.json(
        {
          error: "Invalid job payload",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      queue_id: queueIdValue,
      attachment_id: attachmentIdValue,
      user_id,
      audio_url,
      timestamp,
      retry_count,
      is_warmup_retry,
    } = validation.data;
    
    // Assign to outer scope variables for catch block access
    queue_id = queueIdValue;
    attachment_id = attachmentIdValue;
    
    console.log(`[${requestId}] ✅ Validation passed`);
    console.log(`[${requestId}] 📋 Job Details:`, {
      queue_id,
      attachment_id,
      user_id,
      audio_url_length: audio_url.length,
      audio_url_preview: audio_url.substring(0, 100) + '...',
      timestamp,
      retry_count,
      is_warmup_retry,
    });
    
    const client = await createServerClient();
    console.log(`[${requestId}] 🔌 Supabase client created`);

    // 1. Get current queue status and retry count
    console.log(`[${requestId}] 🗄️  SUPABASE: Fetching queue record...`);
    const dbQueryStart = Date.now();
    
    const { data: queueData, error: queueError } = await client
      .from("video_processing_queue")
      .select("retry_count, max_retries, status")
      .eq("id", queue_id);

    const dbQueryDuration = Date.now() - dbQueryStart;
    performanceMetrics.supabase.operations.push({
      name: 'fetch_queue_record',
      duration: dbQueryDuration,
      success: !queueError,
    });
    performanceMetrics.supabase.totalTime += dbQueryDuration;
    
    console.log(`[${requestId}] ⏱️  SUPABASE: Query completed in ${dbQueryDuration}ms`);
    if (dbQueryDuration > 1000) {
      console.warn(`[${requestId}] 🚨 SLOW QUERY WARNING: Queue fetch took ${dbQueryDuration}ms (>1000ms threshold)`);
    }
    console.log(`[${requestId}] ${queueError ? '❌' : '✅'} SUPABASE: ${queueError ? 'FAILED' : 'SUCCESS'}`);

    if (queueError) {
      performanceMetrics.supabase.errorCount++;
      console.error(`[${requestId}] ❌ SUPABASE ERROR:`, queueError);
      throw new Error(`Database error fetching queue: ${queueError.message}`);
    }

    if (!queueData || queueData.length === 0) {
      console.warn(`[${requestId}] ⚠️ ORPHANED MESSAGE DETECTED`);
      console.warn(`[${requestId}] Queue ID ${queue_id} not found in database`);
      console.warn(`[${requestId}] This is likely a QStash message for a deleted queue`);

      // Return success to prevent QStash from retrying this orphaned message
      return NextResponse.json(
        {
          message: "Queue record not found - orphaned QStash message",
          queue_id,
          action: "skipped",
          reason: "Queue record may have been deleted or never existed",
        },
        { status: 200 }
      );
    }

    console.log(`[${requestId}] ✅ Queue record found:`, queueData[0]);

    if (queueData.length > 1) {
      console.warn(`[${requestId}] ⚠️ Multiple queue entries found (${queueData.length}), using first one`);
    }

    const queueRecord = Array.isArray(queueData) ? queueData[0] : queueData;

    // TASK 3.3: Check for existing transcription on retry requests
    if (retry_count > 0) {
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`[${requestId}] 🔍 DUPLICATE DETECTION: Retry request detected (retry_count: ${retry_count})`);
      console.log(`[${requestId}] 🔍 Checking for existing completed transcription...`);
      console.log(`${'-'.repeat(80)}`);
      
      const duplicateCheckStart = Date.now();
      
      const { data: existingStep, error: stepError } = await client
        .from("video_processing_steps")
        .select("output_data")
        .eq("queue_id", queue_id)
        .eq("step_name", "transcribe")
        .eq("status", "completed")
        .single();
      
      const duplicateCheckDuration = Date.now() - duplicateCheckStart;
      performanceMetrics.supabase.operations.push({
        name: 'duplicate_detection_check',
        duration: duplicateCheckDuration,
        success: !stepError,
      });
      performanceMetrics.supabase.totalTime += duplicateCheckDuration;
      
      console.log(`[${requestId}] ⏱️  DUPLICATE CHECK: Query completed in ${duplicateCheckDuration}ms`);
      if (duplicateCheckDuration > 1000) {
        console.warn(`[${requestId}] 🚨 SLOW QUERY WARNING: Duplicate check took ${duplicateCheckDuration}ms (>1000ms threshold)`);
      }
      
      if (existingStep && existingStep.output_data) {
        const transcriptionText = existingStep.output_data.transcription_text;
        const language = existingStep.output_data.language;
        
        // TASK 3.7: Mark duplicate detection in metrics
        performanceMetrics.timeout.duplicateDetected = true;
        
        console.log(`[${requestId}] ✅ DUPLICATE DETECTED: Existing transcription found!`);
        console.log(`[${requestId}] 📝 Transcription details:`, {
          text_length: transcriptionText?.length || 0,
          language: language,
          queue_id,
          retry_count,
        });
        console.log(`[${requestId}] 💡 Skipping Whisper API call - returning existing transcription`);
        console.log(`[${requestId}] 🚀 Avoiding duplicate processing and saving resources`);
        console.log(`${'-'.repeat(80)}\n`);
        
        const totalExecutionTime = Date.now() - startTime;
        performanceMetrics.vercel.totalExecutionTime = totalExecutionTime;
        performanceMetrics.timeout.timeRemaining = getRemainingTime(startTime);
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`[${requestId}] ✅ DUPLICATE DETECTION SUCCESS - RETURNING EXISTING TRANSCRIPTION`);
        console.log(`${'='.repeat(80)}`);
        console.log(`[${requestId}] ⏰ Total execution time: ${totalExecutionTime}ms (${(totalExecutionTime / 1000).toFixed(2)}s)`);
        console.log(`[${requestId}] 📝 Transcription: ${transcriptionText?.length || 0} characters`);
        console.log(`[${requestId}] 🌍 Language: ${language}`);
        console.log(`[${requestId}] 🔄 Retry count: ${retry_count}`);
        console.log(`[${requestId}] 💰 Resources saved: Avoided duplicate Whisper API call (~90s processing time)`);
        console.log(`[${requestId}] 📊 TIMEOUT METRICS:`);
        console.log(`[${requestId}]    Duplicate detected: ${performanceMetrics.timeout.duplicateDetected}`);
        console.log(`[${requestId}]    Time remaining: ${(performanceMetrics.timeout.timeRemaining / 1000).toFixed(2)}s`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Return HTTP 200 immediately with existing transcription
        return NextResponse.json(
          {
            message: "Transcription already completed (duplicate retry avoided)",
            data: {
              queue_id,
              attachment_id,
              step: "transcribe",
              status: "completed",
              output: {
                text: transcriptionText,
                language: language,
                text_length: transcriptionText?.length || 0,
              },
              retry_count,
              duplicate_detected: true,
              completedAt: new Date().toISOString(),
            },
            performance_metrics: {
              total_execution_time_ms: totalExecutionTime,
              timeout_metrics: performanceMetrics.timeout,
            },
          },
          { status: 200 }
        );
      } else {
        console.log(`[${requestId}] ℹ️  DUPLICATE CHECK: No existing transcription found`);
        console.log(`[${requestId}] 💡 This is a legitimate retry - proceeding with transcription`);
        console.log(`${'-'.repeat(80)}\n`);
      }
    }

    // 2. Update step status and queue status (OPTIMIZED: Batched updates using Promise.all)
    console.log(`[${requestId}] 🗄️  SUPABASE: Updating step and queue status (batched)...`);
    const batchUpdateStart = Date.now();
    
    // Execute both updates in parallel to reduce round trips
    const [stepUpdateResult, queueUpdateResult] = await Promise.all([
      client
        .from("video_processing_steps")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
          retry_count: retry_count,
        })
        .eq("queue_id", queue_id)
        .eq("step_name", "transcribe"),
      
      client
        .from("video_processing_queue")
        .update({
          status: "processing",
          current_step: "transcribe",
          progress_percentage: 65,
          retry_count: retry_count,
        })
        .eq("id", queue_id)
    ]);

    const batchUpdateDuration = Date.now() - batchUpdateStart;
    performanceMetrics.supabase.operations.push({
      name: 'batch_update_step_and_queue',
      duration: batchUpdateDuration,
      success: !stepUpdateResult.error && !queueUpdateResult.error,
    });
    performanceMetrics.supabase.totalTime += batchUpdateDuration;
    
    console.log(`[${requestId}] ⏱️  SUPABASE: Batch update took ${batchUpdateDuration}ms`);
    if (batchUpdateDuration > 1000) {
      console.warn(`[${requestId}] 🚨 SLOW QUERY WARNING: Batch update took ${batchUpdateDuration}ms (>1000ms threshold)`);
    }
    console.log(`[${requestId}] 📊 SUPABASE TOTAL: ${performanceMetrics.supabase.totalTime}ms (${performanceMetrics.supabase.operations.length} operations)`);
    
    // Track timeout status after initial database operations
    const elapsedAfterDb = Date.now() - startTime;
    const remainingAfterDb = getRemainingTime(startTime);
    console.log(`[${requestId}] ⏰ Elapsed time after DB operations: ${elapsedAfterDb}ms (${(elapsedAfterDb / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}] ⏰ Remaining time: ${remainingAfterDb}ms (${(remainingAfterDb / 1000).toFixed(2)}s)`);
    
    if (isApproachingTimeout(startTime)) {
      console.warn(`[${requestId}] 🚨 WARNING: Already approaching timeout before Whisper call!`);
      console.warn(`[${requestId}] ⏰ Elapsed: ${(elapsedAfterDb / 1000).toFixed(2)}s / ${(TIMEOUT_THRESHOLD / 1000).toFixed(2)}s threshold`);
    }
    
    console.log(`[${requestId}] ⏰ Elapsed time so far: ${Date.now() - startTime}ms`);

    // 4. Determine if we should use URL-based or file-based transcription
    // The Whisper server only supports direct URL processing for MEGA.nz URLs
    // For other URLs, we need to download and send as file
    const isHttpUrl =
      audio_url.startsWith("http://") || audio_url.startsWith("https://");
    const isMegaUrl = audio_url.includes("mega.nz") || audio_url.includes("mega.co.nz");
    const shouldUseUrlMode = isMegaUrl; // Only use URL mode for MEGA.nz URLs

    console.log(`[${requestId}] 🔍 Transcription mode detection:`, {
      audio_url_preview: audio_url.substring(0, 100),
      isHttpUrl,
      isMegaUrl,
      shouldUseUrlMode,
      mode: shouldUseUrlMode
        ? "URL-based (MEGA.nz direct to Whisper)"
        : "File-based (download first)",
    });

    let audioSource: Blob | string;

    if (shouldUseUrlMode) {
      console.log(`[${requestId}] 🔗 Using URL-based transcription`);
      console.log(`[${requestId}] 📍 Whisper will download directly from: ${audio_url.substring(0, 100)}...`);
      audioSource = audio_url;
    } else {
      // Download audio file for non-HTTP URLs (edge case, probably won't happen)
      try {
        console.log(`[${requestId}] 🌐 NETWORK: Starting audio file download...`);
        console.log(`[${requestId}] 🌐 Download URL: ${audio_url.substring(0, 100)}...`);
        const downloadStart = Date.now();
        
        audioSource = await downloadAudioFile(audio_url);
        
        const downloadDuration = Date.now() - downloadStart;
        performanceMetrics.network.downloadTime = downloadDuration;
        performanceMetrics.network.downloadSize = audioSource.size;
        
        console.log(`[${requestId}] ⏱️  NETWORK: Download completed in ${downloadDuration}ms`);
        console.log(`[${requestId}] 📊 NETWORK: File size ${audioSource.size} bytes (${(audioSource.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`[${requestId}] 📊 NETWORK: Download speed ${((audioSource.size / 1024 / 1024) / (downloadDuration / 1000)).toFixed(2)} MB/s`);
        console.log(`[${requestId}] ${downloadDuration > 60000 ? '❌' : downloadDuration > 30000 ? '⚠️' : '✅'} NETWORK: ${downloadDuration > 60000 ? 'TOO SLOW' : downloadDuration > 30000 ? 'SLOW' : 'GOOD SPEED'}`);
        
        // Track timeout status after download
        const elapsedAfterDownload = Date.now() - startTime;
        const remainingAfterDownload = getRemainingTime(startTime);
        console.log(`[${requestId}] ⏰ Elapsed time after download: ${elapsedAfterDownload}ms (${(elapsedAfterDownload / 1000).toFixed(2)}s)`);
        console.log(`[${requestId}] ⏰ Remaining time: ${remainingAfterDownload}ms (${(remainingAfterDownload / 1000).toFixed(2)}s)`);
        
        if (isApproachingTimeout(startTime)) {
          console.warn(`[${requestId}] 🚨 WARNING: Approaching timeout after download!`);
          console.warn(`[${requestId}] ⏰ Elapsed: ${(elapsedAfterDownload / 1000).toFixed(2)}s / ${(TIMEOUT_THRESHOLD / 1000).toFixed(2)}s threshold`);
        }
        
        console.log(`[${requestId}] ⏰ Elapsed time so far: ${Date.now() - startTime}ms`);
        
        // Validate the downloaded blob
        if (audioSource.size < 1000) {
          throw new Error(
            `Downloaded audio file is too small (${audioSource.size} bytes). This indicates a corrupted or empty file.`
          );
        }
        
        console.log(`[${requestId}] ✅ NETWORK: Audio file validated`);
      } catch (downloadError: any) {
        console.error(`[${requestId}] ❌ NETWORK DOWNLOAD FAILED`);
        console.error(`[${requestId}] Error: ${downloadError.message}`);
        console.error(`[${requestId}] Stack:`, downloadError.stack);

        const failureRpcStart = Date.now();
        
        await client.rpc("handle_step_failure", {
          queue_id_param: queue_id,
          step_name_param: "transcribe",
          error_message_param: `Audio download failed: ${downloadError.message}`,
          error_details_param: {
            step: "download",
            error: downloadError.message,
            elapsed_time_ms: Date.now() - startTime,
            service: 'network',
          },
        });
        
        const failureRpcDuration = Date.now() - failureRpcStart;
        performanceMetrics.supabase.operations.push({
          name: 'handle_step_failure_download',
          duration: failureRpcDuration,
          success: true,
        });
        performanceMetrics.supabase.totalTime += failureRpcDuration;
        
        console.log(`[${requestId}] ⏱️  Failure RPC took ${failureRpcDuration}ms`);
        if (failureRpcDuration > 1000) {
          console.warn(`[${requestId}] 🚨 SLOW QUERY WARNING: Failure RPC took ${failureRpcDuration}ms (>1000ms threshold)`);
        }

        return NextResponse.json(
          {
            error: "Failed to download audio file",
            details: downloadError.message,
            retryable: true,
            service: 'network',
          },
          { status: 500 }
        );
      }
    }

    // 5. Trigger Whisper API (fire-and-forget - Whisper will handle embedding directly)
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`[${requestId}] 🎤 WHISPER: Triggering transcription (async mode)...`);
    console.log(`[${requestId}] 🔧 Retry count: ${retry_count}, Is warmup retry: ${is_warmup_retry}`);
    console.log(`[${requestId}] 💡 NOTE: Whisper will process and send to embedding server directly`);
    console.log(`${'-'.repeat(80)}\n`);
    
    try {
      // Trigger Whisper API without waiting for response
      const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
      
      if (!whisperUrl) {
        throw new Error(
          "WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set"
        );
      }

      console.log(`[${requestId}] 🌐 Whisper API URL: ${whisperUrl}`);
      console.log(`[${requestId}] 📊 Audio source type: ${typeof audioSource === 'string' ? 'URL' : 'Blob'}`);
      
      const isUrl = typeof audioSource === "string";
      const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=1`;
      
      // Prepare the request based on source type
      let fetchPromise: Promise<Response>;
      
      if (isUrl) {
        // For URL-based requests, send URL as query parameter
        const urlWithParam = `${transcribeEndpoint}&url=${encodeURIComponent(audioSource as string)}`;
        
        console.log(`[${requestId}] 📤 Triggering URL-based transcription...`);
        console.log(`[${requestId}] 🌐 Audio URL: ${(audioSource as string).substring(0, 100)}...`);
        
        // Fire-and-forget: trigger the request but don't wait for response
        fetchPromise = fetch(urlWithParam, {
          method: "POST",
          signal: AbortSignal.timeout(600000), // 10 minute timeout
        });
      } else {
        // For file-based requests, use FormData
        const audioBlob = audioSource as Blob;
        
        console.log(`[${requestId}] 📤 Triggering file-based transcription...`);
        console.log(`[${requestId}] 📊 File size: ${audioBlob.size} bytes`);
        
        const formData = new FormData();
        const blobType = audioBlob.type || "audio/mpeg";
        const mimeToExtension: Record<string, string> = {
          "audio/wav": ".wav",
          "audio/wave": ".wav",
          "audio/x-wav": ".wav",
          "audio/mpeg": ".mp3",
          "audio/mp3": ".mp3",
          "audio/mp4": ".m4a",
          "audio/m4a": ".m4a",
          "audio/x-m4a": ".m4a",
          "audio/ogg": ".ogg",
          "audio/flac": ".flac",
          "audio/aac": ".aac",
          "audio/webm": ".webm",
          "video/mp4": ".mp4",
          "video/quicktime": ".mov",
          "video/x-msvideo": ".avi",
          "video/webm": ".webm",
          "application/octet-stream": ".mp3",
        };
        const extension = mimeToExtension[blobType] || ".mp3";
        const filename = `media_file${extension}`;
        
        const file = new File([audioBlob], filename, { type: blobType });
        formData.append("file", file);
        
        // Fire-and-forget: trigger the request but don't wait for response
        fetchPromise = fetch(transcribeEndpoint, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(600000), // 10 minute timeout
        });
      }
      
      // Trigger the request in the background (don't await)
      fetchPromise
        .then((response) => {
          console.log(`[${requestId}] ✅ WHISPER: Request accepted by server (status: ${response.status})`);
          if (!response.ok) {
            console.error(`[${requestId}] ⚠️  WHISPER: Server returned error status: ${response.status}`);
          }
        })
        .catch((error) => {
          console.error(`[${requestId}] ❌ WHISPER: Request failed:`, error.message);
        });
      
      console.log(`[${requestId}] ✅ WHISPER: Transcription request triggered successfully`);
      console.log(`[${requestId}] 💡 Whisper will process and send results to embedding server directly`);
      console.log(`[${requestId}] 🚀 Returning HTTP 200 immediately to QStash`);
      
      
      const totalExecutionTime = Date.now() - startTime;
      const whisperTriggerDuration = Date.now() - startTime; // Time to trigger Whisper
      performanceMetrics.vercel.totalExecutionTime = totalExecutionTime;
      performanceMetrics.whisper.processingTime = whisperTriggerDuration;
      performanceMetrics.whisper.totalTime = whisperTriggerDuration;
      
      // Calculate breakdown percentages
      performanceMetrics.breakdown = [
        { step: 'Supabase Operations', duration: performanceMetrics.supabase.totalTime, percentage: (performanceMetrics.supabase.totalTime / totalExecutionTime * 100) },
        { step: 'Network Download', duration: performanceMetrics.network.downloadTime, percentage: (performanceMetrics.network.downloadTime / totalExecutionTime * 100) },
        { step: 'Whisper Trigger', duration: performanceMetrics.whisper.totalTime, percentage: (performanceMetrics.whisper.totalTime / totalExecutionTime * 100) },
      ].filter(item => item.duration > 0).sort((a, b) => b.duration - a.duration);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`[${requestId}] ✅ TRANSCRIPTION REQUEST ACCEPTED`);
      console.log(`${'='.repeat(80)}`);
      console.log(`[${requestId}] ⏰ Total execution time: ${totalExecutionTime}ms (${(totalExecutionTime / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}] 🎤 Whisper: Processing in background (async mode)`);
      console.log(`[${requestId}] 💡 Whisper will send results to embedding server directly`);
      console.log(`[${requestId}] 🚀 Returning HTTP 200 to QStash immediately`);
      console.log(`${'-'.repeat(80)}`);
      console.log(`[${requestId}] 📊 PERFORMANCE METRICS:`);
      console.log(`[${requestId}]    Supabase: ${performanceMetrics.supabase.totalTime}ms (${(performanceMetrics.supabase.totalTime / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}]    Whisper Trigger: ${performanceMetrics.whisper.totalTime}ms (${(performanceMetrics.whisper.totalTime / 1000).toFixed(2)}s)`);
      if (performanceMetrics.network.downloadTime > 0) {
        console.log(`[${requestId}]    Network: ${performanceMetrics.network.downloadTime}ms (${(performanceMetrics.network.downloadTime / 1000).toFixed(2)}s)`);
      }
      console.log(`${'='.repeat(80)}\n`);
      
      // Return HTTP 200 immediately
      return NextResponse.json(
        {
          message: "Transcription request accepted - processing in background",
          data: {
            queue_id,
            attachment_id,
            step: "transcribe",
            status: "processing",
            mode: "async",
            retry_count,
            note: "Whisper will process and send results to embedding server directly",
            acceptedAt: new Date().toISOString(),
          },
          performance_metrics: {
            total_execution_time_ms: totalExecutionTime,
            total_execution_time_s: (totalExecutionTime / 1000).toFixed(2),
            supabase_time_ms: performanceMetrics.supabase.totalTime,
            whisper_trigger_time_ms: performanceMetrics.whisper.totalTime,
            network_time_ms: performanceMetrics.network.downloadTime,
            breakdown: performanceMetrics.breakdown,
          },
        },
        { status: 200 }
      );
      
    } catch (whisperError: any) {
      const errorTime = Date.now() - startTime;
      performanceMetrics.whisper.errorCount++;
      
      console.error(`\n${'='.repeat(80)}`);
      console.error(`[${requestId}] ❌ WHISPER TRIGGER FAILED`);
      console.error(`[${requestId}] ⏰ Failed after: ${errorTime}ms (${(errorTime / 1000).toFixed(2)}s)`);
      console.error(`[${requestId}] Error type: ${whisperError.name}`);
      console.error(`[${requestId}] Error message: ${whisperError.message}`);
      console.error(`[${requestId}] Stack:`, whisperError.stack);
      console.error(`${'='.repeat(80)}\n`);

      // Mark step as failed
      console.log(`[${requestId}] 🗄️  Marking step as failed in database...`);
      await client.rpc("handle_step_failure", {
        queue_id_param: queue_id,
        step_name_param: "transcribe",
        error_message_param: `Failed to trigger Whisper API: ${whisperError.message}`,
        error_details_param: {
          step: "whisper_trigger",
          error: whisperError.message,
          retry_count,
          elapsed_time_ms: errorTime,
        },
      });
      console.log(`[${requestId}] ✅ Step marked as failed`);

      console.log(`\n${'!'.repeat(80)}`);
      console.log(`[${requestId}] ❌ WHISPER TRIGGER FAILED`);
      console.log(`[${requestId}] Returning 500 error to client`);
      console.log(`${'!'.repeat(80)}\n`);

      return NextResponse.json(
        {
          error: "Failed to trigger Whisper API",
          details: whisperError.message,
          queue_id,
          attachment_id,
          retry_count,
          retryable: true,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const errorExecutionTime = Date.now() - startTime;
    performanceMetrics.vercel.totalExecutionTime = errorExecutionTime;
    
    console.error(`\n${'='.repeat(80)}`);
    console.error(`[${requestId}] ❌ UNEXPECTED ERROR IN TRANSCRIPTION`);
    console.error(`${'='.repeat(80)}`);
    console.error(`[${requestId}] ⏰ VERCEL: Failed after ${errorExecutionTime}ms (${(errorExecutionTime / 1000).toFixed(2)}s)`);
    console.error(`[${requestId}] Error name: ${error.name}`);
    console.error(`[${requestId}] Error message: ${error.message}`);
    console.error(`${'-'.repeat(80)}`);
    console.error(`[${requestId}] 📊 PERFORMANCE SUMMARY AT FAILURE:`);
    console.error(`[${requestId}]    Supabase: ${performanceMetrics.supabase.totalTime}ms (${performanceMetrics.supabase.errorCount} errors)`);
    console.error(`[${requestId}]    Network: ${performanceMetrics.network.downloadTime}ms`);
    console.error(`[${requestId}]    Whisper: ${performanceMetrics.whisper.totalTime}ms (${performanceMetrics.whisper.errorCount} errors)`);
    console.error(`${'-'.repeat(80)}`);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    console.error(`${'='.repeat(80)}\n`);

    // TASK 3.5: Timeout recovery logic
    // Check if error is timeout-related
    const isTimeoutError = 
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      (error.message && error.message.toLowerCase().includes("timeout"));
    
    if (isTimeoutError) {
      // TASK 3.7: Mark timeout recovery attempt in metrics
      performanceMetrics.timeout.timeoutRecoveryAttempted = true;
      
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`[${requestId}] 🔍 TIMEOUT RECOVERY: Timeout error detected`);
      console.log(`[${requestId}] 💡 Attempting to retrieve completed transcription from database...`);
      console.log(`${'-'.repeat(80)}`);
      
      try {
        const client = await createServerClient();
        
        // Attempt to retrieve completed transcription from database
        const recoveryStart = Date.now();
        const { data: existingStep, error: stepError } = await client
          .from("video_processing_steps")
          .select("output_data")
          .eq("queue_id", queue_id)
          .eq("step_name", "transcribe")
          .eq("status", "completed")
          .single();
        
        const recoveryDuration = Date.now() - recoveryStart;
        
        console.log(`[${requestId}] ⏱️  Timeout recovery query took ${recoveryDuration}ms`);
        if (recoveryDuration > 1000) {
          console.warn(`[${requestId}] 🚨 SLOW QUERY WARNING: Timeout recovery took ${recoveryDuration}ms (>1000ms threshold)`);
        }
        
        if (existingStep && existingStep.output_data && !stepError) {
          const transcriptionText = existingStep.output_data.transcription_text;
          const language = existingStep.output_data.language;
          
          console.log(`[${requestId}] ✅ TIMEOUT RECOVERY SUCCESS: Found completed transcription!`);
          console.log(`[${requestId}] 📝 Transcription details:`, {
            text_length: transcriptionText?.length || 0,
            language: language,
            queue_id,
            recovery_time_ms: recoveryDuration,
          });
          console.log(`[${requestId}] 💡 Returning HTTP 200 with recovered transcription`);
          console.log(`${'-'.repeat(80)}\n`);
          
          // Return HTTP 200 with recovered transcription
          return NextResponse.json(
            {
              message: "Transcription recovered after timeout",
              data: {
                queue_id,
                attachment_id,
                step: "transcribe",
                status: "completed",
                output: {
                  text: transcriptionText,
                  language: language,
                  text_length: transcriptionText?.length || 0,
                },
                timeout_recovery: true,
                recovery_time_ms: recoveryDuration,
                completedAt: new Date().toISOString(),
              },
              performance_metrics: {
                total_execution_time_ms: errorExecutionTime,
                recovery_time_ms: recoveryDuration,
                timeout_recovery_attempted: true,
                timeout_recovery_successful: true,
                timeout_metrics: performanceMetrics.timeout,
              },
            },
            { status: 200 }
          );
        } else {
          console.log(`[${requestId}] ⚠️  TIMEOUT RECOVERY: No completed transcription found in database`);
          console.log(`[${requestId}] 💡 Transcription may not have completed before timeout`);
          console.log(`[${requestId}] 📊 Recovery query took: ${recoveryDuration}ms`);
          if (stepError) {
            console.error(`[${requestId}] ❌ Database error during recovery:`, stepError);
          }
          console.log(`${'-'.repeat(80)}\n`);
        }
      } catch (recoveryError: any) {
        console.error(`[${requestId}] ❌ TIMEOUT RECOVERY FAILED: Error during database query`);
        console.error(`[${requestId}] Recovery error:`, recoveryError.message);
        console.error(`${'-'.repeat(80)}\n`);
      }
      
      // If recovery failed or no transcription found, return HTTP 504
      console.error(`[${requestId}] ❌ TIMEOUT: Returning HTTP 504 (Gateway Timeout)`);
      return NextResponse.json(
        {
          error: "Gateway Timeout",
          details: "Request timed out and no completed transcription was found",
          timeout_recovery_attempted: true,
          timeout_recovery_successful: false,
          execution_time_ms: errorExecutionTime,
          performance_metrics: {
            supabase_time: performanceMetrics.supabase.totalTime,
            network_time: performanceMetrics.network.downloadTime,
            whisper_time: performanceMetrics.whisper.totalTime,
            supabase_errors: performanceMetrics.supabase.errorCount,
            whisper_errors: performanceMetrics.whisper.errorCount,
            timeout_metrics: performanceMetrics.timeout,
          },
        },
        { status: 504 }
      );
    }

    // Non-timeout errors: return HTTP 500 as before
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        retryable: true,
        execution_time_ms: errorExecutionTime,
        performance_metrics: {
          supabase_time: performanceMetrics.supabase.totalTime,
          network_time: performanceMetrics.network.downloadTime,
          whisper_time: performanceMetrics.whisper.totalTime,
          supabase_errors: performanceMetrics.supabase.errorCount,
          whisper_errors: performanceMetrics.whisper.errorCount,
          timeout_metrics: performanceMetrics.timeout,
        },
      },
      { status: 500 }
    );
  }
}

// Export the handler directly (QStash signature verification handled in utils)
export const POST = handler;
