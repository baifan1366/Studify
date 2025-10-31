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
    
    console.log(`🎯 Two-stage search: E5 (whole video) → BGE-M3 (top ${maxResults})`);
    
    // Stage 1: E5 粗筛 - 搜索整个视频，不限时间窗口
    // 返回 top 30 结果用于第二阶段重排
    const e5CandidateCount = Math.max(30, maxResults * 3);
    
    const { data: e5Results, error: e5Error } = await supabase.rpc('search_video_embeddings_e5', {
      query_embedding: `[${e5Embedding.join(',')}]`,
      p_attachment_id: targetAttachmentId,
      time_start: null,  // 不限制时间范围，搜索整个视频
      time_end: null,
      match_threshold: 0.5,  // 降低阈值以获取更多候选
      match_count: e5CandidateCount
    });
    
    if (e5Error) {
      console.error('❌ E5 search error:', e5Error);
      return [];
    }
    
    if (!e5Results || e5Results.length === 0) {
      console.log('⚠️ No results from E5 search');
      return [];
    }
    
    console.log(`✅ E5 Stage: Found ${e5Results.length} candidates from whole video`);
    
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
      return e5Results.slice(0, maxResults);
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

export const searchTool = new DynamicStructuredTool({
  name: "search",
  description: `Search for relevant content in the knowledge base, including video transcripts. 
  Provide a query and optionally specify content types and video context for more targeted results.`,
  schema: SearchSchema,
  func: async (input) => {
    try {
      const { query, contentTypes = [], videoContext } = input;
      const searchQuery = query;
      
      // 检查是否需要搜索视频内容
      const needsVideoSearch = contentTypes.includes('video_segment');
      
      let allResults: any[] = [];
      
      // 1. 搜索视频 embeddings
      if (needsVideoSearch && videoContext?.lessonId) {
        console.log(`🎬 Searching video embeddings for lesson: ${videoContext.lessonId}`);
        
        const videoResults = await searchVideoEmbeddings(searchQuery, {
          lessonId: videoContext.lessonId,
          attachmentId: videoContext.attachmentId ?? undefined,
          currentTime: videoContext.currentTime,
          maxResults: 5
        });
        
        allResults.push(...videoResults.map((r: any) => ({
          type: 'video_segment',
          content: r.content_text,
          startTime: r.segment_start_time,
          endTime: r.segment_end_time,
          title: r.section_title || `Video Segment ${Math.floor(r.segment_start_time)}s`,
          similarity: r.similarity
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
      
      // 3. 格式化结果
      if (allResults.length === 0) {
        return 'No relevant content found. Try rephrasing your question or ask about general concepts.';
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
      
      return `Found ${allResults.length} relevant results:\n\n${formattedResults}`;
      
    } catch (error) {
      console.error('Search tool error:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
