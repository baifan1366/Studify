// Video Learning AI Assistant - Double-call pattern implementation
// 临时解决方案：利用现有文本资源做检索，预留video embeddings集成接口

import { EnhancedAIWorkflowExecutor } from './tool-calling-integration';
import { smartSearch, answerQuestion } from './langchain-integration';
import { createClient } from '@supabase/supabase-js';
import { videoAICache } from './video-ai-cache';

export interface VideoContext {
  courseSlug: string;
  currentLessonId?: string;
  currentTimestamp?: number;
  selectedText?: string;
}

export interface AISource {
  type: 'course_content' | 'lesson' | 'note' | 'web' | 'metadata' | 'video_segment';
  title: string;
  timestamp?: number;
  url?: string;
  contentPreview?: string;
}

export interface QuestionAnalysis {
  searchQueries: string[];
  keyTerms: string[];
  requiresCourseSpecific: boolean;
  confidenceThreshold: number;
  suggestedFallback: 'web_search' | 'course_metadata' | 'none';
}

export interface EvidenceGathering {
  courseContent: any[];
  metadata: any[];
  userContext: any[];
  confidence: number;
  sources: AISource[];
}

export interface AIAssistantResponse {
  answer: string;
  sources: AISource[];
  confidence: number;
  webSearchUsed: boolean;
  suggestedActions: string[];
  relatedConcepts: string[];
  processingTime: number;
}

export class VideoLearningAIAssistant extends EnhancedAIWorkflowExecutor {
  
  /**
   * Get Supabase client
   */
  private getSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main entry point - orchestrates the double-call pattern with caching
   */
  async assistUser(
    question: string,
    videoContext: VideoContext,
    userId: number,
    conversationHistory?: Array<{role: string; content: string}>
  ): Promise<AIAssistantResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🎓 Video AI Assistant: Processing question for user ${userId}`);
      console.log(`📍 Context: ${videoContext.courseSlug} | Lesson: ${videoContext.currentLessonId} | Time: ${videoContext.currentTimestamp}s`);

      // Check cache first
      const cachedResponse = await videoAICache.get(question, videoContext);
      if (cachedResponse) {
        const processingTime = Date.now() - startTime;
        console.log(`⚡ Cache hit! Returning cached response in ${processingTime}ms`);
        
        return {
          answer: cachedResponse.answer,
          sources: cachedResponse.sources,
          confidence: cachedResponse.confidence,
          webSearchUsed: false, // Cached response
          suggestedActions: ["查看相关课程材料", "做笔记记录要点", "尝试相关练习题"],
          relatedConcepts: [],
          processingTime
        };
      }

      // Stage 1: Analyze question and plan retrieval strategy
      const questionAnalysis = await this.analyzeQuestion(question, videoContext, userId);
      
      // Stage 2: Gather evidence from multiple sources
      const evidence = await this.gatherEvidence(questionAnalysis, videoContext, userId);
      
      // Stage 3: Web search fallback if confidence is low
      let webResults = null;
      if (evidence.confidence < questionAnalysis.confidenceThreshold) {
        console.log(`⚠️ Low confidence (${evidence.confidence}), triggering fallback search`);
        webResults = await this.webSearchFallback(question, questionAnalysis, evidence);
      }
      
      // Stage 4: Synthesize final answer
      const finalAnswer = await this.synthesizeAnswer(
        question, 
        evidence, 
        webResults, 
        videoContext,
        conversationHistory
      );

      const processingTime = Date.now() - startTime;
      console.log(`✅ Video AI Assistant completed in ${processingTime}ms`);

      const response: AIAssistantResponse = {
        answer: finalAnswer.content,
        sources: evidence.sources,
        confidence: evidence.confidence,
        webSearchUsed: !!webResults,
        suggestedActions: finalAnswer.suggestedActions || [],
        relatedConcepts: finalAnswer.relatedConcepts || [],
        processingTime
      };

      // Cache the response for future use
      await videoAICache.set(
        question, 
        response.answer, 
        response.sources, 
        response.confidence,
        videoContext
      );

      return response;

    } catch (error) {
      console.error('❌ Video AI Assistant error:', error);
      
      return {
        answer: "抱歉，我在处理您的问题时遇到了技术问题。请稍后再试，或者尝试重新表述您的问题。",
        sources: [],
        confidence: 0,
        webSearchUsed: false,
        suggestedActions: ["请稍后重试", "尝试重新表述问题", "查看课程材料"],
        relatedConcepts: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Stage 1: Question Understanding & Retrieval Planning (LLM1)
   */
  private async analyzeQuestion(
    question: string,
    videoContext: VideoContext,
    userId: number
  ): Promise<QuestionAnalysis> {
    const contextPrompt = `
    作为教育AI助手，分析这个学生问题并制定检索策略：

    问题: "${question}"
    
    学习上下文:
    - 课程: ${videoContext.courseSlug}
    - 当前课节: ${videoContext.currentLessonId || '未指定'}
    - 视频时间点: ${videoContext.currentTimestamp || 0} 秒
    - 选中文本: ${videoContext.selectedText || '无'}

    请分析并返回JSON格式的检索策略：
    {
      "searchQueries": ["优化后的搜索关键词1", "搜索关键词2"],
      "keyTerms": ["核心概念1", "核心概念2"],
      "requiresCourseSpecific": true/false,
      "confidenceThreshold": 0.7,
      "suggestedFallback": "web_search" | "course_metadata" | "none"
    }

    分析要点：
    1. 提取核心概念和关键词
    2. 判断是否需要课程特定内容
    3. 设置合适的置信度阈值
    4. 建议备用策略
    `;

    try {
      const result = await this.simpleAICallWithTools(contextPrompt, {
        toolCategories: ['CONTENT_ANALYSIS'],
        userId,
        enableTools: true,
        model: "x-ai/grok-4-fast:free",
        temperature: 0.2
      });

      // 尝试解析JSON响应
      const jsonMatch = result.result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          searchQueries: parsed.searchQueries || [question],
          keyTerms: parsed.keyTerms || [],
          requiresCourseSpecific: parsed.requiresCourseSpecific !== false,
          confidenceThreshold: parsed.confidenceThreshold || 0.7,
          suggestedFallback: parsed.suggestedFallback || 'web_search'
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse question analysis, using fallback');
    }

    // Fallback analysis
    return {
      searchQueries: [question],
      keyTerms: question.split(' ').filter(word => word.length > 2),
      requiresCourseSpecific: true,
      confidenceThreshold: 0.6, // 降低阈值，只有真正低置信度才触发web search
      suggestedFallback: 'web_search'
    };
  }

  /**
   * Stage 2: Multi-source Evidence Gathering
   */
  private async gatherEvidence(
    analysis: QuestionAnalysis,
    videoContext: VideoContext,
    userId: number
  ): Promise<EvidenceGathering> {
    console.log(`🔍 Gathering evidence using ${analysis.searchQueries.length} search queries`);

    const evidencePromises = [
      // 1. 语义搜索课程内容 (使用现有embedding系统)
      this.searchCourseContent(analysis.searchQueries, videoContext.courseSlug),
      // 2. 查询结构化课程元数据
      this.queryCourseMetadata(videoContext.courseSlug, videoContext.currentLessonId),
      // 3. 获取用户上下文 (笔记、进度等)  
      this.getUserLearningContext(userId, videoContext.courseSlug),
      // 4. 搜索视频片段 (Mock - 为未来Whisper集成预留)
      this.searchVideoSegments(analysis.searchQueries, videoContext.currentLessonId)
    ];

    try {
      const [courseContent, metadata, userContext, videoSegments] = await Promise.all(evidencePromises);
      
      const allEvidence = [...courseContent, ...metadata, ...userContext, ...videoSegments];
      const confidence = this.calculateConfidence(allEvidence, analysis);
      
      const sources: AISource[] = allEvidence.map(item => ({
        type: item.contentType || 'course_content',
        title: item.title || item.metadata?.title || 'Course Content',
        timestamp: item.timestamp,
        contentPreview: item.content?.substring(0, 100) + '...'
      }));

      console.log(`📊 Evidence gathered: ${allEvidence.length} items, confidence: ${confidence}`);

      return {
        courseContent,
        metadata,
        userContext,
        confidence,
        sources
      };

    } catch (error) {
      console.error('❌ Evidence gathering failed:', error);
      return {
        courseContent: [],
        metadata: [],
        userContext: [],
        confidence: 0,
        sources: []
      };
    }
  }

  /**
   * Search video segments using real database embeddings
   */
  private async searchVideoSegments(queries: string[], lessonId?: string): Promise<any[]> {
    try {
      const supabase = this.getSupabaseClient();
      
      if (!lessonId) {
        console.log('⚠️ No lessonId provided, skipping video segment search');
        return [];
      }

      // First, find the course attachment for this lesson
      const { data: lessonData } = await supabase
        .from('course_lesson')
        .select(`
          id,
          course_attachments!inner(
            id,
            filename,
            file_type
          )
        `)
        .eq('public_id', lessonId)
        .eq('course_attachments.file_type', 'video')
        .single();

      if (!lessonData || !lessonData.course_attachments || lessonData.course_attachments.length === 0) {
        console.log('⚠️ No video attachment found for lesson:', lessonId);
        return [];
      }

      const attachment = lessonData.course_attachments[0]; // Take first video attachment
      const attachmentId = attachment.id;
      console.log(`🎬 Searching video embeddings for attachment ${attachmentId}`);

      // Search for video embeddings using semantic similarity
      const allResults = [];
      
      for (const query of queries) {
        // Direct search in video_embeddings table with text similarity
        const { data: embeddings, error } = await supabase
          .from('video_embeddings')
          .select(`
            id,
            content_text,
            section_title,
            segment_start_time,
            segment_end_time,
            segment_index,
            segment_duration,
            confidence_score,
            attachment_id
          `)
          .eq('attachment_id', attachmentId)
          .eq('status', 'completed')
          .textSearch('content_text', query)
          .order('segment_start_time', { ascending: true })
          .limit(3);

        if (error) {
          console.warn('⚠️ Video embedding search error:', error);
          continue;
        }

        if (embeddings && embeddings.length > 0) {
          const formattedResults = embeddings.map((embedding: any) => ({
            contentType: 'video_segment',
            title: embedding.section_title || `Video Segment ${embedding.segment_index || 'Unknown'}`,
            content: embedding.content_text,
            startTime: embedding.segment_start_time,
            endTime: embedding.segment_end_time,
            timestamp: embedding.segment_start_time,
            confidence: embedding.similarity_score || 0.8,
            metadata: {
              id: `video_embedding_${embedding.id}`,
              type: 'video_segment',
              lessonId,
              attachmentId: embedding.attachment_id,
              segmentIndex: embedding.segment_index,
              duration: embedding.segment_duration
            }
          }));
          
          allResults.push(...formattedResults);
        }
      }

      // Remove duplicates based on segment_start_time
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.startTime === item.startTime)
      );

      console.log(`🎬 Found ${uniqueResults.length} video segments from database for queries: ${queries.join(', ')}`);
      return uniqueResults.slice(0, 3); // Return max 3 segments

    } catch (error) {
      console.error('❌ Video embeddings search failed:', error);
      
      // Fallback to mock data if database search fails
      console.log('🔄 Falling back to mock video segments');
      return this.getMockVideoSegments(queries, lessonId);
    }
  }

  /**
   * Fallback mock video segments when database search fails
   */
  private getMockVideoSegments(queries: string[], lessonId?: string): any[] {
    const mockSegments = [
      {
        contentType: 'video_segment',
        title: '核心概念讲解片段',
        content: '这一部分主要讲解了核心概念的定义和重要性，包括实际应用场景...',
        startTime: 125,
        endTime: 187,
        timestamp: 125,
        confidence: 0.85, // Lower confidence for mock data
        metadata: { 
          id: `mock_video_${lessonId}_segment_1`, 
          type: 'video_segment',
          lessonId,
          isMock: true
        }
      }
    ];

    // Simple text matching for mock data
    const relevantSegments = mockSegments.filter(segment => 
      queries.some(query => 
        segment.content.toLowerCase().includes(query.toLowerCase()) ||
        segment.title.toLowerCase().includes(query.toLowerCase())
      )
    );

    return relevantSegments.slice(0, 1); // Return only 1 mock segment
  }

  /**
   * Search course content using existing embedding system
   */
  private async searchCourseContent(queries: string[], courseSlug: string): Promise<any[]> {
    try {
      const allResults = [];
      
      for (const query of queries) {
        const results = await smartSearch(query, {
          maxResults: 3,
          enhanceResults: true,
          contentTypes: ['course', 'lesson']
        });
        
        allResults.push(...results.results);
      }
      
      // 去重并返回最相关的结果
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.metadata?.id === item.metadata?.id)
      );
      
      return uniqueResults.slice(0, 5); // 最多返回5个结果
    } catch (error) {
      console.warn('⚠️ Course content search failed, returning empty results');
      return [];
    }
  }

  /**
   * Query structured course metadata from database
   */
  private async queryCourseMetadata(courseSlug: string, currentLessonId?: string): Promise<any[]> {
    try {
      const supabase = this.getSupabaseClient();
      const results: any[] = [];
      
      // 获取课程基本信息
      const { data: courseData } = await supabase
        .from('course')
        .select('id, title, description, learning_objectives, requirements')
        .eq('slug', courseSlug)
        .single();
      
      if (courseData) {
        results.push({
          contentType: 'metadata',
          title: `课程: ${courseData.title}`,
          content: `${courseData.description}\n学习目标: ${courseData.learning_objectives?.join(', ')}\n前置要求: ${courseData.requirements?.join(', ')}`,
          metadata: { id: `course_${courseData.id}`, type: 'course' }
        });
      }

      // 获取当前课节信息
      if (currentLessonId && courseData) {
        const { data: lessonData } = await supabase
          .from('course_lesson')
          .select('id, title, description, transcript')
          .eq('course_id', courseData.id)
          .eq('public_id', currentLessonId)
          .single();

        if (lessonData) {
          results.push({
            contentType: 'lesson',
            title: `课节: ${lessonData.title}`,
            content: `${lessonData.description || ''}\n${lessonData.transcript || ''}`,
            metadata: { id: `lesson_${lessonData.id}`, type: 'lesson' }
          });
        }
      }

      return results;
    } catch (error) {
      console.warn('⚠️ Course metadata query failed:', error);
      return [];
    }
  }

  /**
   * Get user learning context (notes, progress, etc.)
   */
  private async getUserLearningContext(userId: number, courseSlug: string): Promise<any[]> {
    try {
      const supabase = this.getSupabaseClient();
      const results: any[] = [];
      
      // 获取用户在此课程的笔记
      const { data: notesData } = await supabase
        .from('course_notes')
        .select('content, ai_summary, timestamp_sec, course_lesson(title)')
        .eq('user_id', userId)
        .limit(3)
        .order('created_at', { ascending: false });
      
      if (notesData) {
        notesData.forEach((note: any, index: number) => {
          results.push({
            contentType: 'note',
            title: `我的笔记: ${note.course_lesson?.title || ''}`,
            content: note.ai_summary || note.content,
            timestamp: note.timestamp_sec,
            metadata: { id: `note_${index}`, type: 'user_note' }
          });
        });
      }

      return results;
    } catch (error) {
      console.warn('⚠️ User learning context query failed:', error);
      return [];
    }
  }

  /**
   * Calculate confidence based on evidence quality and relevance
   */
  private calculateConfidence(evidence: any[], analysis: QuestionAnalysis): number {
    if (evidence.length === 0) return 0;
    
    let confidence = 0.2; // Base confidence
    
    // 根据证据数量调整 - 更多证据增加置信度
    confidence += Math.min(evidence.length * 0.08, 0.25);
    
    // 根据关键词匹配度调整
    const keyTermMatches = evidence.filter(item => 
      analysis.keyTerms.some(term => 
        (item.content || '').toLowerCase().includes(term.toLowerCase())
      )
    ).length;
    
    if (evidence.length > 0) {
      confidence += (keyTermMatches / evidence.length) * 0.25;
    }
    
    // 根据内容类型调整 - 不同来源的权重
    const typeWeights = {
      'video_segment': 0.3,    // 视频片段权重最高
      'course': 0.25,          // 课程内容
      'lesson': 0.25,          // 课节内容  
      'note': 0.2,            // 用户笔记
      'metadata': 0.15,       // 元数据
      'web': 0.1              // 网络搜索权重最低
    };
    
    const weightedScore = evidence.reduce((acc, item) => {
      const weight = typeWeights[item.contentType as keyof typeof typeWeights] || 0.1;
      return acc + weight;
    }, 0);
    
    confidence += Math.min(weightedScore / evidence.length, 0.3);
    
    // 如果有高置信度的视频片段，额外加分
    const videoSegments = evidence.filter(item => item.contentType === 'video_segment');
    if (videoSegments.length > 0) {
      const avgVideoConfidence = videoSegments.reduce((sum, seg) => sum + (seg.confidence || 0.8), 0) / videoSegments.length;
      confidence += avgVideoConfidence * 0.15;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Stage 3: Web Search Fallback (only when confidence is low)
   */
  private async webSearchFallback(
    question: string, 
    analysis: QuestionAnalysis,
    evidence: EvidenceGathering
  ): Promise<any> {
    if (evidence.confidence > analysis.confidenceThreshold) {
      return null; // Skip web search
    }

    console.log(`🔍 Triggering web search fallback for low confidence answer`);

    try {
      // 使用现有的搜索工具
      const webSearchPrompt = `
      学生问题获得的本地答案置信度较低 (${evidence.confidence})。
      请搜索网络资源来补充回答这个问题: "${question}"
      
      关键词: ${analysis.keyTerms.join(', ')}
      专注于教育内容和权威来源。
      `;

      const result = await this.simpleAICallWithTools(webSearchPrompt, {
        toolCategories: ['SEARCH_AND_QA'],
        enableTools: true,
        model: "x-ai/grok-4-fast:free",
        temperature: 0.3
      });

      return {
        content: result.result,
        sources: ['网络搜索结果'],
        confidence: 0.6 // Web search gets medium confidence
      };

    } catch (error) {
      console.warn('⚠️ Web search fallback failed:', error);
      return null;
    }
  }

  /**
   * Stage 4: Final Answer Synthesis (LLM2)
   */
  private async synthesizeAnswer(
    originalQuestion: string,
    evidence: EvidenceGathering,
    webResults: any,
    videoContext: VideoContext,
    conversationHistory?: Array<{role: string; content: string}>
  ): Promise<{content: string; suggestedActions: string[]; relatedConcepts: string[]}> {
    
    // 构建上下文信息
    let contextText = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextText = `\n对话历史:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n`;
    }

    const synthesisPrompt = `
    作为专业的教育AI助手，请基于收集到的信息为学生提供全面、准确的回答。

    学生问题: "${originalQuestion}"
    ${contextText}
    学习情境:
    - 课程: ${videoContext.courseSlug}
    - 课节: ${videoContext.currentLessonId || '未指定'}
    - 时间点: ${videoContext.currentTimestamp || 0}秒
    - 选中内容: ${videoContext.selectedText || '无'}

    可用信息:
    
    课程内容证据:
    ${evidence.courseContent.map(item => `- ${item.title}: ${item.content?.substring(0, 200) || ''}`).join('\n')}
    
    课程元数据:
    ${evidence.metadata.map(item => `- ${item.title}: ${item.content?.substring(0, 200) || ''}`).join('\n')}
    
    用户学习记录:
    ${evidence.userContext.map(item => `- ${item.title}: ${item.content?.substring(0, 200) || ''}`).join('\n')}
    
    ${webResults ? `网络补充信息:\n${webResults.content}\n` : ''}

    请提供:
    1. 清晰、教育性的回答 (用中文)
    2. 针对当前学习情境的具体建议
    3. 相关概念延伸
    4. 后续学习建议

    回答要求:
    - 语言亲和，适合学生理解
    - 结合具体的学习情境
    - 提供可操作的学习建议
    - 鼓励深度思考和探索
    `;

    try {
      const result = await this.simpleAICallWithTools(synthesisPrompt, {
        toolCategories: ['CONTENT_ANALYSIS', 'RECOMMENDATIONS'],
        enableTools: true,
        model: "x-ai/grok-4-fast:free",
        temperature: 0.4
      });

      // 解析建议操作和相关概念 (可以从AI回答中提取或使用默认值)
      const suggestedActions = [
        "查看相关课程材料",
        "做笔记记录要点",
        "尝试相关练习题"
      ];

      const relatedConcepts = evidence.courseContent
        .map(item => item.title)
        .slice(0, 3);

      return {
        content: result.result,
        suggestedActions,
        relatedConcepts
      };

    } catch (error) {
      console.error('❌ Answer synthesis failed:', error);
      return {
        content: "基于课程内容，我尝试为您提供帮助，但目前遇到了一些技术问题。建议您查看课程资料或向老师咨询。",
        suggestedActions: ["查看课程资料", "向老师提问", "复习相关章节"],
        relatedConcepts: []
      };
    }
  }
}

// 导出单例实例
export const videoAIAssistant = new VideoLearningAIAssistant();
