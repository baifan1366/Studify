/**
 * Vector Similarity Utilities
 * Functions for calculating cosine similarity between embedding vectors
 */

/**
 * Calculate cosine similarity between two vectors
 * @param vectorA First embedding vector (array of numbers)
 * @param vectorB Second embedding vector (array of numbers)
 * @returns Similarity score between -1 and 1 (higher is more similar)
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate similarity using both E5-Small and BGE-M3 embeddings with weights
 * @param userEmbedding User's embedding data
 * @param contentEmbedding Content's embedding data
 * @param e5Weight Weight for E5-Small similarity (default: 0.4)
 * @param bgeWeight Weight for BGE-M3 similarity (default: 0.6)
 * @returns Weighted similarity score between 0 and 1
 */
export function calculateDualEmbeddingSimilarity(
  userEmbedding: any,
  contentEmbedding: any,
  e5Weight: number = 0.4,
  bgeWeight: number = 0.6
): number {
  let totalSimilarity = 0;
  let totalWeight = 0;

  // E5-Small similarity (384 dimensions)
  if (userEmbedding?.has_e5_embedding && 
      contentEmbedding?.has_e5_embedding && 
      userEmbedding?.embedding_e5_small && 
      contentEmbedding?.embedding_e5_small) {
    
    // Parse embedding vectors (assuming they're stored as JSON arrays or PostgreSQL arrays)
    const userE5 = parseEmbeddingVector(userEmbedding.embedding_e5_small);
    const contentE5 = parseEmbeddingVector(contentEmbedding.embedding_e5_small);
    
    if (userE5 && contentE5) {
      const e5Similarity = cosineSimilarity(userE5, contentE5);
      totalSimilarity += (e5Similarity + 1) / 2 * e5Weight; // Normalize to 0-1
      totalWeight += e5Weight;
    }
  }

  // BGE-M3 similarity (1024 dimensions)
  if (userEmbedding?.has_bge_embedding && 
      contentEmbedding?.has_bge_embedding && 
      userEmbedding?.embedding_bge_m3 && 
      contentEmbedding?.embedding_bge_m3) {
    
    const userBGE = parseEmbeddingVector(userEmbedding.embedding_bge_m3);
    const contentBGE = parseEmbeddingVector(contentEmbedding.embedding_bge_m3);
    
    if (userBGE && contentBGE) {
      const bgeSimilarity = cosineSimilarity(userBGE, contentBGE);
      totalSimilarity += (bgeSimilarity + 1) / 2 * bgeWeight; // Normalize to 0-1
      totalWeight += bgeWeight;
    }
  }

  // Return weighted average, or 0 if no embeddings available
  return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
}

/**
 * Parse embedding vector from various formats
 * Handles JSON strings, PostgreSQL arrays, and direct arrays
 * @param embedding Raw embedding data from database
 * @returns Parsed number array or null if invalid
 */
export function parseEmbeddingVector(embedding: any): number[] | null {
  try {
    if (!embedding) return null;

    // If it's already an array
    if (Array.isArray(embedding)) {
      return embedding.map(Number);
    }

    // If it's a string (JSON or PostgreSQL array format)
    if (typeof embedding === 'string') {
      // Handle PostgreSQL array format: {1.2,3.4,5.6}
      if (embedding.startsWith('{') && embedding.endsWith('}')) {
        const values = embedding.slice(1, -1).split(',');
        return values.map(v => parseFloat(v.trim()));
      }
      
      // Handle JSON array format
      if (embedding.startsWith('[') && embedding.endsWith(']')) {
        return JSON.parse(embedding).map(Number);
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing embedding vector:', error);
    return null;
  }
}

/**
 * Calculate similarity score with quality indicators
 * @param similarity Raw similarity score (0-1)
 * @param qualityFactors Additional quality factors
 * @returns Enhanced similarity score
 */
export function enhancedSimilarityScore(
  similarity: number,
  qualityFactors: {
    recency?: number;      // 0-1, higher for newer content
    engagement?: number;   // 0-1, higher for more engaged content
    quality?: number;      // 0-1, higher for higher quality content
    relevance?: number;    // 0-1, higher for more relevant content
  } = {}
): number {
  const {
    recency = 0.5,
    engagement = 0.5,
    quality = 0.5,
    relevance = 0.5
  } = qualityFactors;

  // Weighted combination of factors
  const enhancedScore = 
    similarity * 0.6 +           // Base similarity: 60%
    recency * 0.15 +             // Recency: 15%
    engagement * 0.15 +          // Engagement: 15%
    (quality + relevance) * 0.05; // Quality + Relevance: 10%

  return Math.min(Math.max(enhancedScore, 0), 1); // Clamp to 0-1
}

/**
 * Batch calculate similarities for multiple content items
 * @param userEmbedding User's embedding data
 * @param contentEmbeddings Array of content embedding data
 * @returns Array of similarity scores
 */
export function batchCalculateSimilarity(
  userEmbedding: any,
  contentEmbeddings: any[]
): number[] {
  return contentEmbeddings.map(contentEmbedding => 
    calculateDualEmbeddingSimilarity(userEmbedding, contentEmbedding)
  );
}

/**
 * Get top N most similar items
 * @param items Array of items with similarity scores
 * @param n Number of top items to return
 * @param minSimilarity Minimum similarity threshold
 * @returns Top N most similar items
 */
export function getTopSimilarItems<T extends { similarity: number }>(
  items: T[],
  n: number = 10,
  minSimilarity: number = 0.1
): T[] {
  return items
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, n);
}
