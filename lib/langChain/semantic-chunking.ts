import { cosineSimilarity } from './embedding';

// 语义分块配置
export interface SemanticChunkingConfig {
  maxChunkSize: number;
  minChunkSize: number;
  overlapSize: number;
  similarityThreshold: number;
  preserveBoundaries: boolean;
}

// 增强的块元数据
export interface EnhancedChunkMetadata {
  chunkId: string;
  contentType: string;
  contentId: string;
  chunkType: 'summary' | 'section' | 'paragraph' | 'detail';
  hierarchyLevel: number;
  parentChunkId?: string;
  sectionTitle?: string;
  semanticDensity: number;
  keyTerms: string[];
  sentenceCount: number;
  wordCount: number;
  hasCodeBlock: boolean;
  hasTable: boolean;
  hasList: boolean;
  language: string;
}

// 语义块结构
export interface SemanticChunk {
  id: string;
  content: string;
  metadata: EnhancedChunkMetadata;
  embedding?: number[];
}

// 文档结构信息
export interface DocumentStructure {
  title?: string;
  sections: Array<{
    title: string;
    level: number;
    startIndex: number;
    endIndex: number;
  }>;
  hasTableOfContents: boolean;
  estimatedReadingTime: number;
}

// 停用词列表（中英文）
const STOP_WORDS = new Set([
  // 英文停用词
  'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'it', 'with', 'as', 'for', 'on', 'are', 'was', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'this', 'these', 'those', 'they', 'them', 'their', 'there', 'where', 'when', 'what', 'who', 'how', 'why', 'which', 'an', 'but', 'or', 'if', 'then', 'than', 'so', 'very', 'just', 'now', 'only', 'also', 'its', 'our', 'out', 'up', 'time', 'way', 'about', 'into', 'over', 'after', 'before', 'through', 'during', 'above', 'below', 'between', 'among',
  // 中文停用词
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '里', '就是', '还', '把', '比', '让', '时', '过', '出', '小', '么', '起', '你们', '到了', '大', '来', '可以', '这个', '那个', '什么', '怎么', '为什么', '因为', '所以', '但是', '然后', '如果', '虽然', '虽说', '不过', '而且', '或者', '还是', '已经', '正在', '将要'
]);

export class SemanticChunker {
  private config: SemanticChunkingConfig;

  constructor(config: Partial<SemanticChunkingConfig> = {}) {
    this.config = {
      maxChunkSize: 1000,
      minChunkSize: 100,
      overlapSize: 50,
      similarityThreshold: 0.7,
      preserveBoundaries: true,
      ...config
    };
  }

  // 主要的语义分块方法
  async chunkDocument(
    content: string, 
    contentType: string, 
    contentId: string,
    documentTitle?: string
  ): Promise<SemanticChunk[]> {
    // 1. 预处理文档
    const preprocessed = this.preprocessDocument(content);
    
    // 2. 分析文档结构
    const structure = this.analyzeDocumentStructure(preprocessed, documentTitle);
    
    // 3. 执行语义分块
    const rawChunks = this.performSemanticChunking(preprocessed, structure);
    
    // 4. 生成增强元数据
    const chunksWithMetadata = rawChunks.map((chunk, index) => 
      this.generateChunkMetadata(chunk, index, contentType, contentId, structure)
    );
    
    return chunksWithMetadata;
  }

  // 文档预处理
  private preprocessDocument(content: string): string {
    if (!content) return '';
    
    return content
      .trim()
      // 标准化换行符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 清理多余空白但保留段落结构
      .replace(/\n{3,}/g, '\n\n')
      // 标准化空格
      .replace(/[ \t]+/g, ' ')
      // 保留重要的格式标记
      .replace(/^(#{1,6})\s+/gm, '$1 '); // 标准化markdown标题
  }

  // 分析文档结构
  private analyzeDocumentStructure(content: string, title?: string): DocumentStructure {
    const lines = content.split('\n');
    const sections: DocumentStructure['sections'] = [];
    
    // 检测标题和章节
    const headerPatterns = [
      /^(#{1,6})\s+(.+)$/,           // Markdown headers
      /^(.+)\n[=]{3,}$/m,           // Underlined headers (===)
      /^(.+)\n[-]{3,}$/m,           // Underlined headers (---)
      /^([A-Z][A-Z\s]{2,}):?\s*$/,  // ALL CAPS headers
      /^(\d+\.?\s+.+)$/,            // Numbered sections
    ];

    lines.forEach((line, index) => {
      for (const pattern of headerPatterns) {
        const match = line.match(pattern);
        if (match) {
          const level = match[1].startsWith('#') ? match[1].length : 1;
          const sectionTitle = match[2] || match[1];
          
          sections.push({
            title: sectionTitle.trim(),
            level,
            startIndex: index,
            endIndex: -1 // 将在后续处理中设置
          });
          break;
        }
      }
    });

    // 设置章节结束位置
    for (let i = 0; i < sections.length; i++) {
      const nextSection = sections[i + 1];
      sections[i].endIndex = nextSection ? nextSection.startIndex - 1 : lines.length - 1;
    }

    // 估算阅读时间（基于平均阅读速度）
    const wordCount = content.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 假设每分钟200词

    return {
      title,
      sections,
      hasTableOfContents: sections.length > 3,
      estimatedReadingTime
    };
  }

  // 执行语义分块
  private performSemanticChunking(content: string, structure: DocumentStructure): string[] {
    const chunks: string[] = [];
    
    // 使用递归分隔符进行初步分割
    const separators = ['\n\n', '\n', '. ', '。', '！', '？', '!', '?', ' ', ''];
    let currentChunks = [content];
    
    for (const separator of separators) {
      const newChunks: string[] = [];
      
      for (const chunk of currentChunks) {
        if (chunk.length <= this.config.maxChunkSize) {
          newChunks.push(chunk);
        } else {
          const splits = chunk.split(separator);
          let currentChunk = '';
          
          for (const split of splits) {
            const testChunk = currentChunk + (currentChunk ? separator : '') + split;
            
            if (testChunk.length <= this.config.maxChunkSize) {
              currentChunk = testChunk;
            } else {
              if (currentChunk) {
                newChunks.push(currentChunk);
              }
              currentChunk = split;
            }
          }
          
          if (currentChunk) {
            newChunks.push(currentChunk);
          }
        }
      }
      
      currentChunks = newChunks;
      
      // 如果所有块都在合适大小范围内，停止分割
      if (currentChunks.every(chunk => 
        chunk.length >= this.config.minChunkSize && 
        chunk.length <= this.config.maxChunkSize
      )) {
        break;
      }
    }
    
    // 添加重叠内容以保持上下文
    return this.addOverlap(currentChunks);
  }

  // 添加重叠内容
  private addOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1 || this.config.overlapSize <= 0) {
      return chunks;
    }

    const overlappedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      
      // 添加前一个块的结尾作为重叠
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.slice(-this.config.overlapSize);
        chunk = overlapText + ' ' + chunk;
      }
      
      overlappedChunks.push(chunk);
    }
    
    return overlappedChunks;
  }

  // 生成增强的块元数据
  private generateChunkMetadata(
    content: string, 
    index: number, 
    contentType: string, 
    contentId: string,
    structure: DocumentStructure
  ): SemanticChunk {
    const chunkId = `${contentType}_${contentId}_chunk_${index}`;
    
    // 计算语义密度
    const semanticDensity = this.calculateSemanticDensity(content);
    
    // 提取关键词
    const keyTerms = this.extractKeyTerms(content);
    
    // 检测内容类型
    const hasCodeBlock = /```[\s\S]*?```|`[^`]+`/.test(content);
    const hasTable = /\|.*\|/.test(content) || /┌.*┐/.test(content);
    const hasList = /^[\s]*[-*+]\s|^[\s]*\d+\.\s/m.test(content);
    
    // 统计信息
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // 确定块类型和层次
    const { chunkType, hierarchyLevel, sectionTitle } = this.determineChunkType(content, structure, index);
    
    // 检测语言
    const language = this.detectLanguage(content);

    const metadata: EnhancedChunkMetadata = {
      chunkId,
      contentType,
      contentId,
      chunkType,
      hierarchyLevel,
      sectionTitle,
      semanticDensity,
      keyTerms,
      sentenceCount: sentences.length,
      wordCount: words.length,
      hasCodeBlock,
      hasTable,
      hasList,
      language
    };

    return {
      id: chunkId,
      content: content.trim(),
      metadata
    };
  }

  // 计算语义密度
  private calculateSemanticDensity(content: string): number {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const contentWords = words.filter(word => !STOP_WORDS.has(word));
    
    return words.length > 0 ? contentWords.length / words.length : 0;
  }

  // 提取关键词
  private extractKeyTerms(content: string, maxTerms: number = 10): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中英文字符
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
    
    // 计算词频
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // 按频率排序并返回前N个
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTerms)
      .map(([word]) => word);
  }

  // 确定块类型和层次
  private determineChunkType(
    content: string, 
    structure: DocumentStructure, 
    index: number
  ): { chunkType: EnhancedChunkMetadata['chunkType']; hierarchyLevel: number; sectionTitle?: string } {
    // 检查是否包含标题
    const hasHeader = /^#{1,6}\s+/.test(content) || /^[A-Z][A-Z\s]{2,}:?\s*$/m.test(content);
    
    if (hasHeader) {
      return {
        chunkType: 'section',
        hierarchyLevel: 1,
        sectionTitle: this.extractSectionTitle(content)
      };
    }
    
    // 基于内容长度和结构判断类型
    if (content.length < 200) {
      return { chunkType: 'detail', hierarchyLevel: 3 };
    } else if (content.length > 800) {
      return { chunkType: 'section', hierarchyLevel: 1 };
    } else {
      return { chunkType: 'paragraph', hierarchyLevel: 2 };
    }
  }

  // 提取章节标题
  private extractSectionTitle(content: string): string | undefined {
    const headerPatterns = [
      /^(#{1,6})\s+(.+)$/m,
      /^([A-Z][A-Z\s]{2,}):?\s*$/m,
      /^(.+)\n[=\-]{3,}$/m
    ];

    for (const pattern of headerPatterns) {
      const match = content.match(pattern);
      if (match) {
        return (match[2] || match[1]).trim();
      }
    }

    return undefined;
  }

  // 简单的语言检测
  private detectLanguage(content: string): string {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = content.replace(/\s/g, '').length;
    
    return totalChars > 0 && chineseChars / totalChars > 0.3 ? 'zh' : 'en';
  }
}

// 默认配置的语义分块器实例
export const defaultSemanticChunker = new SemanticChunker({
  maxChunkSize: 1000,
  minChunkSize: 100,
  overlapSize: 50,
  similarityThreshold: 0.7,
  preserveBoundaries: true
});

// 便捷函数
export async function chunkDocumentSemantically(
  content: string,
  contentType: string,
  contentId: string,
  title?: string,
  config?: Partial<SemanticChunkingConfig>
): Promise<SemanticChunk[]> {
  const chunker = config ? new SemanticChunker(config) : defaultSemanticChunker;
  return chunker.chunkDocument(content, contentType, contentId, title);
}
