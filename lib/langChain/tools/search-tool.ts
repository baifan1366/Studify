// Search Tool - 语义搜索工具（支持视频 embeddings）
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import { smartSearch } from '../langchain-integration';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../embedding';

// 搜索视频 embeddings - 两阶段搜索策略
// Stage 1: E5 粗筛（搜索整个视频，返回 top 30）
// Stage 2: BGE-M3 精排（对 top 30 重新排序，返回 top 10）
async function searchVideoEmbeddings(
  query: string,
  options: {
    lessonId?: string;
    attachmentId?: number;
    currentTime?: number;
    timeWindow?: number;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  const {
    lessonId,
    attachmentId,
    currentTime,
    timeWindow = 60,
    maxResults = 10
  } = options;
  
  try {
    // 生成两种 embeddings
    const { embedding: e5Embedding } = await generateEmbedding(query, 'e5');
    const { embedding: bgeEmbedding } = await generateEmbedding(query, 'bge');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 如果有 lessonId，先获取 attachmentId
    let targetAttachmentId = attachmentId;
    if (!targetAttachmentId && lessonId) {
      console.log(`🔍 Looking up attachment for lesson: ${lessonId}`);
      
      // First get the lesson
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lesson')
        .select('id, attachments')
        .eq('public_id', lessonId)
        .single();
      
      if (lessonError) {
        console.error('❌ Error fetching lesson:', lessonError);
      } else if (lesson) {
        console.log(`📝 Lesson found, attachments:`, lesson.attachments);
        
        // Check if attachments is an array with IDs
        if (Array.isArray(lesson.attachments) && lesson.attachments.length > 0) {
          // Attachments is an array of IDs
          const attachmentIds = lesson.attachments;
          
          // Get the first video attachment
          const { data: attachments } = await supabase
            .from('course_attachments')
            .select('id, type')
            .in('id', attachmentIds)
            .eq('type', 'video')
            .limit(1);
          
          if (attachments && attachments.length > 0) {
            targetAttachmentId = attachments[0].id;
            console.log(`✅ Found video attachment: ${targetAttachmentId}`);
          }
        }
      }
    }
    
    if (!targetAttachmentId) {
      console.warn('⚠️ No attachment ID found for video search');
      return [];
    }
    
    // 计算时间窗口 - 如果提供了 currentTime，则搜索前后各 timeWindow 秒
    let timeStart: number | null = null;
    let timeEnd: number | null = null;
    
    if (currentTime !== undefined && currentTime > 0) {
      // 扩大时间窗口以获取更多上下文
      const expandedWindow = timeWindow * 3; // 默认前后各 180 秒（3分钟）
      timeStart = Math.max(0, currentTime - expandedWindow);
      timeEnd = currentTime + expandedWindow;
      console.log(`⏱️ Time-focused search: ${timeStart}s - ${timeEnd}s (current: ${currentTime}s, window: ±${expandedWindow}s)`);
    } else {
      console.log(`🎯 Full video search (no time constraint)`);
    }
    
    console.log(`🎯 Two-stage search: E5 (${timeStart !== null ? 'time-focused' : 'whole video'}) → BGE-M3 (top ${maxResults})`);
    
    // 使用数据库的两阶段搜索函数（更高效）
    const e5CandidateCount = Math.max(30, maxResults * 3);
    
    const { data: twoStageResults, error: twoStageError } = await supabase.rpc('search_video_embeddings_two_stage', {
      query_embedding_e5: `[${e5Embedding.join(',')}]`,
      query_embedding_bge: `[${bgeEmbedding.join(',')}]`,
      p_attachment_id: targetAttachmentId,
      time_start: timeStart,
      time_end: timeEnd,
      e5_threshold: 0.5,
      e5_candidate_count: e5CandidateCount,
      final_count: maxResults,
      weight_e5: 0.3,
      weight_bge: 0.7
    });
    
    // 如果两阶段搜索成功，直接返回结果
    if (!twoStageError && twoStageResults && twoStageResults.length > 0) {
      console.log(`✅ Two-stage search: Found ${twoStageResults.length} results`);
      console.log(`📊 Score range: ${twoStageResults[0]?.combined_score?.toFixed(3)} - ${twoStageResults[twoStageResults.length - 1]?.combined_score?.toFixed(3)}`);
      
      return twoStageResults.map((r: any) => ({
        id: r.id,
        content_text: r.content_text,
        content_type: 'video_segment',  // 添加 content_type
        type: 'video_segment',          // 添加 type
        segment_start_time: r.segment_start_time,
        segment_end_time: r.segment_end_time,
        section_title: r.section_title,
        attachment_id: r.attachment_id,
        similarity: r.combined_score,
        e5_similarity: r.e5_similarity,
        bge_similarity: r.bge_similarity
      }));
    }
    
    // 回退到单阶段 E5 搜索
    console.log('⚠️ Two-stage search failed, falling back to E5-only search');
    
    const { data: e5Results, error: e5Error } = await supabase.rpc('search_video_embeddings_e5', {
      query_embedding: `[${e5Embedding.join(',')}]`,
      p_attachment_id: targetAttachmentId,
      time_start: timeStart,
      time_end: timeEnd,
      match_threshold: 0.5,
      match_count: e5CandidateCount
    });
    
    if (e5Error) {
      console.error('❌ E5 search error:', e5Error);
      return [];
    }
    
    // 如果时间窗口搜索结果不足，回退到全视频搜索
    if ((!e5Results || e5Results.length < 5) && timeStart !== null) {
      console.log(`⚠️ Insufficient results (${e5Results?.length || 0}) in time window, expanding to full video search`);
      
      const { data: fullResults, error: fullError } = await supabase.rpc('search_video_embeddings_e5', {
        query_embedding: `[${e5Embedding.join(',')}]`,
        p_attachment_id: targetAttachmentId,
        time_start: null,
        time_end: null,
        match_threshold: 0.5,
        match_count: e5CandidateCount
      });
      
      if (fullError) {
        console.error('❌ Full video search error:', fullError);
        return e5Results || [];
      }
      
      if (fullResults && fullResults.length > 0) {
        console.log(`✅ Fallback: Found ${fullResults.length} candidates from full video`);
        // 使用全视频搜索结果
        const finalE5Results = fullResults;
        
        // 继续使用 finalE5Results 进行 BGE 重排
        const candidateIds = finalE5Results.map((r: any) => r.id);
        
        const { data: bgeResults, error: bgeError } = await supabase
          .from('video_embeddings')
          .select('id, content_text, segment_start_time, segment_end_time, section_title, embedding_bge_m3, attachment_id')
          .in('id', candidateIds)
          .eq('has_bge_embedding', true);
        
        if (bgeError || !bgeResults || bgeResults.length === 0) {
          console.log('⚠️ BGE embeddings not available, using E5 results');
          return finalE5Results.slice(0, maxResults).map((r: any) => ({
            ...r,
            content_type: 'video_segment',
            type: 'video_segment'
          }));
        }
        
        // BGE 重排逻辑（与下面相同）
        const rerankedResults = bgeResults.map((result: any) => {
          const bgeVec = result.embedding_bge_m3;
          let similarity = 0;
          
          if (bgeVec && bgeEmbedding) {
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            
            for (let i = 0; i < Math.min(bgeVec.length, bgeEmbedding.length); i++) {
              dotProduct += bgeVec[i] * bgeEmbedding[i];
              normA += bgeVec[i] * bgeVec[i];
              normB += bgeEmbedding[i] * bgeEmbedding[i];
            }
            
            similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
          }
          
          return {
            id: result.id,
            content_text: result.content_text,
            segment_start_time: result.segment_start_time,
            segment_end_time: result.segment_end_time,
            section_title: result.section_title,
            attachment_id: result.attachment_id,
            similarity: similarity
          };
        });
        
        rerankedResults.sort((a, b) => b.similarity - a.similarity);
        const finalResults = rerankedResults.slice(0, maxResults);
        
        console.log(`✅ BGE Stage: Reranked to top ${finalResults.length} results`);
        console.log(`📊 Similarity range: ${finalResults[0]?.similarity.toFixed(3)} - ${finalResults[finalResults.length - 1]?.similarity.toFixed(3)}`);
        
        return finalResults;
      }
    }
    
    if (!e5Results || e5Results.length === 0) {
      console.log('⚠️ No results from E5 search');
      return [];
    }
    
    const searchScope = timeStart !== null 
      ? `time range ${timeStart}s-${timeEnd}s` 
      : 'whole video';
    console.log(`✅ E5 Stage: Found ${e5Results.length} candidates from ${searchScope}`);
    
    // Stage 2: BGE-M3 精排 - 对候选结果重新排序
    // 获取这些候选的 BGE embeddings 并计算相似度
    const candidateIds = e5Results.map((r: any) => r.id);
    
    const { data: bgeResults, error: bgeError } = await supabase
      .from('video_embeddings')
      .select('id, content_text, segment_start_time, segment_end_time, section_title, embedding_bge_m3, attachment_id')
      .in('id', candidateIds)
      .eq('has_bge_embedding', true);
    
    if (bgeError || !bgeResults || bgeResults.length === 0) {
      console.log('⚠️ BGE embeddings not available, using E5 results');
      return e5Results.slice(0, maxResults).map((r: any) => ({
        ...r,
        content_type: 'video_segment',
        type: 'video_segment'
      }));
    }
    
    // 计算 BGE 相似度并重新排序
    const rerankedResults = bgeResults.map((result: any) => {
      // 计算余弦相似度
      const bgeVec = result.embedding_bge_m3;
      let similarity = 0;
      
      if (bgeVec && bgeEmbedding) {
        // 计算点积
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < Math.min(bgeVec.length, bgeEmbedding.length); i++) {
          dotProduct += bgeVec[i] * bgeEmbedding[i];
          normA += bgeVec[i] * bgeVec[i];
          normB += bgeEmbedding[i] * bgeEmbedding[i];
        }
        
        similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      }
      
      return {
        id: result.id,
        content_text: result.content_text,
        content_type: 'video_segment',  // 添加 content_type
        type: 'video_segment',          // 添加 type
        segment_start_time: result.segment_start_time,
        segment_end_time: result.segment_end_time,
        section_title: result.section_title,
        attachment_id: result.attachment_id,
        similarity: similarity
      };
    });
    
    // 按 BGE 相似度排序
    rerankedResults.sort((a, b) => b.similarity - a.similarity);
    
    const finalResults = rerankedResults.slice(0, maxResults);
    
    console.log(`✅ BGE Stage: Reranked to top ${finalResults.length} results`);
    console.log(`📊 Similarity range: ${finalResults[0]?.similarity.toFixed(3)} - ${finalResults[finalResults.length - 1]?.similarity.toFixed(3)}`);
    
    return finalResults;
    
  } catch (error) {
    console.error('❌ Video search failed:', error);
    return [];
  }
}

// Define schema for structured input
const SearchSchema = z.object({
  query: z.string().describe("The search query"),
  contentTypes: z.array(z.string()).optional().describe("Types of content to search: video_segment, lesson, note, etc."),
  videoContext: z.object({
    lessonId: z.string().optional(),
    attachmentId: z.number().nullable().optional(),
    currentTime: z.number().optional()
  }).optional().describe("Video context for searching specific video segments")
});

// Export the raw search function for direct access to structured results
export async function searchVideoSegments(
  query: string,
  options: {
    lessonId?: string;
    attachmentId?: number;
    currentTime?: number;
    timeWindow?: number;
    maxResults?: number;
  } = {}
): Promise<any[]> {
  return searchVideoEmbeddings(query, options);
}

export const searchTool = new DynamicStructuredTool({
  name: "search",
  description: `Search for relevant content in the INTERNAL knowledge base (course content, lessons, video transcripts, and notes).
  This tool is ONLY for searching internal course materials and should be your PRIMARY search tool.
  Use this for: course content, lesson explanations, video segments, student notes, and any course-related queries.
  DO NOT use this for: latest news, current events, external information, or general web knowledge.
  Provide a query and optionally specify content types and video context for more targeted results.
  Returns JSON with: message, results array, result_count, confidence score (0-1), and hasVideoSegments flag.`,
  schema: SearchSchema,
  func: async (input) => {
    try {
      const { query, contentTypes = [], videoContext } = input;
      const searchQuery = query;
      
      // 检查是否需要搜索视频内容
      const needsVideoSearch = contentTypes.includes('video_segment');
      
      let allResults: any[] = [];
      let rawVideoResults: any[] = []; // Store raw video results for structured access
      
      // 1. 搜索视频 embeddings
      if (needsVideoSearch && videoContext?.lessonId) {
        console.log(`🎬 Searching video embeddings for lesson: ${videoContext.lessonId}`);
        
        const videoResults = await searchVideoEmbeddings(searchQuery, {
          lessonId: videoContext.lessonId,
          attachmentId: videoContext.attachmentId ?? undefined,
          currentTime: videoContext.currentTime,
          maxResults: 5
        });
        
        rawVideoResults = videoResults; // Store raw results
        
        allResults.push(...videoResults.map((r: any) => ({
          type: 'video_segment',
          content_type: 'video_segment', // Add both fields for compatibility
          content: r.content_text,
          content_text: r.content_text,
          startTime: r.segment_start_time,
          endTime: r.segment_end_time,
          segment_start_time: r.segment_start_time, // Add both field names
          segment_end_time: r.segment_end_time,
          title: r.section_title || `Video Segment ${Math.floor(r.segment_start_time)}s`,
          section_title: r.section_title,
          similarity: r.similarity,
          attachment_id: r.attachment_id
        })));
        
        console.log(`✅ Found ${videoResults.length} video segments`);
      }
      
      // 2. 搜索通用内容
      const generalContentTypes = contentTypes.filter((t: string) => t !== 'video_segment');
      if (generalContentTypes.length > 0 || contentTypes.length === 0) {
        const generalResults = await smartSearch(searchQuery, {
          maxResults: 5,
          enhanceResults: false,
          contentTypes: generalContentTypes.length > 0 ? generalContentTypes : undefined
        });
        
        allResults.push(...generalResults.results.map((doc: any) => ({
          type: doc.metadata.contentType || 'course_content',
          content: doc.pageContent,
          title: doc.metadata.title || 'Course Content'
        })));
      }
      
      // 3. Calculate confidence score based on similarity scores
      // Confidence score helps the agent decide whether to use web search as fallback
      let confidenceScore = 0;
      if (allResults.length > 0) {
        // Calculate weighted average similarity score from all results
        const similarityScores = allResults
          .filter(r => r.similarity !== undefined)
          .map(r => r.similarity);
        
        if (similarityScores.length > 0) {
          // Use weighted average: top result has more weight
          const weights = similarityScores.map((_, idx) => 1 / (idx + 1));
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          const weightedSum = similarityScores.reduce((sum, score, idx) => sum + score * weights[idx], 0);
          const weightedAvg = weightedSum / totalWeight;
          
          // Normalize to 0-1 range (similarity scores are typically 0-1 already)
          confidenceScore = Math.min(1, Math.max(0, weightedAvg));
          
          // Apply penalty if result count is low
          if (allResults.length < 2) {
            confidenceScore *= 0.7; // Reduce confidence if only 1 result
          }
        } else {
          // If no similarity scores available, use moderate confidence based on result count
          // This ensures low confidence triggers web search fallback
          confidenceScore = allResults.length >= 3 ? 0.6 : (allResults.length >= 2 ? 0.5 : 0.4);
        }
      }
      
      console.log(`📊 Search confidence: ${confidenceScore.toFixed(2)} (${allResults.length} results)`);
      
      
      // 4. Format results - Return JSON string with structured data
      if (allResults.length === 0) {
        return JSON.stringify({
          message: 'No relevant content found. Try rephrasing your question or ask about general concepts.',
          results: [],
          count: 0,
          result_count: 0,
          confidence: 0,
          hasVideoSegments: false
        });
      }
      
      const formattedResults = allResults.map((result, index) => {
        let resultText = `[${index + 1}] ${result.type}: ${result.content.substring(0, 200)}...`;
        
        if (result.type === 'video_segment' && result.startTime !== undefined) {
          resultText += `\n   Time: ${Math.floor(result.startTime)}s - ${Math.floor(result.endTime)}s`;
        }
        
        if (result.similarity) {
          resultText += `\n   Relevance: ${(result.similarity * 100).toFixed(1)}%`;
        }
        
        return resultText;
      }).join('\n\n');
      
      // Return JSON with both formatted text and structured data
      return JSON.stringify({
        message: `Found ${allResults.length} relevant results:\n\n${formattedResults}`,
        results: allResults, // Include structured results
        count: allResults.length,
        result_count: allResults.length, // Add result_count field for agent decision-making
        confidence: confidenceScore, // Add confidence score (0-1) for agent decision-making
        hasVideoSegments: rawVideoResults.length > 0
      });
      
    } catch (error) {
      console.error('Search tool error:', error);
      return JSON.stringify({
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [],
        count: 0,
        result_count: 0,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});
