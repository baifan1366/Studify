import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { z } from "zod";

// Validation schema for QStash job payload
const EmbedJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"),
  transcription_text: z.string().min(1, "Transcription text is required"),
  timestamp: z.string().optional(),
});

async function generateDualEmbeddings(text: string, retryCount: number = 0): Promise<{ 
  e5_embedding?: number[]; 
  bge_embedding?: number[];
  has_e5: boolean;
  has_bge: boolean;
}> {
  const embeddingApis = [
    {
      url: process.env.BGE_HG_EMBEDDING_SERVER_API_URL,
      model: 'BAAI/bge-m3',
      name: 'BGE-M3',
      dimensions: 1024,
      type: 'bge'
    },
    {
      url: process.env.E5_HG_EMBEDDING_SERVER_API_URL,
      model: 'intfloat/e5-small',
      name: 'E5-Small',
      dimensions: 384,
      type: 'e5'
    }
  ];

  const results = {
    e5_embedding: undefined as number[] | undefined,
    bge_embedding: undefined as number[] | undefined,
    has_e5: false,
    has_bge: false
  };

  // Try to generate both embeddings
  for (const api of embeddingApis) {
    if (!api.url) {
      console.log(`${api.name} API URL not configured, skipping...`);
      continue;
    }

    console.log(`Attempting embedding generation with ${api.name} (attempt ${retryCount + 1}):`, api.url);
    console.log('Text length:', text.length, 'characters');

    try {
      const response = await fetch(`${api.url}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`${api.name} API error (${response.status}):`, errorText);
        
        // Check if it's a server wake-up issue (503, 502, or connection errors)
        if (response.status === 503 || response.status === 502 || response.status === 504) {
          console.log(`${api.name} server is sleeping, will continue with other APIs...`);
          continue; // Try other APIs
        }
        
        console.error(`${api.name} API error (${response.status}): ${errorText}`);
        continue; // Try other APIs
      }

      const result = await response.json();
      console.log(`${api.name} API response received:`, {
        hasEmbedding: !!(result.embedding || result.data?.[0]?.embedding),
        embeddingLength: (result.embedding || result.data?.[0]?.embedding)?.length || 0,
      });

      const embedding = result.embedding || result.data?.[0]?.embedding;
      if (!embedding) {
        console.error(`No embedding vector received from ${api.name}`);
        continue;
      }

      // Store the embedding based on type
      if (api.type === 'e5') {
        results.e5_embedding = embedding;
        results.has_e5 = true;
        console.log(`✅ E5-Small embedding generated successfully (${embedding.length} dimensions)`);
      } else if (api.type === 'bge') {
        results.bge_embedding = embedding;
        results.has_bge = true;
        console.log(`✅ BGE-M3 embedding generated successfully (${embedding.length} dimensions)`);
      }

    } catch (error: any) {
      console.error(`${api.name} API error:`, error.message);
      
      // Check if it's a server sleeping issue
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('fetch failed') ||
          error.message.includes('SERVER_SLEEPING')) {
        console.log(`${api.name} server appears to be sleeping, continuing with other APIs...`);
      }
      continue; // Try other APIs
    }
  }

  // Check if we got at least one embedding
  if (!results.has_e5 && !results.has_bge) {
    throw new Error('SERVER_SLEEPING:All embedding servers are sleeping or unreachable');
  }

  console.log(`Embedding generation summary: E5=${results.has_e5}, BGE=${results.has_bge}`);
  return results;
}

async function scheduleRetry(queueId: number, attachmentId: number, userId: string, transcriptionText: string, retryCount: number) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app/'
  const embedEndpoint = `${baseUrl}/api/video-processing/steps/embed`;
  
  // Calculate delay: 1 minute * retry_count (1min, 2min, 3min)
  const delayMinutes = retryCount;
  
  console.log(`Scheduling embedding retry ${retryCount} in ${delayMinutes} minutes for queue:`, queueId);
  
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
        delay: `${delayMinutes}m`,
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

    const { queue_id, attachment_id, user_id, transcription_text, timestamp } = validation.data;
    const retryAttempt = (body as any).retry_attempt || 0;
    const client = await createServerClient();
    
    console.log('Processing embedding generation for:', {
      queue_id,
      attachment_id,
      user_id,
      text_length: transcription_text.length,
      timestamp,
      retry_attempt: retryAttempt,
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
        retry_count: retryAttempt
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

    // 4. Generate dual embeddings
    let embeddingResult: { 
      e5_embedding?: number[]; 
      bge_embedding?: number[];
      has_e5: boolean;
      has_bge: boolean;
    };
    try {
      embeddingResult = await generateDualEmbeddings(transcription_text, retryAttempt);
      
    } catch (embeddingError: any) {
      console.error('Embedding generation failed:', embeddingError.message);
      
      // Check if it's a server sleeping issue and we can retry
      const isServerSleeping = embeddingError.message.includes('SERVER_SLEEPING');
      const canRetry = queueData.retry_count < queueData.max_retries;
      
      if (isServerSleeping && canRetry) {
        console.log(`Embedding servers are sleeping, scheduling retry ${queueData.retry_count + 1}/${queueData.max_retries}`);
        
        // Update queue retry count
        await client
          .from("video_processing_queue")
          .update({
            status: 'retrying',
            retry_count: queueData.retry_count + 1,
            error_message: 'Embedding servers are sleeping, retrying...',
            last_error_at: new Date().toISOString()
          })
          .eq("id", queue_id);

        // Schedule retry
        try {
          const retryMessageId = await scheduleRetry(queue_id, attachment_id, user_id, transcription_text, queueData.retry_count + 1);
          
          await client
            .from("video_processing_queue")
            .update({ qstash_message_id: retryMessageId })
            .eq("id", queue_id);

          return NextResponse.json({
            message: "Embedding servers are sleeping, retry scheduled",
            retry_count: queueData.retry_count + 1,
            max_retries: queueData.max_retries,
            next_retry_in_minutes: queueData.retry_count + 1,
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
            retry_count: queueData.retry_count,
            max_retries_exceeded: !canRetry
          }
        });

        return NextResponse.json({
          error: "Embedding generation failed",
          details: embeddingError.message,
          retryable: false,
          retry_count: queueData.retry_count,
          max_retries: queueData.max_retries,
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
      embedding_model: embeddingResult.has_bge ? 'BAAI/bge-m3' : 'intfloat/e5-small', // Primary model
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
        text_length: transcription_text.length,
        word_count: wordCount,
        sentence_count: sentenceCount,
        retry_count: retryAttempt
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
      retry_count: retryAttempt,
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
