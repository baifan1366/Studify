/**
 * Two-Stage Video Search Helper
 * 
 * Implements efficient video segment search using:
 * - Stage 1: E5 embeddings for broad recall (top 20-30)
 * - Stage 2: BGE-M3 embeddings for precise reranking (top 10)
 */

import { createClient } from '@supabase/supabase-js';

export interface VideoSegmentResult {
  segment_id: number;
  attachment_id: number;
  segment_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  content_text: string;
  topic_keywords: string[];
  similarity_e5: number;
  similarity_bge: number;
  rerank_score: number;
  context_before?: string;
  context_after?: string;
}

export interface TwoStageSearchOptions {
  attachmentIds?: number[];
  startTimeMin?: number;
  startTimeMax?: number;
  e5Threshold?: number;
  e5RecallCount?: number;
  finalCount?: number;
  includeContext?: boolean;
}

/**
 * Search video segments using two-stage approach
 * 
 * @param queryEmbeddingE5 - E5 embedding vector (384 dimensions)
 * @param queryEmbeddingBge - BGE-M3 embedding vector (1024 dimensions)
 * @param options - Search options
 * @returns Array of ranked video segments
 */
export async function searchVideoSegmentsTwoStage(
  queryEmbeddingE5: number[],
  queryEmbeddingBge: number[],
  options: TwoStageSearchOptions = {}
): Promise<VideoSegmentResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    attachmentIds = null,
    startTimeMin = null,
    startTimeMax = null,
    e5Threshold = 0.6,
    e5RecallCount = 30,
    finalCount = 10,
    includeContext = false,
  } = options;

  // Validate embedding dimensions
  if (queryEmbeddingE5.length !== 384) {
    throw new Error(`E5 embedding must be 384 dimensions, got ${queryEmbeddingE5.length}`);
  }
  if (queryEmbeddingBge.length !== 1024) {
    throw new Error(`BGE embedding must be 1024 dimensions, got ${queryEmbeddingBge.length}`);
  }

  // Format embeddings as PostgreSQL vectors
  const e5Vector = `[${queryEmbeddingE5.join(',')}]`;
  const bgeVector = `[${queryEmbeddingBge.join(',')}]`;

  const { data, error } = await supabase.rpc('search_video_segments_two_stage', {
    query_embedding_e5: e5Vector,
    query_embedding_bge: bgeVector,
    attachment_ids: attachmentIds,
    start_time_min: startTimeMin,
    start_time_max: startTimeMax,
    e5_threshold: e5Threshold,
    e5_recall_count: e5RecallCount,
    final_count: finalCount,
    include_context: includeContext,
  });

  if (error) {
    console.error('Two-stage video search error:', error);
    throw new Error(`Video search failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Search with only E5 embeddings (fallback when BGE is not available)
 * 
 * @param queryEmbeddingE5 - E5 embedding vector (384 dimensions)
 * @param options - Search options
 * @returns Array of ranked video segments
 */
export async function searchVideoSegmentsE5Only(
  queryEmbeddingE5: number[],
  options: TwoStageSearchOptions = {}
): Promise<VideoSegmentResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    attachmentIds = null,
    startTimeMin = null,
    startTimeMax = null,
    e5Threshold = 0.6,
    finalCount = 10,
    includeContext = false,
  } = options;

  if (queryEmbeddingE5.length !== 384) {
    throw new Error(`E5 embedding must be 384 dimensions, got ${queryEmbeddingE5.length}`);
  }

  const e5Vector = `[${queryEmbeddingE5.join(',')}]`;

  const { data, error } = await supabase.rpc('search_video_segments_with_time', {
    query_embedding_e5: e5Vector,
    query_embedding_bge: null,
    attachment_ids: attachmentIds,
    start_time_min: startTimeMin,
    start_time_max: startTimeMax,
    match_threshold: e5Threshold,
    match_count: finalCount,
    include_context: includeContext,
  });

  if (error) {
    console.error('E5-only video search error:', error);
    throw new Error(`Video search failed: ${error.message}`);
  }

  return data || [];
}

/**
 * Format time in seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Group search results by attachment ID
 */
export function groupResultsByAttachment(
  results: VideoSegmentResult[]
): Map<number, VideoSegmentResult[]> {
  const grouped = new Map<number, VideoSegmentResult[]>();
  
  for (const result of results) {
    const existing = grouped.get(result.attachment_id) || [];
    existing.push(result);
    grouped.set(result.attachment_id, existing);
  }
  
  return grouped;
}

/**
 * Get the best matching segment from results
 */
export function getBestMatch(results: VideoSegmentResult[]): VideoSegmentResult | null {
  if (results.length === 0) return null;
  
  // Results are already sorted by rerank_score DESC
  return results[0];
}

/**
 * Filter results by minimum score threshold
 */
export function filterByScore(
  results: VideoSegmentResult[],
  minScore: number
): VideoSegmentResult[] {
  return results.filter(r => r.rerank_score >= minScore);
}
