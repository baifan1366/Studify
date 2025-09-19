import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { generateDualEmbeddingWithWakeup } from "@/lib/langChain/embedding";
import { z } from "zod";

// Validation schema for QStash job payload
const EmbedJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  transcription_text: z.string().min(1, "Transcription text is required"),
  timestamp: z.string().optional(),
  retry_attempt: z.number().int().min(0).default(0),
});

// Configuration for retries
const EMBED_RETRY_CONFIG = {
  MAX_RETRIES: 5, // 增加到5次，与transcribe一致
  RETRY_DELAYS: [30, 60, 120, 180, 300], // 重试延迟（秒）: 30s, 1m, 2m, 3m, 5m
};

// Using the new smart embedding generation with wake-up logic
async function generateDualEmbeddings(text: string, retryCount: number = 0): Promise<{ 
  e5_embedding?: number[]; 
  bge_embedding?: number[];
  has_e5: boolean;
  has_bge: boolean;
  wake_up_summary?: string;
}> {
  console.log(`Starting smart dual embedding generation (attempt ${retryCount + 1})`);
  console.log('Text length:', text.length, 'characters');

  try {
    // Use the new smart dual embedding function with wake-up logic
    const result = await generateDualEmbeddingWithWakeup(text);
    
    const response = {
      e5_embedding: result.e5_embedding,
      bge_embedding: result.bge_embedding,
      has_e5: result.e5_success,
      has_bge: result.bge_success,
      wake_up_summary: `E5: ${result.e5_success ? 'SUCCESS' : 'FAILED'}${result.e5_was_sleeping ? ' (was sleeping)' : ''}, BGE: ${result.bge_success ? 'SUCCESS' : 'FAILED'}${result.bge_was_sleeping ? ' (was sleeping)' : ''}`
    };

    console.log('Smart dual embedding completed:', response.wake_up_summary);
    
    // Check if we got at least one embedding
    if (!response.has_e5 && !response.has_bge) {
      throw new Error('SERVER_SLEEPING:All embedding servers failed after wake-up attempts');
    }

    return response;
    
  } catch (error: any) {
    console.error('Smart dual embedding generation failed:', error.message);
    
    // If the smart function failed, it means both servers are really problematic
    throw new Error(`SERVER_SLEEPING:${error.message}`);
  }
}

async function scheduleRetry(queueId: number, attachmentId: number, userId: string, transcriptionText: string, retryCount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app/'
  const embedEndpoint = `${baseUrl}/api/video-processing/steps/embed`;
  
  // Use configured delays for progressive backoff
  const delaySeconds = EMBED_RETRY_CONFIG.RETRY_DELAYS[retryCount - 1] || 
                        EMBED_RETRY_CONFIG.RETRY_DELAYS[EMBED_RETRY_CONFIG.RETRY_DELAYS.length - 1];
  
  console.log(`🔄 Scheduling embedding retry ${retryCount} in ${delaySeconds} seconds for queue:`, queueId);
  
  try {
    const queueManager = getQueueManager();
    const queueName = `video-processing-${userId}`;
    
    // Ensure the queue exists
    await queueManager.ensureQueue(queueName, 1);
    
    // Enqueue the retry
    const qstashResponse = await queueManager.enqueue(
      queueName,
      embedEndpoint,
      {
        queue_id: queueId,
        attachment_id: attachmentId,
        user_id: userId,
        transcription_text: transcriptionText,
        timestamp: new Date().toISOString(),
        retry_attempt: retryCount,
      },
      {
        delay: `${delaySeconds}s`, // 使用秒为单位，更精确的控制
        retries: 0, // No additional retries, we handle it manually
      }
    );

    console.log(`Embedding retry ${retryCount} scheduled:`, qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to schedule retry:', error);
    throw error;
  }
}

async function sendCompletionNotification(userId: string, attachmentId: number, queueId: number) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app/'
    const notificationEndpoint = `${baseUrl}/api/notifications`;
    
    await fetch(notificationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title: 'Video Processing Complete',
        message: 'Your video has been successfully processed and AI features are now available.',
        type: 'course',
        metadata: {
          attachment_id: attachmentId,
          queue_id: queueId,
          action: 'video_processing_complete'
        }
      }),
    });
    
    console.log('Completion notification sent to user:', userId);
  } catch (error: any) {
    console.error('Failed to send completion notification:', error);
    // Don't fail the whole process if notification fails
  }
}

async function handler(req: Request) {
  try {
    console.log('Processing embedding generation job...');

    // Parse and validate the QStash job payload
    const body = await req.json();
    const validation = EmbedJobSchema.safeParse(body);
    
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

    const { queue_id, attachment_id, user_id, transcription_text, timestamp, retry_attempt } = validation.data;
    const client = await createServerClient();
    
    console.log('Processing embedding generation for:', {
      queue_id,
      attachment_id,
      user_id,
      text_length: transcription_text.length,
      timestamp,
      retry_attempt,
    });

    // 1. Get current queue status and retry count
    const { data: queueData, error: queueError } = await client
      .from("video_processing_queue")
      .select("retry_count, max_retries, status")
      .eq("id", queue_id)
      .single();

    if (queueError || !queueData) {
      throw new Error(`Queue not found: ${queueError?.message}`);
    }

    // 2. Update step status to processing
    await client
      .from("video_processing_steps")
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: retry_attempt
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "embed");

    // 3. Update queue status
    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'embed',
        progress_percentage: 90
      })
      .eq("id", queue_id);

    // 4. Generate dual embeddings with smart wake-up logic
    let embeddingResult: { 
      e5_embedding?: number[]; 
      bge_embedding?: number[];
      has_e5: boolean;
      has_bge: boolean;
      wake_up_summary?: string;
    };
    try {
      console.log('🚀 Starting smart dual embedding generation...');
      embeddingResult = await generateDualEmbeddings(transcription_text, retry_attempt);
      
    } catch (embeddingError: any) {
      console.error('Embedding generation failed:', embeddingError.message);
      
      // Check if it's a server sleeping issue and we can retry
      const isServerSleeping = embeddingError.message.includes('SERVER_SLEEPING');
      const canRetry = retry_attempt < EMBED_RETRY_CONFIG.MAX_RETRIES;
      
      if (isServerSleeping && canRetry) {
        const nextRetryCount = retry_attempt + 1;
        console.log(`🔄 Embedding servers are sleeping, scheduling retry ${nextRetryCount}/${EMBED_RETRY_CONFIG.MAX_RETRIES}`);
        
        // Update queue retry count
        await client
          .from("video_processing_queue")
          .update({
            status: 'retrying',
            retry_count: nextRetryCount,
            error_message: `Embedding servers are sleeping, retrying... (${nextRetryCount}/${EMBED_RETRY_CONFIG.MAX_RETRIES})`,
            last_error_at: new Date().toISOString()
          })
          .eq("id", queue_id);

        // Schedule retry
        try {
          const retryMessageId = await scheduleRetry(queue_id, attachment_id, user_id, transcription_text, nextRetryCount);
          
          await client
            .from("video_processing_queue")
            .update({ qstash_message_id: retryMessageId })
            .eq("id", queue_id);

          const delaySeconds = EMBED_RETRY_CONFIG.RETRY_DELAYS[nextRetryCount - 1] || 
                                EMBED_RETRY_CONFIG.RETRY_DELAYS[EMBED_RETRY_CONFIG.RETRY_DELAYS.length - 1];
          
          return NextResponse.json({
            message: "Embedding servers are sleeping, retry scheduled",
            retry_count: nextRetryCount,
            max_retries: EMBED_RETRY_CONFIG.MAX_RETRIES,
            next_retry_in_seconds: delaySeconds,
          }, { status: 202 });
          
        } catch (scheduleError: any) {
          console.error('Failed to schedule retry:', scheduleError);
          
          await client.rpc('handle_step_failure', {
            queue_id_param: queue_id,
            step_name_param: 'embed',
            error_message_param: 'Failed to schedule retry',
            error_details_param: { step: 'schedule_retry', error: scheduleError.message }
          });

          return NextResponse.json({
            error: "Failed to schedule retry",
            details: scheduleError.message,
            retryable: false,
          }, { status: 500 });
        }
      } else {
        // Max retries exceeded or non-retryable error
        await client.rpc('handle_step_failure', {
          queue_id_param: queue_id,
          step_name_param: 'embed',
          error_message_param: embeddingError.message,
          error_details_param: { 
            step: 'embedding_generation', 
            error: embeddingError.message,
            retry_count: retry_attempt,
            max_retries_exceeded: !canRetry
          }
        });

        return NextResponse.json({
          error: "Embedding generation failed",
          details: embeddingError.message,
          retryable: false,
          retry_count: retry_attempt,
          max_retries: EMBED_RETRY_CONFIG.MAX_RETRIES,
        }, { status: canRetry ? 500 : 422 });
      }
    }

    // 5. Calculate additional metadata
    const wordCount = transcription_text.split(/\s+/).length;
    const sentenceCount = transcription_text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
    const tokenCount = Math.ceil(wordCount * 1.3); // Rough estimate

    // 6. Save to video_embeddings table with dual embeddings
    const videoEmbeddingPayload = {
      attachment_id: attachment_id,
      content_type: 'course', // Since it's from course attachments
      embedding_e5_small: embeddingResult.e5_embedding,
      embedding_bge_m3: embeddingResult.bge_embedding,
      has_e5_embedding: embeddingResult.has_e5,
      has_bge_embedding: embeddingResult.has_bge,
      content_text: transcription_text,
      chunk_type: 'summary',
      hierarchy_level: 1,
      semantic_density: Math.min(wordCount / 100, 1.0), // Normalize to 0-1
      sentence_count: sentenceCount,
      word_count: wordCount,
      token_count: tokenCount,
      embedding_model: embeddingResult.has_bge && embeddingResult.has_e5 ? 'dual:BAAI/bge-m3+intfloat/e5-small' : 
        embeddingResult.has_bge ? 'BAAI/bge-m3' : 'intfloat/e5-small', // Primary model
      language: 'auto',
      status: 'completed',
      is_deleted: false
    };

    const { data: savedEmbedding, error: saveError } = await client
      .from("video_embeddings")
      .insert([videoEmbeddingPayload])
      .select("*")
      .single();

    if (saveError) {
      console.error('Error saving video embedding:', saveError);
      
      await client.rpc('handle_step_failure', {
        queue_id_param: queue_id,
        step_name_param: 'embed',
        error_message_param: 'Failed to save video embeddings to database',
        error_details_param: { step: 'database_save', error: saveError.message }
      });

      return NextResponse.json({
        error: "Failed to save video embeddings",
        details: saveError.message,
        retryable: true,
      }, { status: 500 });
    }

    // 7. Complete the embedding step and mark entire process as completed
    await client.rpc('complete_processing_step', {
      queue_id_param: queue_id,
      step_name_param: 'embed',
      output_data_param: {
        embedding_id: savedEmbedding.id,
        embedding_models: {
          e5_small: embeddingResult.has_e5 ? 'intfloat/e5-small' : null,
          bge_m3: embeddingResult.has_bge ? 'BAAI/bge-m3' : null
        },
        embeddings_generated: {
          e5: embeddingResult.has_e5,
          bge: embeddingResult.has_bge
        },
        wake_up_summary: embeddingResult.wake_up_summary,
        text_length: transcription_text.length,
        word_count: wordCount,
        sentence_count: sentenceCount,
        retry_count: retry_attempt
      }
    });

    // 8. Send completion notification
    await sendVideoProcessingNotification(user_id, {
      attachment_id,
      queue_id,
      attachment_title: `Video ${attachment_id}`,
      status: 'completed',
      current_step: 'embed',
      progress_percentage: 100
    });

    console.log('Video processing completed successfully:', {
      queue_id,
      attachment_id,
      embedding_id: savedEmbedding.id
    });

    return NextResponse.json({
      message: "Embedding processing completed successfully",
      queue_id,
      attachment_id,
      embedding_id: savedEmbedding.id,
      status: "completed",
      final_step: true,
      retry_count: retry_attempt,
      completedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in embedding processing:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      retryable: true,
    }, { status: 500 });
  }
}

// Export the handler directly (QStash signature verification handled in utils)
export const POST = handler;
