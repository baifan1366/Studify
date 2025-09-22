import { Document } from './document-loaders';
import { VectorStore, getVectorStore, ContentType, SearchResult } from './vectorstore';
import { generateEmbedding, cosineSimilarity } from './embedding';
import { contextManager } from './context-manager';
import { aiWorkflowExecutor } from './ai-workflow';

// Base retriever interface
export interface BaseRetriever {
  getRelevantDocuments(query: string, options?: any): Promise<Document[]>;
  name: string;
  description: string;
}

// Vector store retriever
export class VectorStoreRetriever implements BaseRetriever {
  name = 'vector_store';
  description = 'Retrieves documents using vector similarity search';

  constructor(
    private vectorStore: VectorStore,
    private searchConfig: {
      k: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
      contentTypes?: ContentType[];
    } = { k: 5 }
  ) {}

  async getRelevantDocuments(query: string, options?: {
    k?: number;
    scoreThreshold?: number;
    filter?: Record<string, any>;
    contentTypes?: ContentType[];
  }): Promise<Document[]> {
    const config = { ...this.searchConfig, ...options };
    
    const searchResults = await this.vectorStore.dualSemanticSearch(query, {
      contentTypes: config.contentTypes,
      similarityThreshold: config.scoreThreshold || 0.7,
      maxResults: config.k || 5,
      searchType: 'hybrid'
    });

    return searchResults.map(result => ({
      pageContent: result.content_text,
      metadata: {
        source: `${result.content_type}:${result.content_id}`,
        contentType: result.content_type,
        contentId: result.content_id,
        similarity: result.similarity,
        ...result.metadata
      }
    }));
  }
}

// Multi-vector retriever (combines multiple vector stores)
export class MultiVectorRetriever implements BaseRetriever {
  name = 'multi_vector';
  description = 'Retrieves documents from multiple vector stores and combines results';

  constructor(
    private retrievers: BaseRetriever[],
    private combineMethod: 'concat' | 'interleave' | 'weighted' = 'interleave',
    private weights?: number[]
  ) {}

  async getRelevantDocuments(query: string, options?: any): Promise<Document[]> {
    const allResults = await Promise.all(
      this.retrievers.map(retriever => retriever.getRelevantDocuments(query, options))
    );

    switch (this.combineMethod) {
      case 'concat':
        return allResults.flat();
      
      case 'interleave':
        return this.interleaveResults(allResults);
      
      case 'weighted':
        return this.weightedCombine(allResults, this.weights || []);
      
      default:
        return allResults.flat();
    }
  }

  private interleaveResults(results: Document[][]): Document[] {
    const combined: Document[] = [];
    const maxLength = Math.max(...results.map(r => r.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (const resultSet of results) {
        if (i < resultSet.length) {
          combined.push(resultSet[i]);
        }
      }
    }
    
    return combined;
  }

  private weightedCombine(results: Document[][], weights: number[]): Document[] {
    const combined: Array<{ doc: Document; score: number }> = [];
    
    results.forEach((resultSet, index) => {
      const weight = weights[index] || 1;
      resultSet.forEach(doc => {
        const similarity = doc.metadata.similarity || 0;
        combined.push({
          doc,
          score: similarity * weight
        });
      });
    });
    
    return combined
      .sort((a, b) => b.score - a.score)
      .map(item => item.doc);
  }
}

// Time-weighted retriever
export class TimeWeightedVectorStoreRetriever implements BaseRetriever {
  name = 'time_weighted';
  description = 'Vector store retriever with time-based scoring decay';

  constructor(
    private vectorStore: VectorStore,
    private decayRate: number = -0.01, // Decay rate per day
    private k: number = 5,
    private otherScoreKeys: string[] = [],
    private defaultSalienceKey: string = 'bufferIdx'
  ) {}

  async getRelevantDocuments(query: string, options?: {
    k?: number;
    scoreThreshold?: number;
    contentTypes?: ContentType[];
  }): Promise<Document[]> {
    const searchResults = await this.vectorStore.dualSemanticSearch(query, {
      contentTypes: options?.contentTypes,
      similarityThreshold: options?.scoreThreshold || 0.7,
      maxResults: (options?.k || this.k) * 2, // Get more to account for time weighting
      searchType: 'hybrid'
    });

    // Apply time weighting
    const timeWeightedResults = searchResults.map(result => {
      const createdAt = new Date(result.metadata.created_at || Date.now());
      const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const timeWeight = Math.exp(this.decayRate * hoursSinceCreated / 24); // Convert hours to days
      
      const combinedScore = result.similarity * timeWeight;
      
      return {
        ...result,
        combinedScore,
        timeWeight
      };
    });

    // Sort by combined score and take top k
    timeWeightedResults.sort((a, b) => b.combinedScore - a.combinedScore);
    const topResults = timeWeightedResults.slice(0, options?.k || this.k);

    return topResults.map(result => ({
      pageContent: result.content_text,
      metadata: {
        source: `${result.content_type}:${result.content_id}`,
        contentType: result.content_type,
        contentId: result.content_id,
        similarity: result.similarity,
        timeWeight: result.timeWeight,
        combinedScore: result.combinedScore,
        ...result.metadata
      }
    }));
  }
}

// Parent document retriever
export class ParentDocumentRetriever implements BaseRetriever {
  name = 'parent_document';
  description = 'Retrieves small chunks but returns larger parent documents';

  constructor(
    private childRetriever: BaseRetriever,
    private parentIdKey: string = 'parent_id',
    private k: number = 5
  ) {}

  async getRelevantDocuments(query: string, options?: any): Promise<Document[]> {
    // Get child documents
    const childDocs = await this.childRetriever.getRelevantDocuments(query, options);
    
    // Extract parent IDs
    const parentIds = new Set(
      childDocs
        .map(doc => doc.metadata[this.parentIdKey])
        .filter(id => id != null)
    );

    // Retrieve parent documents
    const parentDocs: Document[] = [];
    for (const parentId of parentIds) {
      try {
        // This would need to be implemented based on your storage system
        const parentDoc = await this.retrieveParentDocument(parentId);
        if (parentDoc) {
          parentDocs.push({
            ...parentDoc,
            metadata: {
              ...parentDoc.metadata,
              retrievedViaChild: true,
              childSimilarity: childDocs.find(child => child.metadata[this.parentIdKey] === parentId)?.metadata.similarity
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to retrieve parent document ${parentId}:`, error);
      }
    }

    return parentDocs.slice(0, this.k);
  }

  private async retrieveParentDocument(parentId: string): Promise<Document | null> {
    // This is a placeholder - implement based on your document storage
    // For example, query your vector store or database for the parent document
    const vectorStore = getVectorStore();
    // Implementation depends on how parent documents are stored
    return null;
  }
}

// Self-query retriever (with metadata filtering)
export class SelfQueryRetriever implements BaseRetriever {
  name = 'self_query';
  description = 'Retriever that can parse queries and extract metadata filters';

  constructor(
    private vectorStore: VectorStore,
    private allowedComparators: string[] = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'],
    private allowedOperators: string[] = ['and', 'or', 'not'],
    private k: number = 5
  ) {}

  async getRelevantDocuments(query: string, options?: any): Promise<Document[]> {
    // Parse query to extract filters
    const { cleanQuery, filters } = await this.parseQuery(query);
    
    // Use the clean query for semantic search with extracted filters
    const searchResults = await this.vectorStore.dualSemanticSearch(cleanQuery, {
      contentTypes: filters.contentTypes || options?.contentTypes,
      similarityThreshold: options?.scoreThreshold || 0.7,
      maxResults: options?.k || this.k,
      searchType: 'hybrid'
    });

    // Apply additional metadata filters
    const filteredResults = this.applyMetadataFilters(searchResults, filters.metadata || {});

    return filteredResults.map(result => ({
      pageContent: result.content_text,
      metadata: {
        source: `${result.content_type}:${result.content_id}`,
        contentType: result.content_type,
        contentId: result.content_id,
        similarity: result.similarity,
        ...result.metadata
      }
    }));
  }

  private async parseQuery(query: string): Promise<{
    cleanQuery: string;
    filters: {
      contentTypes?: ContentType[];
      metadata?: Record<string, any>;
    };
  }> {
    // Use AI to parse the query and extract filters
    const parsePrompt = `
Parse the following query and extract:
1. The main search query (without filter conditions)
2. Any metadata filters or conditions

Query: "${query}"

Return a JSON object with:
- cleanQuery: the main search terms
- filters: object containing any filters (contentTypes, dateRange, etc.)

Example:
Query: "Find courses about Python created after 2023"
Response: {
  "cleanQuery": "courses about Python",
  "filters": {
    "contentTypes": ["course"],
    "metadata": {
      "created_after": "2023-01-01"
    }
  }
}
`;

    try {
      const response = await aiWorkflowExecutor.simpleAICall(parsePrompt, {
        temperature: 0.1,
        model: 'openai/gpt-4o'
      });

      const parsed = JSON.parse(response);
      return {
        cleanQuery: parsed.cleanQuery || query,
        filters: parsed.filters || {}
      };
    } catch (error) {
      console.warn('Failed to parse query filters, using original query:', error);
      return { cleanQuery: query, filters: {} };
    }
  }

  private applyMetadataFilters(results: SearchResult[], filters: Record<string, any>): SearchResult[] {
    if (!filters || Object.keys(filters).length === 0) {
      return results;
    }

    return results.filter(result => {
      for (const [key, value] of Object.entries(filters)) {
        const metadataValue = (result.metadata as any)[key];
        
        if (key === 'created_after' && metadataValue) {
          const createdDate = new Date(metadataValue);
          const filterDate = new Date(value);
          if (createdDate <= filterDate) return false;
        }
        
        if (key === 'created_before' && metadataValue) {
          const createdDate = new Date(metadataValue);
          const filterDate = new Date(value);
          if (createdDate >= filterDate) return false;
        }
        
        // Add more filter conditions as needed
        if (typeof value === 'string' && metadataValue !== value) {
          return false;
        }
      }
      return true;
    });
  }
}

// Contextual compression retriever
export class ContextualCompressionRetriever implements BaseRetriever {
  name = 'contextual_compression';
  description = 'Retriever that compresses documents to relevant parts only';

  constructor(
    private baseRetriever: BaseRetriever,
    private compressor: DocumentCompressor,
    private k: number = 5
  ) {}

  async getRelevantDocuments(query: string, options?: any): Promise<Document[]> {
    // Get documents from base retriever
    const docs = await this.baseRetriever.getRelevantDocuments(query, {
      ...options,
      k: (options?.k || this.k) * 2 // Get more documents before compression
    });

    // Compress documents
    const compressedDocs = await this.compressor.compressDocuments(docs, query);

    return compressedDocs.slice(0, options?.k || this.k);
  }
}

// Document compressor interface and implementations
export interface DocumentCompressor {
  compressDocuments(documents: Document[], query: string): Promise<Document[]>;
}

export class LLMChainExtractor implements DocumentCompressor {
  constructor(
    private promptTemplate: string = `
Given the following question and context, extract only the parts of the context that are relevant to answering the question.

Question: {question}

Context: {context}

Relevant parts:
`
  ) {}

  async compressDocuments(documents: Document[], query: string): Promise<Document[]> {
    const compressedDocs: Document[] = [];

    for (const doc of documents) {
      try {
        const prompt = this.promptTemplate
          .replace('{question}', query)
          .replace('{context}', doc.pageContent);

        const compressedContent = await aiWorkflowExecutor.simpleAICall(prompt, {
          temperature: 0.1,
          model: 'openai/gpt-4o'
        });

        if (compressedContent.trim().length > 0) {
          compressedDocs.push({
            pageContent: compressedContent.trim(),
            metadata: {
              ...doc.metadata,
              compressed: true,
              originalLength: doc.pageContent.length,
              compressedLength: compressedContent.length
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to compress document: ${error}`);
        // Include original document if compression fails
        compressedDocs.push(doc);
      }
    }

    return compressedDocs;
  }
}

export class EmbeddingsFilter implements DocumentCompressor {
  constructor(
    private similarityThreshold: number = 0.76,
    private k: number = 20
  ) {}

  async compressDocuments(documents: Document[], query: string): Promise<Document[]> {
    if (documents.length === 0) return documents;

    try {
      // Generate query embedding
      const { embedding: queryEmbedding } = await generateEmbedding(query);

      // Calculate similarities
      const docsWithSimilarity = await Promise.all(
        documents.map(async doc => {
          try {
            const { embedding: docEmbedding } = await generateEmbedding(doc.pageContent);
            const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
            
            return {
              doc,
              similarity
            };
          } catch (error) {
            console.warn('Failed to generate embedding for document:', error);
            return {
              doc,
              similarity: 0
            };
          }
        })
      );

      // Filter and sort by similarity
      return docsWithSimilarity
        .filter(item => item.similarity >= this.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.k)
        .map(item => ({
          ...item.doc,
          metadata: {
            ...item.doc.metadata,
            compressionSimilarity: item.similarity
          }
        }));
    } catch (error) {
      console.warn('Failed to filter documents by embeddings:', error);
      return documents;
    }
  }
}

// Multi-query retriever
export class MultiQueryRetriever implements BaseRetriever {
  name = 'multi_query';
  description = 'Generates multiple queries and combines results';

  constructor(
    private baseRetriever: BaseRetriever,
    private queryGenerator: QueryGenerator,
    private k: number = 5
  ) {}

  async getRelevantDocuments(query: string, options?: any): Promise<Document[]> {
    // Generate multiple queries
    const queries = await this.queryGenerator.generateQueries(query);
    
    // Get results for all queries
    const allResults = await Promise.all(
      queries.map(q => this.baseRetriever.getRelevantDocuments(q, options))
    );

    // Deduplicate and combine results
    const uniqueResults = this.deduplicateResults(allResults.flat());
    
    return uniqueResults.slice(0, options?.k || this.k);
  }

  private deduplicateResults(results: Document[]): Document[] {
    const seen = new Set<string>();
    return results.filter(doc => {
      const key = `${doc.metadata.contentType}:${doc.metadata.contentId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export interface QueryGenerator {
  generateQueries(query: string): Promise<string[]>;
}

export class LLMQueryGenerator implements QueryGenerator {
  constructor(private numQueries: number = 3) {}

  async generateQueries(query: string): Promise<string[]> {
    const prompt = `
Generate ${this.numQueries} different ways to ask the following question. 
The variations should use different wording and perspectives while maintaining the same meaning.

Original question: "${query}"

Generate ${this.numQueries} alternative questions:
`;

    try {
      const response = await aiWorkflowExecutor.simpleAICall(prompt, {
        temperature: 0.7,
        model: 'openai/gpt-4o'
      });

      // Parse the response to extract queries
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      const queries = lines
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, this.numQueries);

      return [query, ...queries]; // Include original query
    } catch (error) {
      console.warn('Failed to generate multiple queries:', error);
      return [query];
    }
  }
}

// Retriever manager
export class RetrieverManager {
  private retrievers = new Map<string, BaseRetriever>();

  registerRetriever(name: string, retriever: BaseRetriever): void {
    this.retrievers.set(name, retriever);
  }

  getRetriever(name: string): BaseRetriever | undefined {
    return this.retrievers.get(name);
  }

  async retrieve(
    retrieverName: string,
    query: string,
    options?: any
  ): Promise<Document[]> {
    const retriever = this.getRetriever(retrieverName);
    if (!retriever) {
      throw new Error(`Retriever '${retrieverName}' not found`);
    }
    
    return retriever.getRelevantDocuments(query, options);
  }

  listRetrievers(): Array<{ name: string; description: string }> {
    return Array.from(this.retrievers.values()).map(retriever => ({
      name: retriever.name,
      description: retriever.description
    }));
  }
}

// Singleton instance with default retrievers
export const retrieverManager = new RetrieverManager();

// Initialize default retrievers
const vectorStore = getVectorStore();
retrieverManager.registerRetriever('vector_store', new VectorStoreRetriever(vectorStore));
retrieverManager.registerRetriever('time_weighted', new TimeWeightedVectorStoreRetriever(vectorStore));

// Utility functions
export async function retrieveRelevantDocuments(
  query: string,
  retrieverType: 'vector_store' | 'time_weighted' | 'multi_vector' = 'vector_store',
  options?: any
): Promise<Document[]> {
  return retrieverManager.retrieve(retrieverType, query, options);
}

export function createContextualCompressionRetriever(
  baseRetriever: BaseRetriever,
  compressorType: 'llm' | 'embeddings' = 'embeddings'
): ContextualCompressionRetriever {
  const compressor = compressorType === 'llm' 
    ? new LLMChainExtractor()
    : new EmbeddingsFilter();
  
  return new ContextualCompressionRetriever(baseRetriever, compressor);
}

export function createMultiQueryRetriever(
  baseRetriever: BaseRetriever,
  numQueries: number = 3
): MultiQueryRetriever {
  const queryGenerator = new LLMQueryGenerator(numQueries);
  return new MultiQueryRetriever(baseRetriever, queryGenerator);
}

// Note: All retriever classes are already exported above with their class declarations
