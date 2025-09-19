import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { qstashClient } from "@/utils/qstash/qstash";
import { getQueueManager } from "@/utils/qstash/queue-manager";
import { sendVideoProcessingNotification } from "@/lib/video-processing/notification-service";
import { generateDualEmbeddingWithWakeup } from "@/lib/langChain/embedding";
import { segmentTranscription, processSegmentsWithEmbeddings, VideoSegment } from "@/lib/video-processing/segment-processor";
import { z } from "zod";

// Validation schema for QStash job payload
const EmbedJobSchema = z.object({
  queue_id: z.number().int().positive("Invalid queue ID"),
  attachment_id: z.number().int().positive("Invalid attachment ID"),
  user_id: z.string().uuid("Invalid user ID"), // Use UUID format for consistency
  transcription_text: z.string().min(1, "Transcription text is required"),
  timestamp: z.string().optional(),
  retry_attempt: z.number().int().min(0).default(0),
});

// Configuration for retries
const EMBED_RETRY_CONFIG = {
  MAX_RETRIES: 5,
  RETRY_DELAYS: [30, 60, 120, 180, 300], // Progressive delays in seconds
};

// Schedule retry function
async function scheduleRetry(
  queueId: number, 
  attachmentId: number, 
  userId: string, 
  transcriptionText: string, 
  retryCount: number
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app'
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
        retries: 0 // Manual retry scheduling, no additional retries
      }
    );

    console.log(`Embedding retry ${retryCount} scheduled:`, qstashResponse.messageId);
    return qstashResponse.messageId;
  } catch (error: any) {
    console.error('Failed to schedule retry:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  console.log('🎬 Video embedding step started');
  
  try {
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

    // 1. Get current queue status
    const { data: queueData, error: queueError } = await client
      .from("video_processing_queue")
      .select("retry_count, max_retries, status")
      .eq("id", queue_id)
      .single();

    if (queueError || !queueData) {
      throw new Error(`Queue not found: ${queueError?.message}`);
    }

    // 2. Update step and queue status
    await client
      .from("video_processing_steps")
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: retry_attempt
      })
      .eq("queue_id", queue_id)
      .eq("step_name", "embed");

    await client
      .from("video_processing_queue")
      .update({
        status: 'processing',
        current_step: 'embed',
        progress_percentage: 90
      })
      .eq("id", queue_id);

    try {
      // 3. Generate video segments and embeddings
      console.log('🎬 Starting video segmentation and embedding generation...');
      
      // Estimate video duration from transcription length
      const wordCount = transcription_text.split(/\s+/).length;
      const estimatedDuration = wordCount / 2.5; // 2.5 words per second average
      
      console.log(`📊 Transcription stats: ${wordCount} words, ~${Math.round(estimatedDuration/60)} minutes`);
      
      // Segment the transcription
      const segments = segmentTranscription(transcription_text, estimatedDuration);
      console.log(`📝 Created ${segments.length} segments from transcription`);

      // Process all segments with embeddings
      const processedSegments = await processSegmentsWithEmbeddings(segments, attachment_id);
      
      // 4. Save all segment embeddings to database
      const segmentEmbeddings = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < processedSegments.length; i++) {
        const segment = processedSegments[i];
        
        try {
          if (segment.embedding && (segment.embedding.has_e5 || segment.embedding.has_bge)) {
            const segmentPayload = {
              attachment_id: attachment_id,
              content_type: 'course',
              embedding_e5_small: segment.embedding.e5_embedding,
              embedding_bge_m3: segment.embedding.bge_embedding,
              has_e5_embedding: segment.embedding.has_e5,
              has_bge_embedding: segment.embedding.has_bge,
              content_text: segment.content,
              chunk_type: 'segment',
              hierarchy_level: 1,
              
              // Segment-specific fields
              segment_index: segment.index,
              total_segments: segments.length,
              segment_start_time: segment.startTime,
              segment_end_time: segment.endTime,
              segment_overlap_start: segment.overlapStart,
              segment_overlap_end: segment.overlapEnd,
              
              // Content analysis
              contains_code: segment.containsCode,
              contains_math: segment.containsMath,
              contains_diagram: segment.containsDiagram,
              topic_keywords: segment.topicKeywords,
              confidence_score: segment.confidenceScore,
              
              // Metadata
              sentence_count: segment.sentenceCount,
              word_count: segment.wordCount,
              token_count: Math.ceil(segment.wordCount * 1.3),
              embedding_model: segment.embedding.has_bge && segment.embedding.has_e5 ? 
                'dual:BAAI/bge-m3+intfloat/e5-small' : 
                segment.embedding.has_bge ? 'BAAI/bge-m3' : 'intfloat/e5-small',
              language: 'auto',
              status: 'completed',
              is_deleted: false
            };

            segmentEmbeddings.push(segmentPayload);
            successCount++;
          } else {
            console.warn(`⚠️ Segment ${i} missing embedding, skipping...`);
            failureCount++;
          }
        } catch (segmentError: any) {
          console.error(`❌ Error preparing segment ${i}:`, segmentError.message);
          failureCount++;
        }
      }

      // Batch insert all segment embeddings
      if (segmentEmbeddings.length > 0) {
        console.log(`💾 Saving ${segmentEmbeddings.length} segment embeddings to database...`);
        
        const { data: savedEmbeddings, error: saveError } = await client
          .from("video_embeddings")
          .insert(segmentEmbeddings)
          .select("id");

        if (saveError) {
          console.error('Error saving segment embeddings:', saveError);
          throw new Error(`Failed to save segment embeddings: ${saveError.message}`);
        }

        console.log(`✅ Successfully saved ${savedEmbeddings?.length || 0} segment embeddings`);

        // Update segment relationships (prev/next segment IDs)
        if (savedEmbeddings && savedEmbeddings.length > 1) {
          const updatePromises = savedEmbeddings.map(async (embedding, index) => {
            const updates: any = {};
            
            if (index > 0) {
              updates.prev_segment_id = savedEmbeddings[index - 1].id;
            }
            if (index < savedEmbeddings.length - 1) {
              updates.next_segment_id = savedEmbeddings[index + 1].id;
            }
            
            if (Object.keys(updates).length > 0) {
              return client
                .from("video_embeddings")
                .update(updates)
                .eq("id", embedding.id);
            }
          });

          await Promise.all(updatePromises.filter(Boolean));
          console.log('✅ Updated segment relationships');
        }

        // 5. Create summary embedding (optional, for backward compatibility)
        console.log('📄 Creating summary embedding for backward compatibility...');
        
        try {
          const summaryEmbedding = await generateDualEmbeddingWithWakeup(transcription_text);
          
          const summaryPayload = {
            attachment_id: attachment_id,
            content_type: 'course',
            embedding_e5_small: summaryEmbedding.e5_embedding,
            embedding_bge_m3: summaryEmbedding.bge_embedding,
            has_e5_embedding: summaryEmbedding.e5_success,
            has_bge_embedding: summaryEmbedding.bge_success,
            content_text: transcription_text,
            chunk_type: 'summary',
            hierarchy_level: 0, // Top level for summary
            
            // Summary metadata
            sentence_count: transcription_text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
            word_count: wordCount,
            token_count: Math.ceil(wordCount * 1.3),
            embedding_model: summaryEmbedding.bge_success && summaryEmbedding.e5_success ? 
              'dual:BAAI/bge-m3+intfloat/e5-small' : 
              summaryEmbedding.bge_success ? 'BAAI/bge-m3' : 'intfloat/e5-small',
            language: 'auto',
            status: 'completed',
            is_deleted: false,
            confidence_score: 1.0 // High confidence for complete transcription
          };

          await client
            .from("video_embeddings")
            .insert([summaryPayload]);
            
          console.log('✅ Summary embedding created');
          
        } catch (summaryError: any) {
          console.warn('⚠️ Failed to create summary embedding:', summaryError.message);
          // Not critical, continue processing
        }

        // 6. Complete the embedding step
        await client.rpc('complete_processing_step', {
          queue_id_param: queue_id,
          step_name_param: 'embed',
          output_data_param: {
            segments_created: segments.length,
            embeddings_saved: savedEmbeddings.length,
            success_rate: Math.round((successCount / segments.length) * 100),
            failed_segments: failureCount,
            embedding_models: {
              e5_small: 'intfloat/e5-small',
              bge_m3: 'BAAI/bge-m3'
            },
            text_length: transcription_text.length,
            word_count: wordCount,
            estimated_duration: estimatedDuration,
            retry_count: retry_attempt,
            processing_summary: `Successfully created ${segments.length} segments with ${successCount} embeddings`
          }
        });

        // 7. Send completion notification
        await sendVideoProcessingNotification(user_id, {
          attachment_id,
          queue_id,
          attachment_title: `Video ${attachment_id}`,
          status: 'completed',
          current_step: 'embed',
          progress_percentage: 100
        });

        console.log('🎉 Video processing completed successfully:', {
          queue_id,
          attachment_id,
          segments_created: segments.length,
          embeddings_saved: savedEmbeddings.length,
          success_rate: `${Math.round((successCount / segments.length) * 100)}%`
        });

        return NextResponse.json({
          message: "Video segmentation and embedding completed successfully",
          queue_id,
          attachment_id,
          segments_created: segments.length,
          embeddings_saved: savedEmbeddings.length,
          success_rate: Math.round((successCount / segments.length) * 100),
          status: "completed",
          final_step: true,
          retry_count: retry_attempt,
          processing_summary: `Created ${segments.length} segments with ${successCount} successful embeddings`
        }, { status: 200 });
        
      } else {
        throw new Error('No valid segment embeddings generated');
      }

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

  } catch (error: any) {
    console.error('Video embedding step error:', error);
    
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
    }, { status: 500 });
  }
}
