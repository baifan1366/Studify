import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/utils/auth/server-guard";
import { createAdminClient } from "@/utils/supabase/server";

// Process video transcript and create embeddings
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize("admin");
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { lessonId, transcript, forceReprocess = false } = body;

    if (!lessonId || !transcript?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: lessonId, transcript" },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get lesson info
    const { data: lesson, error: lessonError } = await supabase
      .from("course_lesson")
      .select("id, title, public_id")
      .eq("public_id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    console.log(`📹 Processing transcript for lesson: ${lesson.title}`);

    // Check if already processed
    if (!forceReprocess) {
      const { data: existingSegments } = await supabase
        .from("video_segments")
        .select("id")
        .eq("lesson_id", lesson.id)
        .limit(1);

      if (existingSegments && existingSegments.length > 0) {
        return NextResponse.json({
          success: true,
          message: "Transcript already processed",
          segmentsCount: existingSegments.length,
          note: "Use forceReprocess=true to reprocess",
        });
      }
    }

    // Split transcript into segments (simple approach: by sentences or time)
    const segments = splitTranscriptIntoSegments(transcript);

    console.log(`  ↳ Split into ${segments.length} segments`);

    // Insert segments into video_segments table
    const segmentRecords = segments.map((seg, index) => ({
      lesson_id: lesson.id,
      start_time: seg.startTime,
      end_time: seg.endTime,
      text: seg.text,
      position: index,
    }));

    const { data: insertedSegments, error: segmentError } = await supabase
      .from("video_segments")
      .insert(segmentRecords)
      .select("id, text");

    if (segmentError) {
      console.error("Failed to insert segments:", segmentError);
      return NextResponse.json(
        { error: "Failed to create video segments" },
        { status: 500 }
      );
    }

    console.log(`  ✅ Created ${insertedSegments.length} video segments`);

    // Queue embeddings for each segment
    const embeddingQueueItems = insertedSegments.map((seg) => ({
      content_type: "video_segment",
      content_id: seg.id,
      content_text: seg.text,
      content_hash: generateSimpleHash(seg.text),
      priority: 2, // Medium priority
      status: "queued",
      scheduled_at: new Date().toISOString(),
    }));

    const { error: queueError } = await supabase
      .from("embedding_queue")
      .insert(embeddingQueueItems);

    if (queueError) {
      console.error("Failed to queue embeddings:", queueError);
      return NextResponse.json(
        {
          success: true,
          warning: "Segments created but failed to queue embeddings",
          segmentsCount: insertedSegments.length,
        },
        { status: 207 }
      );
    }

    console.log(`  ✅ Queued ${embeddingQueueItems.length} embeddings`);

    return NextResponse.json({
      success: true,
      message: "Transcript processed successfully",
      segmentsCount: insertedSegments.length,
      embeddingsQueued: embeddingQueueItems.length,
      lessonInfo: {
        id: lesson.id,
        publicId: lesson.public_id,
        title: lesson.title,
      },
    });
  } catch (error) {
    console.error("Process transcript error:", error);
    return NextResponse.json(
      { error: "Failed to process transcript" },
      { status: 500 }
    );
  }
}

// Helper: Split transcript into segments
function splitTranscriptIntoSegments(transcript: string): Array<{
  text: string;
  startTime: number;
  endTime: number;
}> {
  // Simple approach: split by sentences, estimate timing
  const sentences = transcript
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20); // Filter out very short fragments

  // Get speaking speed from environment or use default
  const avgWordsPerMinute = parseInt(process.env.TRANSCRIPT_WORDS_PER_MINUTE || '150');
  const segments: Array<{ text: string; startTime: number; endTime: number }> =
    [];
  let currentTime = 0;

  for (const sentence of sentences) {
    const wordCount = sentence.split(/\s+/).length;
    const duration = (wordCount / avgWordsPerMinute) * 60; // Convert to seconds

    segments.push({
      text: sentence,
      startTime: currentTime,
      endTime: currentTime + duration,
    });

    currentTime += duration;
  }

  return segments;
}

// Helper: Generate simple hash for content
function generateSimpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Helper: Extract transcript from video using Whisper API
async function extractTranscriptFromVideo(videoUrl: string): Promise<string> {
  const whisperApiUrl = process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL;
  
  if (!whisperApiUrl) {
    throw new Error('Whisper API URL not configured');
  }

  console.log(`🎙️ Calling Whisper API: ${whisperApiUrl}`);

  try {
    // Download video file
    console.log(`  ↳ Downloading video from: ${videoUrl}`);
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log(`  ↳ Downloaded ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Create form data
    const formData = new FormData();
    formData.append('file', videoBlob, 'video.mp4');

    // Get Whisper API parameters from environment
    const whisperTask = process.env.WHISPER_TASK || 'transcribe'; // transcribe or translate
    const whisperBeamSize = process.env.WHISPER_BEAM_SIZE || '5'; // 1-10

    // Call Whisper API
    console.log(`  ↳ Sending to Whisper API (task=${whisperTask}, beam_size=${whisperBeamSize})...`);
    const whisperResponse = await fetch(`${whisperApiUrl}/transcribe?task=${whisperTask}&beam_size=${whisperBeamSize}`, {
      method: 'POST',
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log(`  ✅ Transcription complete: ${result.language}, ${result.duration}s`);

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Whisper API returned empty transcript');
    }

    return result.text;

  } catch (error) {
    console.error('Whisper API error:', error);
    throw error;
  }
}

// API endpoint to extract transcript from video (can be called separately)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Missing required field: lessonId' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get lesson with attachments
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lesson')
      .select('id, public_id, title, attachments, content_url, transcript')
      .eq('public_id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if already has transcript
    if (lesson.transcript && lesson.transcript.trim()) {
      return NextResponse.json({
        success: true,
        message: 'Lesson already has transcript',
        transcript: lesson.transcript,
        note: 'Use forceReprocess=true in POST to reprocess'
      });
    }

    console.log(`🎙️ Extracting transcript for lesson: ${lesson.title}`);

    let videoUrl: string | null = null;

    // Try to get video URL from attachment
    if (lesson.attachments && lesson.attachments.length > 0) {
      const attachmentId = lesson.attachments[0];
      
      const { data: attachment } = await supabase
        .from('attachments')
        .select('url, file_name')
        .eq('id', attachmentId)
        .single();
      
      if (attachment?.url) {
        videoUrl = attachment.url;
        console.log(`  ↳ Using attachment: ${attachment.file_name}`);
      }
    }

    // Fallback to content_url
    if (!videoUrl && lesson.content_url) {
      const isExternal = lesson.content_url.includes('youtube.com') || 
                        lesson.content_url.includes('youtu.be') ||
                        lesson.content_url.includes('vimeo.com');
      
      if (!isExternal) {
        videoUrl = lesson.content_url;
        console.log(`  ↳ Using content_url`);
      } else {
        return NextResponse.json({
          success: false,
          error: 'Cannot extract transcript from external videos (YouTube/Vimeo)',
          suggestion: 'Please provide transcript manually or use platform APIs'
        }, { status: 400 });
      }
    }

    if (!videoUrl) {
      return NextResponse.json({
        success: false,
        error: 'No video URL found',
        suggestion: 'Please upload a video attachment or provide a video URL'
      }, { status: 400 });
    }

    // Extract transcript using Whisper
    const transcript = await extractTranscriptFromVideo(videoUrl);

    // Save transcript to lesson
    const { error: updateError } = await supabase
      .from('course_lesson')
      .update({ transcript })
      .eq('id', lesson.id);

    if (updateError) {
      console.error('Failed to save transcript:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save transcript to database',
        transcript // Return transcript anyway
      }, { status: 500 });
    }

    console.log(`  ✅ Transcript saved to database`);

    // Auto-process the transcript
    try {
      const processResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/video/process-transcript`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: lesson.public_id,
            transcript
          })
        }
      );

      const processResult = await processResponse.json();

      if (processResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Transcript extracted and processed successfully',
          transcript,
          transcriptLength: transcript.length,
          segmentsCount: processResult.segmentsCount,
          embeddingsQueued: processResult.embeddingsQueued
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Transcript extracted but processing failed',
          transcript,
          transcriptLength: transcript.length,
          processingError: processResult.error,
          note: 'You can manually trigger processing later'
        }, { status: 207 });
      }
    } catch (processError) {
      return NextResponse.json({
        success: true,
        message: 'Transcript extracted but processing failed',
        transcript,
        transcriptLength: transcript.length,
        note: 'You can manually trigger processing later'
      }, { status: 207 });
    }

  } catch (error) {
    console.error('Extract transcript error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
