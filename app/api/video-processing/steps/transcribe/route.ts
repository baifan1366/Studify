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
  MAX_RETRIES: 3, // Limited to 3 by QStash quota
  WARMUP_TIMEOUT: 45000, // 增加到45秒预热超时
  PROCESSING_TIMEOUT: 600000, // 10分钟处理超时
  COLD_START_WAIT: 2000, // 减少到2秒等待时间
  RETRY_DELAYS: [15, 30, 60], // 更快的重试: 15s, 30s, 1m
};

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

    const formData = new FormData();
    formData.append("file", warmupBlob, "warmup.wav");

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
  const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=5`;

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
    
    const result = await response.json();
    
    const parseDuration = Date.now() - parseStart;
    console.log(`[transcribeWithWhisper] ⏱️ JSON parsing took: ${parseDuration}ms`);
    console.log(`[transcribeWithWhisper] ✅ Whisper API response received:`, {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      language: result.language,
    });
    
    const totalDuration = Date.now() - functionStartTime;
    console.log(`[transcribeWithWhisper] ⏱️ ⚠️ CRITICAL: Total function execution time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`[transcribeWithWhisper] ========================================`);

    if (!result.text) {
      throw new Error("No transcription text received from Whisper API");
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
  };
  
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
      queue_id,
      attachment_id,
      user_id,
      audio_url,
      timestamp,
      retry_count,
      is_warmup_retry,
    } = validation.data;
    
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

    // 2. Update step status to processing
    console.log(`[${requestId}] 🗄️  SUPABASE: Updating step status...`);
    const updateStepStart = Date.now();
    
    await client
      .from("video_processing_steps")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        retry_count: retry_count,
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "transcribe");

    const updateStepDuration = Date.now() - updateStepStart;
    performanceMetrics.supabase.operations.push({
      name: 'update_step_status',
      duration: updateStepDuration,
      success: true,
    });
    performanceMetrics.supabase.totalTime += updateStepDuration;
    
    console.log(`[${requestId}] ⏱️  SUPABASE: Step update took ${updateStepDuration}ms`);

    // Update queue status
    console.log(`[${requestId}] 🗄️  SUPABASE: Updating queue status...`);
    const updateQueueStart = Date.now();
    
    await client
      .from("video_processing_queue")
      .update({
        status: "processing",
        current_step: "transcribe",
        progress_percentage: 65,
        retry_count: retry_count,
      })
      .eq("id", queue_id);

    const updateQueueDuration = Date.now() - updateQueueStart;
    performanceMetrics.supabase.operations.push({
      name: 'update_queue_status',
      duration: updateQueueDuration,
      success: true,
    });
    performanceMetrics.supabase.totalTime += updateQueueDuration;
    
    console.log(`[${requestId}] ⏱️  SUPABASE: Queue update took ${updateQueueDuration}ms`);
    console.log(`[${requestId}] 📊 SUPABASE TOTAL: ${performanceMetrics.supabase.totalTime}ms (${performanceMetrics.supabase.operations.length} operations)`);
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

    // 5. Transcribe with Whisper API (with intelligent retry logic)
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`[${requestId}] 🎤 WHISPER: Starting transcription...`);
    console.log(`[${requestId}] 🔧 Retry count: ${retry_count}, Is warmup retry: ${is_warmup_retry}`);
    console.log(`${'-'.repeat(80)}\n`);
    
    let transcriptionResult: { text: string; language?: string };
    try {
      // If this is the first attempt and not a warmup retry, try to warmup the server first
      if (retry_count === 0 && !is_warmup_retry) {
        console.log(`[${requestId}] 🔥 WHISPER: First attempt - starting server warmup...`);
        const warmupStart = Date.now();

        // 并行执行预热，不等待结果
        const warmupPromise = warmupWhisperServer().catch(() => false);

        // 给服务器一些时间启动，但不要等太久
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.COLD_START_WAIT)
        );

        const warmupSuccess = await warmupPromise;
        const warmupDuration = Date.now() - warmupStart;
        performanceMetrics.whisper.warmupTime = warmupDuration;
        performanceMetrics.whisper.totalTime += warmupDuration;
        
        console.log(`[${requestId}] ⏱️  WHISPER: Warmup took ${warmupDuration}ms`);
        console.log(`[${requestId}] ${warmupSuccess ? '✅' : '❌'} WHISPER: Warmup ${warmupSuccess ? 'SUCCESS' : 'FAILED (server sleeping)'}`);
        
        if (!warmupSuccess) {
          performanceMetrics.whisper.serverStatus = 'sleeping';
        } else {
          performanceMetrics.whisper.serverStatus = 'active';
        }
        
        console.log(`[${requestId}] ⏰ Elapsed time so far: ${Date.now() - startTime}ms`);

        if (!warmupSuccess) {
          console.log(`[${requestId}] 💤 WHISPER: Server is sleeping, scheduling quick retry...`);

          // Schedule a quick retry after warmup
          const retryMessageId = await scheduleRetry(
            queue_id,
            attachment_id,
            user_id,
            audio_url,
            1,
            true // This is a warmup retry
          );

          await client
            .from("video_processing_queue")
            .update({
              qstash_message_id: retryMessageId,
              status: "retrying",
              error_message: "Warming up Whisper server...",
              retry_count: 1,
            })
            .eq("id", queue_id);

          console.log(`[${requestId}] ✅ Warmup retry scheduled: ${retryMessageId}`);
          console.log(`[${requestId}] ⏰ Total execution time: ${Date.now() - startTime}ms`);

          return NextResponse.json({
            message: "Warming up Whisper server, will retry in 10 seconds",
            retry_count: 1,
            is_warmup_retry: true,
            queue_id,
            attachment_id,
            service: 'whisper',
            issue: 'server_sleeping',
          });
        }

        console.log(`[${requestId}] ✅ WHISPER: Server warmup successful, proceeding with transcription`);
      }

      // Try transcription (supports both URL and Blob)
      console.log(`[${requestId}] 🎯 WHISPER: Calling Whisper API...`);
      console.log(`[${requestId}] 📊 Audio source type: ${typeof audioSource === 'string' ? 'URL' : 'Blob'}`);
      const transcriptionStart = Date.now();
      
      transcriptionResult = await transcribeWithWhisper(
        audioSource,
        retry_count,
        is_warmup_retry,
        requestId,
        performanceMetrics
      );
      
      const transcriptionDuration = Date.now() - transcriptionStart;
      performanceMetrics.whisper.processingTime = transcriptionDuration;
      performanceMetrics.whisper.totalTime += transcriptionDuration;
      
      console.log(`\n${'-'.repeat(80)}`);
      console.log(`[${requestId}] ⏱️  ⚠️  CRITICAL: WHISPER API call took ${transcriptionDuration}ms (${(transcriptionDuration / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}] ⏱️  ⚠️  CRITICAL: WHISPER TOTAL (warmup + processing): ${performanceMetrics.whisper.totalTime}ms (${(performanceMetrics.whisper.totalTime / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}] ${transcriptionDuration > 240000 ? '❌' : transcriptionDuration > 180000 ? '⚠️' : '✅'} WHISPER: ${transcriptionDuration > 240000 ? 'TOO SLOW - WILL CAUSE TIMEOUT' : transcriptionDuration > 180000 ? 'SLOW - APPROACHING TIMEOUT' : 'GOOD SPEED'}`);
      console.log(`${'-'.repeat(80)}\n`);
      
      console.log(`[${requestId}] 📝 Transcription result:`, {
        text_length: transcriptionResult.text.length,
        language: transcriptionResult.language,
        text_preview: transcriptionResult.text.substring(0, 100) + '...',
      });
      
      // Check if we're approaching Vercel timeout (300 seconds)
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds > 240) {
        console.warn(`[${requestId}] ⚠️  WARNING: Approaching Vercel timeout! Elapsed: ${elapsedSeconds.toFixed(2)}s / 300s`);
      }
      
    } catch (whisperError: any) {
      const errorTime = Date.now() - startTime;
      performanceMetrics.whisper.errorCount++;
      
      console.error(`\n${'='.repeat(80)}`);
      console.error(`[${requestId}] ❌ WHISPER API FAILED`);
      console.error(`[${requestId}] ⏰ Failed after: ${errorTime}ms (${(errorTime / 1000).toFixed(2)}s)`);
      console.error(`[${requestId}] Error type: ${whisperError.name}`);
      console.error(`[${requestId}] Error message: ${whisperError.message}`);
      console.error(`[${requestId}] Stack:`, whisperError.stack);
      console.error(`${'='.repeat(80)}\n`);

      // Check error type and determine if we should retry
      const isServerSleeping = whisperError.message.includes("SERVER_SLEEPING");
      const isRateLimit = whisperError.message.includes("RATE_LIMIT");
      const canRetry = retry_count < RETRY_CONFIG.MAX_RETRIES;

      console.log(`[${requestId}] 🔍 Error analysis:`, {
        isServerSleeping,
        isRateLimit,
        canRetry,
        retry_count,
        max_retries: RETRY_CONFIG.MAX_RETRIES,
      });

      if ((isServerSleeping || isRateLimit) && canRetry) {
        const nextRetryCount = retry_count + 1;
        const retryReason = isServerSleeping
          ? "Whisper server is sleeping, retrying..."
          : "Rate limited by Whisper API, retrying with delay...";

        console.log(`[${requestId}] 🔄 Scheduling retry ${nextRetryCount}/${RETRY_CONFIG.MAX_RETRIES}`);
        console.log(`[${requestId}] 📝 Reason: ${retryReason}`);

        // Update queue retry count
        await client
          .from("video_processing_queue")
          .update({
            status: "retrying",
            retry_count: nextRetryCount,
            error_message: retryReason,
            last_error_at: new Date().toISOString(),
          })
          .eq("id", queue_id);

        // Schedule retry with appropriate delay
        try {
          const retryMessageId = await scheduleRetry(
            queue_id,
            attachment_id,
            user_id,
            audio_url,
            nextRetryCount,
            false
          );

          await client
            .from("video_processing_queue")
            .update({ qstash_message_id: retryMessageId })
            .eq("id", queue_id);

          const delaySeconds =
            RETRY_CONFIG.RETRY_DELAYS[nextRetryCount - 1] ||
            RETRY_CONFIG.RETRY_DELAYS[RETRY_CONFIG.RETRY_DELAYS.length - 1];

          return NextResponse.json({
            message: retryReason,
            retry_count: nextRetryCount,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
            next_retry_in_seconds: delaySeconds,
          });
        } catch (retryError: any) {
          console.error("❌ Failed to schedule retry:", retryError);

          // Mark step as failed if we can't schedule retry
          await client.rpc("update_video_processing_step", {
            queue_id_param: queue_id,
            step_name_param: "transcribe",
            status_param: "failed",
            error_message_param: `Failed to schedule retry after error`,
            error_details_param: {
              last_error: whisperError.message,
              retry_error: retryError.message,
              retry_count,
            },
          });

          throw retryError;
        }
      } else {
        // Max retries reached or non-retryable error
        console.error(`❌ Max retries reached or non-retryable error:`, {
          queue_id,
          attachment_id,
          retry_count,
          max_retries: RETRY_CONFIG.MAX_RETRIES,
        });

        // Mark step as failed
        await client.rpc("update_video_processing_step", {
          queue_id_param: queue_id,
          step_name_param: "transcribe",
          status_param: "failed",
          error_message_param: `Transcription failed after ${retry_count} attempts`,
          error_details_param: {
            last_error: whisperError.message,
            retry_count,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
          },
        });

        // Send failure notification
        await sendVideoProcessingNotification(user_id, {
          attachment_id,
          queue_id,
          attachment_title: `Video ${attachment_id}`,
          status: "failed",
          current_step: "transcribe",
          error_message: `Transcription failed after ${retry_count} attempts`,
        });

        return NextResponse.json(
          {
            error: "Max retries reached for transcription",
            queue_id,
            attachment_id,
            retry_count,
            max_retries: RETRY_CONFIG.MAX_RETRIES,
            last_error: whisperError.message,
          },
          { status: 500 }
        );
      }
    }

    // 6. Complete the transcription step
    await client.rpc("complete_processing_step", {
      queue_id_param: queue_id,
      step_name_param: "transcribe",
      output_data_param: {
        transcription_text: transcriptionResult!.text,
        language: transcriptionResult!.language,
        text_length: transcriptionResult!.text.length,
        audio_url: audio_url,
        retry_count,
        was_warmup_retry: is_warmup_retry,
      },
    });

    // 7. Queue the next step (embedding generation)
    try {
      const nextQstashMessageId = await queueNextStep(
        queue_id,
        attachment_id,
        user_id,
        transcriptionResult!.text
      );

      // Update queue with next step's QStash message ID
      await client
        .from("video_processing_queue")
        .update({
          qstash_message_id: nextQstashMessageId,
          current_step: "embed",
          progress_percentage: 80,
          retry_count: 0, // Reset retry count for next step
        })
        .eq("id", queue_id);
    } catch (queueError: any) {
      console.error("Failed to queue next step:", queueError);

      // Mark as failed but keep transcription result
      await client.rpc("handle_step_failure", {
        queue_id_param: queue_id,
        step_name_param: "embed",
        error_message_param: "Failed to queue embedding step",
        error_details_param: { step: "queue_next", error: queueError.message },
      });

      return NextResponse.json(
        {
          error: "Failed to queue next processing step",
          details: queueError.message,
          transcription_text: transcriptionResult.text, // Include the text so it's not lost
          retryable: true,
        },
        { status: 500 }
      );
    }

    console.log("Transcription completed successfully:", {
      queue_id,
      attachment_id,
      text_length: transcriptionResult.text.length,
      language: transcriptionResult.language,
      retry_count,
    });

    const totalExecutionTime = Date.now() - startTime;
    performanceMetrics.vercel.totalExecutionTime = totalExecutionTime;
    
    // Calculate breakdown percentages
    performanceMetrics.breakdown = [
      { step: 'Supabase Operations', duration: performanceMetrics.supabase.totalTime, percentage: (performanceMetrics.supabase.totalTime / totalExecutionTime * 100) },
      { step: 'Network Download', duration: performanceMetrics.network.downloadTime, percentage: (performanceMetrics.network.downloadTime / totalExecutionTime * 100) },
      { step: 'Whisper Warmup', duration: performanceMetrics.whisper.warmupTime, percentage: (performanceMetrics.whisper.warmupTime / totalExecutionTime * 100) },
      { step: 'Whisper Processing', duration: performanceMetrics.whisper.processingTime, percentage: (performanceMetrics.whisper.processingTime / totalExecutionTime * 100) },
    ].filter(item => item.duration > 0).sort((a, b) => b.duration - a.duration);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${requestId}] ✅ TRANSCRIPTION COMPLETED SUCCESSFULLY`);
    console.log(`${'='.repeat(80)}`);
    console.log(`[${requestId}] ⏰ VERCEL: Total execution time: ${totalExecutionTime}ms (${(totalExecutionTime / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}] 📊 VERCEL: Timeout limit: 300s`);
    console.log(`[${requestId}] 📊 VERCEL: Time remaining: ${((300000 - totalExecutionTime) / 1000).toFixed(2)}s`);
    console.log(`[${requestId}] 📊 VERCEL: Usage: ${(totalExecutionTime / 300000 * 100).toFixed(1)}%`);
    console.log(`[${requestId}] ${totalExecutionTime > 300000 ? '❌ TIMEOUT' : totalExecutionTime > 270000 ? '🚨 DANGER' : totalExecutionTime > 240000 ? '⚠️  WARNING' : '✅ SAFE'}`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`[${requestId}] 🗄️  SUPABASE SUMMARY:`);
    console.log(`[${requestId}]    Total time: ${performanceMetrics.supabase.totalTime}ms (${(performanceMetrics.supabase.totalTime / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}]    Operations: ${performanceMetrics.supabase.operations.length}`);
    console.log(`[${requestId}]    Errors: ${performanceMetrics.supabase.errorCount}`);
    console.log(`[${requestId}]    Percentage of total: ${(performanceMetrics.supabase.totalTime / totalExecutionTime * 100).toFixed(1)}%`);
    console.log(`[${requestId}]    ${performanceMetrics.supabase.totalTime > 5000 ? '⚠️  SLOW' : '✅ GOOD'}`);
    console.log(`${'-'.repeat(80)}`);
    if (performanceMetrics.network.downloadTime > 0) {
      console.log(`[${requestId}] 🌐 NETWORK SUMMARY:`);
      console.log(`[${requestId}]    Download time: ${performanceMetrics.network.downloadTime}ms (${(performanceMetrics.network.downloadTime / 1000).toFixed(2)}s)`);
      console.log(`[${requestId}]    Download size: ${(performanceMetrics.network.downloadSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[${requestId}]    Download speed: ${((performanceMetrics.network.downloadSize / 1024 / 1024) / (performanceMetrics.network.downloadTime / 1000)).toFixed(2)} MB/s`);
      console.log(`[${requestId}]    Percentage of total: ${(performanceMetrics.network.downloadTime / totalExecutionTime * 100).toFixed(1)}%`);
      console.log(`[${requestId}]    ${performanceMetrics.network.downloadTime > 60000 ? '❌ TOO SLOW' : performanceMetrics.network.downloadTime > 30000 ? '⚠️  SLOW' : '✅ GOOD'}`);
      console.log(`${'-'.repeat(80)}`);
    }
    console.log(`[${requestId}] 🎤 WHISPER SUMMARY:`);
    console.log(`[${requestId}]    Server status: ${performanceMetrics.whisper.serverStatus}`);
    console.log(`[${requestId}]    Warmup time: ${performanceMetrics.whisper.warmupTime}ms (${(performanceMetrics.whisper.warmupTime / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}]    Processing time: ${performanceMetrics.whisper.processingTime}ms (${(performanceMetrics.whisper.processingTime / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}]    Total Whisper time: ${performanceMetrics.whisper.totalTime}ms (${(performanceMetrics.whisper.totalTime / 1000).toFixed(2)}s)`);
    console.log(`[${requestId}]    Errors: ${performanceMetrics.whisper.errorCount}`);
    console.log(`[${requestId}]    Percentage of total: ${(performanceMetrics.whisper.totalTime / totalExecutionTime * 100).toFixed(1)}%`);
    console.log(`[${requestId}]    ${performanceMetrics.whisper.processingTime > 240000 ? '❌ TOO SLOW - CAUSING TIMEOUT' : performanceMetrics.whisper.processingTime > 180000 ? '⚠️  SLOW' : '✅ GOOD'}`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`[${requestId}] 📊 TIME BREAKDOWN (sorted by duration):`);
    performanceMetrics.breakdown.forEach((item: any, index: number) => {
      const bar = '█'.repeat(Math.floor(item.percentage / 2));
      console.log(`[${requestId}]    ${index + 1}. ${item.step}: ${item.duration}ms (${(item.duration / 1000).toFixed(2)}s) - ${item.percentage.toFixed(1)}%`);
      console.log(`[${requestId}]       ${bar}`);
    });
    console.log(`${'-'.repeat(80)}`);
    console.log(`[${requestId}] 🎯 ROOT CAUSE ANALYSIS:`);
    
    const bottleneck = performanceMetrics.breakdown[0];
    if (bottleneck.step.includes('Whisper')) {
      console.log(`[${requestId}]    ❌ PRIMARY ISSUE: Whisper API is the bottleneck (${bottleneck.percentage.toFixed(1)}% of total time)`);
      console.log(`[${requestId}]    💡 RECOMMENDATION: Consider switching to faster transcription service (OpenAI/AssemblyAI) or implement async processing`);
    } else if (bottleneck.step.includes('Network')) {
      console.log(`[${requestId}]    ❌ PRIMARY ISSUE: Network download is the bottleneck (${bottleneck.percentage.toFixed(1)}% of total time)`);
      console.log(`[${requestId}]    💡 RECOMMENDATION: Use MEGA.nz URL mode or optimize file storage location`);
    } else if (bottleneck.step.includes('Supabase')) {
      console.log(`[${requestId}]    ❌ PRIMARY ISSUE: Database operations are the bottleneck (${bottleneck.percentage.toFixed(1)}% of total time)`);
      console.log(`[${requestId}]    💡 RECOMMENDATION: Optimize database queries or use connection pooling`);
    } else {
      console.log(`[${requestId}]    ✅ No single bottleneck identified - multiple factors contributing`);
    }
    
    console.log(`${'-'.repeat(80)}`);
    console.log(`[${requestId}] 📝 Transcription: ${transcriptionResult.text.length} characters`);
    console.log(`[${requestId}] 🌍 Language: ${transcriptionResult.language}`);
    console.log(`[${requestId}] 🔄 Retry count: ${retry_count}`);
    console.log(`[${requestId}] ⏰ Completed at: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}\n`);

    return NextResponse.json(
      {
        message: "Transcription completed successfully",
        data: {
          queue_id,
          attachment_id,
          step: "transcribe",
          status: "completed",
          output: {
            text: transcriptionResult.text,
            language: transcriptionResult.language,
            text_length: transcriptionResult.text.length,
          },
          next_step: "embed",
          retry_count,
          completedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
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
        },
      },
      { status: 500 }
    );
  }
}

// Export the handler directly (QStash signature verification handled in utils)
export const POST = handler;
