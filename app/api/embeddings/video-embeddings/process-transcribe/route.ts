import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";

// Validation schema for QStash job payload
const ProcessTranscribeSchema = z.object({
  fileUrl: z.string().url("Invalid file URL"),
  attachmentId: z.string().min(1, "Attachment ID is required"),
  userId: z.string().optional(),
  timestamp: z.string().optional(),
});

// Trigger the main embedding processing pipeline
async function triggerEmbeddingProcess(attachmentId: string, transcriptionText: string) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const embeddingEndpoint = `${baseUrl}/api/embeddings/video-embeddings/process`;
  
  console.log('Triggering embedding process for attachment:', attachmentId);
  
  const response = await fetch(embeddingEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attachment_id: attachmentId,
      transcription_text: transcriptionText, // Pass the transcription to avoid re-processing
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding process failed: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

async function downloadFile(fileUrl: string): Promise<Blob> {
  console.log('Downloading file from:', fileUrl);
  
  const response = await fetch(fileUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Studify-Transcription-Service/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();
  
  console.log('File downloaded successfully:', {
    size: arrayBuffer.byteLength,
    contentType,
  });

  return new Blob([arrayBuffer], { type: contentType });
}

async function transcribeWithWhisper(audioBlob: Blob): Promise<any> {
  const whisperUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperUrl) {
    throw new Error('WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL environment variable not set');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');

  const transcribeEndpoint = `${whisperUrl}/transcribe?task=transcribe&beam_size=5`;
  
  console.log('Sending request to Whisper API:', transcribeEndpoint);
  console.log('Audio blob size:', audioBlob.size, 'bytes');

  const response = await fetch(transcribeEndpoint, {
    method: 'POST',
    body: formData,
    // Set a reasonable timeout for Whisper API
    signal: AbortSignal.timeout(300000), // 5 minutes timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Whisper API response received:', {
    hasText: !!result.text,
    textLength: result.text?.length || 0,
  });

  return result;
}

async function handler(req: Request) {
  try {
    console.log('Processing transcription job...');

    // Parse and validate the QStash job payload
    const body = await req.json();
    const validation = ProcessTranscribeSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Invalid job payload:', validation.error.errors);
      return NextResponse.json(
        { 
          error: "Invalid job payload", 
          details: validation.error.errors 
        }, 
        { status: 400 }
      );
    }

    const { fileUrl, attachmentId, userId, timestamp } = validation.data;
    
    console.log('Processing transcription for:', {
      fileUrl,
      attachmentId,
      userId,
      timestamp,
    });

    // Step 1: Download the audio file
    let audioBlob: Blob;
    try {
      audioBlob = await downloadFile(fileUrl);
    } catch (downloadError: any) {
      console.error('File download failed:', downloadError.message);
      return NextResponse.json({
        error: "Failed to download audio file",
        details: downloadError.message,
        retryable: true, // QStash should retry this
      }, { status: 500 });
    }

    // Step 2: Transcribe with Whisper API
    let transcriptionResult: any;
    try {
      transcriptionResult = await transcribeWithWhisper(audioBlob);
      
      if (!transcriptionResult.text) {
        throw new Error('No transcription text received from Whisper API');
      }
      
    } catch (whisperError: any) {
      console.error('Whisper API failed:', whisperError.message);
      
      // Check if it's a timeout or connection error (retryable)
      const isRetryable = whisperError.message.includes('timeout') || 
                         whisperError.message.includes('ECONNREFUSED') ||
                         whisperError.message.includes('UND_ERR_HEADERS_TIMEOUT') ||
                         whisperError.message.includes('fetch failed');
      
      return NextResponse.json({
        error: "Whisper transcription failed",
        details: whisperError.message,
        retryable: isRetryable,
      }, { status: isRetryable ? 500 : 422 });
    }

    // Step 3: Trigger the main embedding process with the transcription
    try {
      const embeddingResult = await triggerEmbeddingProcess(attachmentId, transcriptionResult.text);
      
      console.log('Transcription and embedding completed successfully:', {
        fileUrl,
        attachmentId,
        textLength: transcriptionResult.text.length,
        embeddingResult,
      });

      return NextResponse.json({
        message: "Transcription and embedding completed successfully",
        data: {
          fileUrl,
          attachmentId,
          text: transcriptionResult.text,
          embedding: embeddingResult,
          completedAt: new Date().toISOString(),
        },
      }, { status: 200 });

    } catch (embeddingError: any) {
      console.error('Embedding process failed:', embeddingError.message);
      
      // Return the transcription even if embedding fails
      return NextResponse.json({
        error: "Failed to generate embeddings",
        details: embeddingError.message,
        transcriptionText: transcriptionResult.text, // Include the text so it's not lost
        retryable: true, // Can retry the embedding part
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Unexpected error in transcription processing:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      retryable: true,
    }, { status: 500 });
  }
}

// Export the handler with QStash signature verification
export const POST = verifySignatureAppRouter(handler);
