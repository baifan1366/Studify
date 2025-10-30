// Search Tool - 语义搜索工具（支持视频 embeddings）
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import { smartSearch } from '../langchain-integration';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../embedding';

// 搜索视频 embeddings
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
    const { embedding } = await generateEmbedding(query, 'e5');
    
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
    
    // 计算时间范围
    let timeStart: number | null = null;
    let timeEnd: number | null = null;
    if (currentTime !== undefined) {
      timeStart = Math.max(0, currentTime - timeWindow);
      timeEnd = currentTime + timeWindow;
    }
    
    // 执行搜索
    const { data, error } = await supabase.rpc('search_video_embeddings_e5', {
      query_embedding: `[${embedding.join(',')}]`,
      p_attachment_id: targetAttachmentId,
      time_start: timeStart,
      time_end: timeEnd,
      match_threshold: 0.7,
      match_count: maxResults
    });
    
    if (error) {
      console.error('❌ Video embeddings search error:', error);
      return [];
    }
    
    console.log(`✅ Video search returned ${data?.length || 0} results`);
    return data || [];
    
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
    attachmentId: z.number().optional(),
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
          attachmentId: videoContext.attachmentId,
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
