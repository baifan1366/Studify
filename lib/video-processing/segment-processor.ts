// Video segment processing utilities
import { generateDualEmbeddingWithWakeup, generateDualBatchEmbeddings } from '@/lib/langChain/embedding';

export interface VideoSegment {
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  content: string;
  overlapStart?: number;
  overlapEnd?: number;
  wordCount: number;
  sentenceCount: number;
  confidenceScore: number;
  topicKeywords: string[];
  containsCode: boolean;
  containsMath: boolean;
  containsDiagram: boolean;
}

export interface SegmentationConfig {
  targetSegmentLength: number; // Target characters per segment (400-800)
  maxSegmentLength: number;    // Max characters per segment (1000)
  minSegmentLength: number;    // Min characters per segment (200)
  overlapSeconds: number;      // Overlap in seconds (10)
  wordsPerSecond: number;      // Estimated words per second for timing (2.5)
}

const DEFAULT_CONFIG: SegmentationConfig = {
  targetSegmentLength: 600,    // 600 characters target
  maxSegmentLength: 900,       // 900 characters max
  minSegmentLength: 300,       // 300 characters min
  overlapSeconds: 10,          // 10 seconds overlap
  wordsPerSecond: 2.5          // Average speaking rate
};

/**
 * Segment video transcription into time-based and semantic chunks
 */
export function segmentTranscription(
  transcription: string,
  totalDurationSeconds: number,
  config: SegmentationConfig = DEFAULT_CONFIG
): VideoSegment[] {
  console.log('🔄 Starting transcription segmentation:', {
    totalLength: transcription.length,
    totalDuration: totalDurationSeconds,
    config
  });

  // Split into sentences for semantic boundaries
  const sentences = splitIntoSentences(transcription);
  const segments: VideoSegment[] = [];
  
  let currentSegment = '';
  let currentStartTime = 0;
  let sentenceStartIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialSegment = currentSegment + (currentSegment ? ' ' : '') + sentence;
    
    // Check if we should finalize current segment
    const shouldFinalize = (
      potentialSegment.length >= config.targetSegmentLength &&
      (potentialSegment.length >= config.maxSegmentLength || 
       i === sentences.length - 1 || 
       isGoodBreakPoint(sentence))
    );

    if (shouldFinalize && currentSegment.length >= config.minSegmentLength) {
      // Calculate timing for current segment
      const segmentWordCount = currentSegment.split(/\s+/).length;
      const estimatedDuration = segmentWordCount / config.wordsPerSecond;
      const segmentEndTime = Math.min(
        currentStartTime + estimatedDuration,
        totalDurationSeconds
      );

      // Create segment
      const segment = createSegment({
        index: segments.length,
        startTime: currentStartTime,
        endTime: segmentEndTime,
        content: currentSegment,
        totalDuration: totalDurationSeconds,
        config
      });

      segments.push(segment);

      // Prepare next segment with overlap
      const overlapStartTime = Math.max(0, segmentEndTime - config.overlapSeconds);
      currentStartTime = overlapStartTime;
      
      // Find sentences that fall within overlap period
      const overlapContent = findOverlapContent(sentences, sentenceStartIndex, i, config.overlapSeconds);
      currentSegment = overlapContent + (overlapContent ? ' ' : '') + sentence;
      sentenceStartIndex = i;
    } else {
      currentSegment = potentialSegment;
    }
  }

  // Handle final segment if any content remains
  if (currentSegment.length >= config.minSegmentLength) {
    const segment = createSegment({
      index: segments.length,
      startTime: currentStartTime,
      endTime: totalDurationSeconds,
      content: currentSegment,
      totalDuration: totalDurationSeconds,
      config
    });
    segments.push(segment);
  }

  // Post-process segments for relationships and quality
  return postProcessSegments(segments, config);
}

/**
 * Split text into sentences with better boundary detection
 */
function splitIntoSentences(text: string): string[] {
  // Enhanced sentence splitting with common abbreviations handling
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|SPLIT|') // Mark sentence boundaries
    .replace(/([a-z])\.\s+([A-Z])/g, '$1.|SPLIT|$2') // Handle period + capital
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Determine if sentence is a good break point
 */
function isGoodBreakPoint(sentence: string): boolean {
  const breakIndicators = [
    /^(然后|接下来|现在|下面|最后|总结)/,     // Chinese transition words
    /^(Now|Next|Then|Finally|In conclusion)/i, // English transition words
    /[.!?]$/,                                   // Ends with punctuation
    /(总结|结论|最后|综上所述)/,                // Summary indicators
    /(例如|比如|举例说明)/                      // Example indicators
  ];

  return breakIndicators.some(pattern => pattern.test(sentence.trim()));
}

/**
 * Find content for overlap between segments
 */
function findOverlapContent(
  sentences: string[], 
  startIndex: number, 
  endIndex: number, 
  overlapSeconds: number
): string {
  // Estimate words for overlap duration
  const overlapWords = Math.ceil(overlapSeconds * DEFAULT_CONFIG.wordsPerSecond);
  
  // Get last few sentences that fit within overlap word count
  let overlapContent = '';
  let wordCount = 0;
  
  for (let i = endIndex; i >= startIndex && wordCount < overlapWords; i--) {
    const sentenceWords = sentences[i]?.split(/\s+/).length || 0;
    if (wordCount + sentenceWords <= overlapWords) {
      overlapContent = sentences[i] + (overlapContent ? ' ' + overlapContent : '');
      wordCount += sentenceWords;
    } else {
      break;
    }
  }
  
  return overlapContent;
}

/**
 * Create individual segment with metadata
 */
function createSegment({
  index,
  startTime,
  endTime,
  content,
  totalDuration,
  config
}: {
  index: number;
  startTime: number;
  endTime: number;
  content: string;
  totalDuration: number;
  config: SegmentationConfig;
}): VideoSegment {
  const wordCount = content.split(/\s+/).length;
  const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  return {
    index,
    startTime: Math.round(startTime * 10) / 10, // Round to 1 decimal
    endTime: Math.round(endTime * 10) / 10,
    duration: Math.round((endTime - startTime) * 10) / 10,
    content: content.trim(),
    wordCount,
    sentenceCount,
    confidenceScore: calculateConfidenceScore(content, wordCount, endTime - startTime),
    topicKeywords: extractTopicKeywords(content),
    containsCode: detectCodeContent(content),
    containsMath: detectMathContent(content),
    containsDiagram: detectDiagramReferences(content)
  };
}

/**
 * Calculate confidence score based on speech clarity indicators
 */
function calculateConfidenceScore(content: string, wordCount: number, duration: number): number {
  let score = 1.0;
  
  // Penalize very short segments
  if (wordCount < 10) score *= 0.7;
  
  // Penalize very fast or slow speech
  const wordsPerSecond = wordCount / duration;
  if (wordsPerSecond < 1.0 || wordsPerSecond > 4.0) score *= 0.8;
  
  // Penalize segments with many filler words
  const fillerWords = ['呃', '嗯', '那个', '就是说', 'um', 'uh', 'like', 'you know'];
  const fillerCount = fillerWords.reduce((count, filler) => 
    count + (content.toLowerCase().match(new RegExp(filler, 'g')) || []).length, 0
  );
  const fillerRatio = fillerCount / wordCount;
  if (fillerRatio > 0.1) score *= (1 - fillerRatio);
  
  // Penalize segments with repetitive content
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words).size;
  const repetitionRatio = 1 - (uniqueWords / words.length);
  if (repetitionRatio > 0.3) score *= (1 - repetitionRatio * 0.5);
  
  return Math.max(0.1, Math.min(1.0, score));
}

/**
 * Extract topic keywords using simple frequency and importance analysis
 */
function extractTopicKeywords(content: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没', '看',
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall'
  ]);
  
  // Extract meaningful words (2+ characters, not numbers only)
  const words = content
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // Keep alphanumeric and Chinese characters
    .split(/\s+/)
    .filter(word => 
      word.length >= 2 && 
      !stopWords.has(word) && 
      !/^\d+$/.test(word) // Not just numbers
    );
  
  // Count word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  // Get top keywords (frequency > 1 or length > 4)
  const keywords = Array.from(wordFreq.entries())
    .filter(([word, freq]) => freq > 1 || word.length > 4)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 8) // Top 8 keywords
    .map(([word]) => word);
  
  return keywords;
}

/**
 * Detect code content in segment
 */
function detectCodeContent(content: string): boolean {
  const codeIndicators = [
    /```/, // Code blocks
    /`[^`]+`/, // Inline code
    /function\s*\(/, // Function definitions
    /class\s+\w+/, // Class definitions
    /import\s+.*from/, // Import statements
    /console\.log/, // Console statements
    /\w+\s*=\s*\w+\s*\(/, // Function calls
    /(def|function|class|import|export|const|let|var)\s+/i
  ];
  
  return codeIndicators.some(pattern => pattern.test(content));
}

/**
 * Detect mathematical content in segment
 */
function detectMathContent(content: string): boolean {
  const mathIndicators = [
    /\$.*\$/, // LaTeX math
    /\d+\s*[+\-*/=]\s*\d+/, // Basic equations
    /[∑∏∫∂∇√±×÷]/, // Math symbols
    /(公式|方程|计算|数学|算法|函数)/,  // Chinese math terms
    /(formula|equation|calculate|mathematics|algorithm|function)/i // English math terms
  ];
  
  return mathIndicators.some(pattern => pattern.test(content));
}

/**
 * Detect diagram/visual references in segment
 */
function detectDiagramReferences(content: string): boolean {
  const diagramIndicators = [
    /(图|表|图表|图像|图片|示意图)/,  // Chinese visual terms
    /(figure|diagram|chart|table|image|picture|illustration)/i, // English visual terms
    /(看这里|看图|如图所示|上图|下图)/,  // Visual references
    /(look here|see figure|as shown|above|below)/i
  ];
  
  return diagramIndicators.some(pattern => pattern.test(content));
}

/**
 * Post-process segments to add relationships and final quality checks
 */
function postProcessSegments(segments: VideoSegment[], config: SegmentationConfig): VideoSegment[] {
  console.log('✨ Post-processing segments:', {
    totalSegments: segments.length,
    avgLength: Math.round(segments.reduce((sum, s) => sum + s.content.length, 0) / segments.length),
    avgConfidence: Math.round(segments.reduce((sum, s) => sum + s.confidenceScore, 0) / segments.length * 100) / 100
  });

  return segments.map((segment, index) => ({
    ...segment,
    // Add overlap timing information
    overlapStart: index > 0 ? Math.max(0, segment.startTime - config.overlapSeconds) : undefined,
    overlapEnd: index < segments.length - 1 ? Math.min(segments[index + 1].startTime + config.overlapSeconds, segment.endTime) : undefined
  }));
}

/**
 * Process segments and generate embeddings using batch API for better performance
 */
export async function processSegmentsWithEmbeddings(
  segments: VideoSegment[],
  attachmentId: number
): Promise<Array<VideoSegment & { embedding?: any }>> {
  console.log('🚀 Processing', segments.length, 'segments with batch embeddings...');
  
  if (segments.length === 0) {
    return [];
  }

  try {
    // Extract all segment texts for batch processing
    const segmentTexts = segments.map(segment => segment.content);
    
    console.log('📦 Generating batch embeddings for', segmentTexts.length, 'segments...');
    console.log('📊 Batch details:', {
      totalSegments: segments.length,
      avgWordsPerSegment: Math.round(segments.reduce((sum, s) => sum + s.wordCount, 0) / segments.length),
      totalChars: segmentTexts.reduce((sum, text) => sum + text.length, 0)
    });

    // Generate dual embeddings for all segments in one batch call
    const batchEmbeddingResult = await generateDualBatchEmbeddings(segmentTexts);
    
    console.log('✅ Batch embedding completed:', {
      e5Success: batchEmbeddingResult.e5_success,
      bgeSuccess: batchEmbeddingResult.bge_success,
      e5Count: batchEmbeddingResult.e5_embeddings?.length || 0,
      bgeCount: batchEmbeddingResult.bge_embeddings?.length || 0,
      successCount: batchEmbeddingResult.success_count
    });

    // Combine segments with their corresponding embeddings
    const results = segments.map((segment, index) => {
      const hasE5 = batchEmbeddingResult.e5_success && 
                    batchEmbeddingResult.e5_embeddings && 
                    index < batchEmbeddingResult.e5_embeddings.length;
                    
      const hasBge = batchEmbeddingResult.bge_success && 
                     batchEmbeddingResult.bge_embeddings && 
                     index < batchEmbeddingResult.bge_embeddings.length;

      if (hasE5 || hasBge) {
        return {
          ...segment,
          embedding: {
            e5_embedding: hasE5 ? batchEmbeddingResult.e5_embeddings![index] : undefined,
            bge_embedding: hasBge ? batchEmbeddingResult.bge_embeddings![index] : undefined,
            has_e5: hasE5,
            has_bge: hasBge
          }
        };
      } else {
        console.warn(`⚠️ No embedding available for segment ${index + 1}`);
        return {
          ...segment,
          embedding: null,
          confidenceScore: segment.confidenceScore * 0.5 // Lower confidence for missing embeddings
        };
      }
    });

    const successCount = results.filter(r => r.embedding).length;
    const failureCount = results.length - successCount;

    console.log('🎉 Batch processing completed:', {
      totalSegments: results.length,
      successfulEmbeddings: successCount,
      failedEmbeddings: failureCount,
      successRate: `${Math.round((successCount / results.length) * 100)}%`,
      performanceGain: `${Math.round(((segments.length * 2) - 1) / 2 * 100)}% fewer API calls`
    });

    return results;

  } catch (batchError: any) {
    console.error('❌ Batch embedding failed, falling back to individual processing:', batchError.message);
    
    // Fallback to individual processing if batch fails
    return await processSegmentsWithEmbeddingsIndividual(segments, attachmentId);
  }
}

/**
 * Fallback: Individual processing for segments when batch fails
 */
async function processSegmentsWithEmbeddingsIndividual(
  segments: VideoSegment[],
  attachmentId: number
): Promise<Array<VideoSegment & { embedding?: any }>> {
  console.log('🔄 Falling back to individual embedding processing for', segments.length, 'segments...');
  
  const results = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    try {
      console.log(`📝 Processing segment ${i + 1}/${segments.length} (individual):`, {
        duration: segment.duration,
        wordCount: segment.wordCount,
        confidence: segment.confidenceScore,
        keywords: segment.topicKeywords.slice(0, 3)
      });
      
      // Generate embedding for segment content
      const embeddingResult = await generateDualEmbeddingWithWakeup(segment.content);
      
      results.push({
        ...segment,
        embedding: embeddingResult
      });
      
      // Small delay to prevent overwhelming the embedding service
      if (i < segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(`❌ Failed to process segment ${i + 1}:`, error.message);
      
      // Add segment without embedding but with error info
      results.push({
        ...segment,
        embedding: null,
        confidenceScore: segment.confidenceScore * 0.5 // Lower confidence for failed embeddings
      });
    }
  }
  
  console.log('✅ Individual processing completed:', {
    totalSegments: results.length,
    successfulEmbeddings: results.filter(r => r.embedding).length,
    failedEmbeddings: results.filter(r => !r.embedding).length
  });
  
  return results;
}
