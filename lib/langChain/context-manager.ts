import { getVectorStore } from './vectorstore';
import { preprocessTextForEmbedding, generateDualEmbedding } from './embedding';
import { createClient } from '@supabase/supabase-js';

// 上下文块接口
interface ContextChunk {
  id: number;
  contentType: string;
  contentId: number;
  text: string;
  similarityE5: number;
  similarityBGE: number;
  combinedSimilarity: number;
  embeddingTypes: 'dual' | 'e5_only' | 'bge_only';
  metadata: {
    chunkType?: string;
    hierarchyLevel?: number;
    sectionTitle?: string;
    wordCount?: number;
    createdAt: string;
  };
}

// 上下文配置
interface ContextConfig {
  maxTokens: number;
  maxChunks: number;
  minSimilarity: number;
  contentTypeWeights: Record<string, number>;
  diversityThreshold: number;
  includeMetadata: boolean;
}

// 默认配置
const DEFAULT_CONFIG: ContextConfig = {
  maxTokens: 4000,
  maxChunks: 10,
  minSimilarity: 0.7,
  contentTypeWeights: {
    'course': 1.0,
    'lesson': 1.0,
    'quiz_question': 0.9,
    'course_note': 0.8,
    'post': 0.7,
    'comment': 0.6
  },
  diversityThreshold: 0.85,
  includeMetadata: true
};

export class ContextManager {
  private readonly supabase;
  private readonly vectorStore;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.vectorStore = getVectorStore();
  }

  /**
   * 基于查询获取相关上下文
   */
  async getRelevantContext(
    query: string,
    config: Partial<ContextConfig> = {},
    userId?: number,
    contentTypes?: string[]
  ): Promise<{
    context: string;
    chunks: ContextChunk[];
    metadata: {
      totalTokens: number;
      chunkCount: number;
      avgSimilarity: number;
      contentTypeDistribution: Record<string, number>;
    };
  }> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    console.log('🔍 Getting relevant context for query:', query.substring(0, 100) + '...');

    // 1. 生成查询embedding
    const queryEmbeddings = await this.generateQueryEmbeddings(query);
    
    // 2. 执行双模型搜索
    const searchResults = await this.performHybridSearch(
      queryEmbeddings,
      contentTypes,
      finalConfig,
      userId
    );

    // 3. 处理和过滤结果
    const processedChunks = await this.processSearchResults(searchResults, finalConfig);

    // 4. 选择最佳chunks (多样性 + 相关性)
    const selectedChunks = this.selectOptimalChunks(processedChunks, finalConfig);

    // 5. 构建上下文文本
    const contextText = this.buildContextText(selectedChunks, finalConfig);

    // 6. 计算元数据
    const metadata = this.calculateContextMetadata(selectedChunks);

    console.log(`✅ Generated context with ${selectedChunks.length} chunks (${metadata.totalTokens} tokens)`);

    return {
      context: contextText,
      chunks: selectedChunks,
      metadata
    };
  }

  /**
   * 生成查询的双embedding
   */
  private async generateQueryEmbeddings(query: string) {
    const preprocessedQuery = preprocessTextForEmbedding(query);
    return await generateDualEmbedding(preprocessedQuery);
  }

  /**
   * 执行混合搜索
   */
  private async performHybridSearch(
    queryEmbeddings: any,
    contentTypes?: string[],
    config: ContextConfig = DEFAULT_CONFIG,
    userId?: number
  ) {
    const searchParams = {
      queryEmbeddingE5: queryEmbeddings.e5Small ? `[${queryEmbeddings.e5Small.join(',')}]` : null,
      queryEmbeddingBGE: queryEmbeddings.bgeM3 ? `[${queryEmbeddings.bgeM3.join(',')}]` : null,
      contentTypes: contentTypes || ['course', 'lesson', 'quiz_question', 'course_note', 'post'],
      matchThreshold: config.minSimilarity,
      matchCount: Math.min(config.maxChunks * 2, 50), // 获取更多然后过滤
      weightE5: 0.4,
      weightBGE: 0.6,
      userId
    };

    // 调用数据库的混合搜索函数
    const { data, error } = await this.supabase.rpc('search_embeddings_hybrid', searchParams);
    
    if (error) {
      console.error('❌ Hybrid search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 处理搜索结果
   */
  private async processSearchResults(
    searchResults: any[], 
    config: ContextConfig
  ): Promise<ContextChunk[]> {
    return searchResults.map(result => ({
      id: result.content_id,
      contentType: result.content_type,
      contentId: result.content_id,
      text: result.content_text,
      similarityE5: result.individual_scores?.e5_similarity || 0,
      similarityBGE: result.individual_scores?.bge_similarity || 0,
      combinedSimilarity: result.similarity,
      embeddingTypes: result.embedding_types,
      metadata: {
        chunkType: result.chunk_type,
        hierarchyLevel: result.hierarchy_level,
        sectionTitle: result.section_title,
        wordCount: result.word_count,
        createdAt: result.created_at
      }
    })).filter(chunk => 
      chunk.combinedSimilarity >= config.minSimilarity &&
      chunk.text.length > 20 // 过滤过短内容
    );
  }

  /**
   * 选择最佳chunks (平衡相关性和多样性)
   */
  private selectOptimalChunks(
    chunks: ContextChunk[],
    config: ContextConfig
  ): ContextChunk[] {
    // 按相关性排序
    chunks.sort((a, b) => b.combinedSimilarity - a.combinedSimilarity);

    const selectedChunks: ContextChunk[] = [];
    let totalTokens = 0;
    const estimatedTokensPerWord = 1.3;

    for (const chunk of chunks) {
      // 检查token限制
      const chunkTokens = (chunk.metadata.wordCount || chunk.text.split(' ').length) * estimatedTokensPerWord;
      if (totalTokens + chunkTokens > config.maxTokens) {
        break;
      }

      // 检查多样性 (避免选择过于相似的内容)
      const isDiverse = this.checkDiversity(chunk, selectedChunks, config.diversityThreshold);
      if (!isDiverse && selectedChunks.length > 0) {
        continue;
      }

      // 应用内容类型权重
      const typeWeight = config.contentTypeWeights[chunk.contentType] || 0.5;
      if (typeWeight < 0.6 && selectedChunks.length >= 3) {
        continue; // 优先保留高价值内容类型
      }

      selectedChunks.push(chunk);
      totalTokens += chunkTokens;

      if (selectedChunks.length >= config.maxChunks) {
        break;
      }
    }

    return selectedChunks;
  }

  /**
   * 检查内容多样性
   */
  private checkDiversity(
    candidate: ContextChunk,
    selected: ContextChunk[],
    threshold: number
  ): boolean {
    if (selected.length === 0) return true;

    // 简单的文本相似度检查
    for (const existing of selected) {
      const similarity = this.calculateTextSimilarity(candidate.text, existing.text);
      if (similarity > threshold) {
        return false; // 太相似了
      }
    }
    return true;
  }

  /**
   * 计算文本相似度 (简单Jaccard相似度)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 构建上下文文本
   */
  private buildContextText(chunks: ContextChunk[], config: ContextConfig): string {
    if (chunks.length === 0) return '';

    const contextParts: string[] = [];

    // 按内容类型和相关性组织
    const groupedChunks = this.groupChunksByType(chunks);

    for (const [contentType, typeChunks] of Object.entries(groupedChunks)) {
      if (typeChunks.length === 0) continue;

      // 添加类型标题
      const typeLabel = this.getContentTypeLabel(contentType);
      contextParts.push(`## ${typeLabel}\n`);

      // 添加chunks，按相关性排序
      typeChunks
        .sort((a, b) => b.combinedSimilarity - a.combinedSimilarity)
        .forEach((chunk, index) => {
          let chunkText = `### ${contentType} ${index + 1}\n`;
          
          if (config.includeMetadata && chunk.metadata.sectionTitle) {
            chunkText += `**Section:** ${chunk.metadata.sectionTitle}\n`;
          }
          
          chunkText += `${chunk.text.trim()}\n`;
          
          if (config.includeMetadata) {
            chunkText += `*Relevance: ${(chunk.combinedSimilarity * 100).toFixed(1)}%*\n`;
          }
          
          contextParts.push(chunkText);
        });

      contextParts.push(''); // 空行分隔
    }

    return contextParts.join('\n');
  }

  /**
   * 按内容类型分组
   */
  private groupChunksByType(chunks: ContextChunk[]): Record<string, ContextChunk[]> {
    return chunks.reduce((groups, chunk) => {
      const type = chunk.contentType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(chunk);
      return groups;
    }, {} as Record<string, ContextChunk[]>);
  }

  /**
   * 获取内容类型标签
   */
  private getContentTypeLabel(contentType: string): string {
    const labels: Record<string, string> = {
      'course': 'Course Information',
      'lesson': 'Lesson Content',
      'quiz_question': 'Quiz Questions',
      'course_note': 'Course Notes',
      'post': 'Community Posts',
      'comment': 'Comments',
      'classroom': 'Classroom Information',
      'live_session': 'Live Sessions',
      'assignment': 'Assignments'
    };
    return labels[contentType] || contentType.charAt(0).toUpperCase() + contentType.slice(1);
  }

  /**
   * 计算上下文元数据
   */
  private calculateContextMetadata(chunks: ContextChunk[]) {
    const totalTokens = chunks.reduce((sum, chunk) => 
      sum + ((chunk.metadata.wordCount || chunk.text.split(' ').length) * 1.3), 0
    );

    const avgSimilarity = chunks.reduce((sum, chunk) => 
      sum + chunk.combinedSimilarity, 0
    ) / chunks.length;

    const contentTypeDistribution = chunks.reduce((dist, chunk) => {
      dist[chunk.contentType] = (dist[chunk.contentType] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalTokens: Math.round(totalTokens),
      chunkCount: chunks.length,
      avgSimilarity: Math.round(avgSimilarity * 100) / 100,
      contentTypeDistribution
    };
  }

  /**
   * 获取特定内容的相关上下文
   */
  async getContentRelatedContext(
    contentType: string,
    contentId: number,
    config: Partial<ContextConfig> = {},
    contentTypesOverride?: string[]
  ): Promise<string> {
    // 获取原始内容
    const { data: originalContent } = await this.supabase
      .from('embeddings')
      .select('content_text')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .single();

    if (!originalContent) {
      throw new Error(`Content not found: ${contentType}:${contentId}`);
    }

    // 基于原始内容获取相关上下文
    const result = await this.getRelevantContext(
      originalContent.content_text,
      config,
      undefined,
      contentTypesOverride || ['course', 'lesson', 'quiz_question', 'course_note', 'post']
    );

    return result.context;
  }
}

export const contextManager = new ContextManager();
