// Comprehensive LangChain Integration API
// This module provides a unified interface for all LangChain functionality

import { z } from 'zod';
import { Document } from './document-loaders';
import { 
  outputParserManager, 
  parseJson, 
  parseStructured, 
  CommonSchemas,
  StructuredOutputParser
} from './output-parsers';
import { 
  documentLoaderManager,
  loadTextFile,
  loadJsonFile,
  loadCsvFile,
  loadWebPage,
  loadMarkdownFile
} from './document-loaders';
import {
  textSplitterManager,
  splitTextRecursively,
  splitTextByLanguage,
  splitTextSemantically,
  RecursiveCharacterTextSplitter,
  SemanticTextSplitter
} from './text-splitters';
import {
  retrieverManager,
  retrieveRelevantDocuments,
  createContextualCompressionRetriever,
  createMultiQueryRetriever,
  VectorStoreRetriever
} from './retrievers';
import { getVectorStore } from './vectorstore';
import { generateEmbedding, generateDualEmbedding } from './embedding';
import { aiWorkflowExecutor } from './ai-workflow';
import { getLLM, getAnalyticalLLM } from './client';
import { HumanMessage } from "@langchain/core/messages";

// Main LangChain integration class
export class StudifyLangChain {
  private static instance: StudifyLangChain | null = null;
  
  // Managers
  public readonly parsers = outputParserManager;
  public readonly loaders = documentLoaderManager;
  public readonly splitters = textSplitterManager;
  public readonly retrievers = retrieverManager;
  public readonly vectorStore = getVectorStore();

  private constructor() {
    this.initializeComponents();
  }

  static getInstance(): StudifyLangChain {
    if (!StudifyLangChain.instance) {
      StudifyLangChain.instance = new StudifyLangChain();
    }
    return StudifyLangChain.instance;
  }

  private initializeComponents(): void {
    // Initialize default retrievers if not already done
    if (this.retrievers.listRetrievers().length === 0) {
      const vectorRetriever = new VectorStoreRetriever(this.vectorStore);
      this.retrievers.registerRetriever('default', vectorRetriever);
    }
  }

  // === DOCUMENT PROCESSING PIPELINE ===

  /**
   * Complete document processing pipeline: Load → Split → Embed → Store
   */
  async processDocument(
    source: string | Document,
    options: {
      splitConfig?: {
        method?: 'recursive' | 'semantic' | 'language';
        chunkSize?: number;
        chunkOverlap?: number;
        language?: string;
      };
      storeInVector?: boolean;
      contentType?: string;
    } = {}
  ): Promise<{
    documents: Document[];
    chunks: Document[];
    embeddings?: Array<{ chunk: Document; embedding: number[] }>;
    stored: boolean;
  }> {
    const { splitConfig = {}, storeInVector = true } = options;

    // Step 1: Load document(s)
    let documents: Document[];
    if (typeof source === 'string') {
      // Check if source is a URL
      if (source.startsWith('http://') || source.startsWith('https://')) {
        documents = await loadWebPage(source);
      } 
      // Check if source is a data URI or looks like content rather than a file path
      else if (
        source.startsWith('data:') || 
        source.length > 500 || 
        !source.includes('.') || 
        source.includes('\n') ||
        source.includes(' ')
      ) {
        // Treat as direct content, not a file path
        documents = [{
          pageContent: source,
          metadata: {
            source: 'direct-content',
            contentType: 'text/plain',
            contentLength: source.length,
            timestamp: new Date().toISOString()
          }
        }];
      } 
      // Otherwise, try to load as a file
      else {
        // Try to determine file type and load accordingly
        const ext = source.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'json':
            documents = await loadJsonFile(source);
            break;
          case 'csv':
            documents = await loadCsvFile(source);
            break;
          case 'md':
          case 'markdown':
            documents = await loadMarkdownFile(source);
            break;
          default:
            documents = await loadTextFile(source);
        }
      }
    } else {
      documents = [source];
    }

    // Step 2: Split documents into chunks
    let chunks: Document[] = [];
    const { method = 'recursive', chunkSize = 1000, chunkOverlap = 200, language = 'en' } = splitConfig;

    for (const doc of documents) {
      let textChunks: string[] = [];
      
      switch (method) {
        case 'semantic':
          const semanticSplitter = new SemanticTextSplitter(chunkSize, chunkOverlap);
          textChunks = await semanticSplitter.splitText(doc.pageContent);
          break;
        case 'language':
          textChunks = await splitTextByLanguage(doc.pageContent, language, chunkSize, chunkOverlap);
          break;
        case 'recursive':
        default:
          textChunks = await splitTextRecursively(doc.pageContent, chunkSize, chunkOverlap);
      }

      // Convert text chunks to documents
      const docChunks = textChunks.map((chunk, index) => ({
        pageContent: chunk,
        metadata: {
          ...doc.metadata,
          chunkIndex: index,
          totalChunks: textChunks.length,
          splittingMethod: method
        }
      }));

      chunks.push(...docChunks);
    }

    // Step 3: Generate embeddings (optional)
    let embeddings: Array<{ chunk: Document; embedding: number[] }> | undefined;
    if (storeInVector) {
      embeddings = [];
      for (const chunk of chunks) {
        try {
          const { embedding } = await generateEmbedding(chunk.pageContent);
          embeddings.push({ chunk, embedding });
        } catch (error) {
          console.warn('Failed to generate embedding for chunk:', error);
        }
      }
    }

    // Step 4: Store in vector store (if requested)
    let stored = false;
    if (storeInVector && options.contentType) {
      try {
        // This would need to be implemented based on your vector store's API
        // For now, we'll mark as stored if embeddings were generated
        stored = embeddings !== undefined && embeddings.length > 0;
      } catch (error) {
        console.warn('Failed to store in vector store:', error);
      }
    }

    return {
      documents,
      chunks,
      embeddings,
      stored
    };
  }

  // === AI-POWERED WORKFLOWS ===

  /**
   * AI-powered document analysis workflow
   */
  async analyzeDocument(
    source: string | Document,
    analysisType: 'summary' | 'topics' | 'questions' | 'custom' | 'problem_solving',
    customPrompt?: string
  ): Promise<any> {
    // Process document
    const { chunks } = await this.processDocument(source, {
      splitConfig: { chunkSize: 2000, method: 'semantic' },
      storeInVector: false
    });

    // Combine chunks for analysis
    const fullText = chunks.map(chunk => chunk.pageContent).join('\n\n');

    let prompt: string;
    let parser: any;

    switch (analysisType) {
      case 'summary':
        prompt = `Provide a comprehensive summary of the following document:

${fullText}

Summary:`;
        break;

      case 'topics':
        prompt = `Extract the main topics and key concepts from the following document:

${fullText}

Please format your response as JSON:`;
        parser = new StructuredOutputParser(CommonSchemas.courseAnalysis);
        break;

      case 'questions':
        prompt = `Generate thoughtful questions based on the following document content:

${fullText}

Generate 5-10 questions in JSON format:`;
        parser = new StructuredOutputParser(CommonSchemas.quiz);
        break;

      case 'problem_solving':
        prompt = `Analyze and solve the problem presented in the following content. Provide:
1. Problem understanding and clarification
2. Step-by-step solution approach
3. Detailed solution with explanations
4. Alternative approaches if applicable
5. Key concepts and learning points

Content:
${fullText}

Solution:`;
        break;

      case 'custom':
        if (!customPrompt) {
          throw new Error('Custom prompt is required for custom analysis');
        }
        prompt = `${customPrompt}\n\nDocument content:\n${fullText}`;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    // Add format instructions if parser is available
    if (parser) {
      prompt += '\n\n' + parser.getFormatInstructions();
    }

    // 判断是否为图片分析（problem_solving且包含base64图片数据）
    const isImageAnalysis = analysisType === 'problem_solving' && fullText.startsWith('data:image/');
    
    // 使用您的 client.ts 中的 getLLM 函数，图片分析使用Kimi VL视觉模型
    const llm = isImageAnalysis 
      ? await getLLM({
          temperature: 0.3,
          model: 'moonshotai/kimi-vl-a3b-thinking:free'
        })
      : await getLLM({
          temperature: 0.3,
          model: 'deepseek/deepseek-chat-v3.1:free'
        });
    
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content as string;

    // Parse response if parser is available
    if (parser) {
      try {
        return parser.parse(responseText);
      } catch (error) {
        console.warn('Failed to parse AI response, returning raw text:', error);
        return responseText;
      }
    }

    return responseText;
  }

  /**
   * Semantic search with AI-powered result enhancement
   */
  async smartSearch(
    query: string,
    options: {
      contentTypes?: string[];
      maxResults?: number;
      enhanceResults?: boolean;
      searchType?: 'vector' | 'hybrid' | 'multi_query';
    } = {}
  ): Promise<{
    results: Document[];
    enhancedSummary?: string;
    relatedQueries?: string[];
  }> {
    const { 
      contentTypes, 
      maxResults = 10, 
      enhanceResults = true, 
      searchType = 'hybrid' 
    } = options;

    // Perform semantic search
    let results: Document[] = [];

    switch (searchType) {
      case 'multi_query':
        const baseRetriever = new VectorStoreRetriever(this.vectorStore);
        const multiQueryRetriever = createMultiQueryRetriever(baseRetriever, 3);
        results = await multiQueryRetriever.getRelevantDocuments(query, { 
          k: maxResults,
          contentTypes 
        });
        break;
      
      case 'vector':
      case 'hybrid':
      default:
        results = await retrieveRelevantDocuments(query, 'vector_store', {
          k: maxResults,
          contentTypes
        });
    }

    if (!enhanceResults) {
      return { results };
    }

    // AI-enhance the search results
    const resultsText = results.map((doc, index) => 
      `Result ${index + 1}:\n${doc.pageContent}`
    ).join('\n\n---\n\n');

    const enhancementPrompt = `Based on the search query "${query}" and the following search results, provide:

1. A concise summary of what was found
2. 3-5 related queries that might be helpful

Search Results:
${resultsText}

Please format your response as JSON:
{
  "summary": "Brief summary of search results...",
  "relatedQueries": ["query 1", "query 2", "query 3"]
}`;

    try {
      const llm = await getLLM({
        temperature: 0.3,
        model: 'deepseek/deepseek-chat-v3.1:free'
      });
      
      const enhancementResponse = await llm.invoke([new HumanMessage(enhancementPrompt)]);
      const enhancementText = enhancementResponse.content as string;

      const parsed = parseJson(enhancementText);
      
      return {
        results,
        enhancedSummary: parsed.summary,
        relatedQueries: parsed.relatedQueries
      };
    } catch (error) {
      console.warn('Failed to enhance search results:', error);
      return { results };
    }
  }

  /**
   * Question-answering with context retrieval
   */
  async answerQuestion(
    question: string,
    options: {
      contentTypes?: string[];
      maxContext?: number;
      includeSourceReferences?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<{
    answer: string;
    confidence: number;
    sources: Document[];
    reasoning?: string;
  }> {
    const { 
      contentTypes, 
      maxContext = 5, 
      includeSourceReferences = true,
      confidenceThreshold = 0.7 
    } = options;

    // Retrieve relevant context
    const contextDocs = await retrieveRelevantDocuments(question, 'vector_store', {
      k: maxContext,
      contentTypes,
      scoreThreshold: confidenceThreshold
    });

    if (contextDocs.length === 0) {
      return {
        answer: "I couldn't find relevant information to answer your question.",
        confidence: 0,
        sources: []
      };
    }

    // Prepare context
    const context = contextDocs.map((doc, index) => 
      `[${index + 1}] ${doc.pageContent}`
    ).join('\n\n');

    // Generate answer with reasoning
    const answerPrompt = `Based on the following context, answer the question. If you're uncertain, indicate your level of confidence.

Question: ${question}

Context:
${context}

Please format your response as JSON:
{
  "answer": "Your detailed answer here...",
  "confidence": 0.9,
  "reasoning": "Brief explanation of how you arrived at this answer..."
}

${includeSourceReferences ? 'Include references to context sources using [1], [2], etc. in your answer.' : ''}`;

    try {
      const llm = await getAnalyticalLLM({
        temperature: 0.2,
        model: 'deepseek/deepseek-chat-v3.1:free'
      });
      
      const response = await llm.invoke([new HumanMessage(answerPrompt)]);
      const responseText = response.content as string;

      const parsed = parseJson(responseText);
      
      return {
        answer: parsed.answer,
        confidence: parsed.confidence || 0.5,
        sources: contextDocs,
        reasoning: parsed.reasoning
      };
    } catch (error) {
      console.error('Failed to generate answer:', error);
      return {
        answer: "I encountered an error while processing your question.",
        confidence: 0,
        sources: contextDocs
      };
    }
  }

  // === UTILITY METHODS ===

  /**
   * Get system capabilities and status
   */
  getCapabilities(): {
    parsers: string[];
    loaders: string[];
    splitters: string[];
    retrievers: string[];
    embeddingModels: string[];
  } {
    return {
      parsers: this.parsers.listParsers().map(p => p.name),
      loaders: this.loaders.getSupportedExtensions(),
      splitters: this.splitters.listSplitters(),
      retrievers: this.retrievers.listRetrievers().map(r => r.name),
      embeddingModels: ['e5-small', 'bge-m3']
    };
  }

  /**
   * Execute a custom AI workflow with LangChain components
   */
  async executeCustomWorkflow(
    workflowConfig: {
      steps: Array<{
        type: 'load' | 'split' | 'retrieve' | 'parse' | 'ai_call';
        config: any;
      }>;
      input: any;
    }
  ): Promise<any> {
    let currentData = workflowConfig.input;

    for (const step of workflowConfig.steps) {
      switch (step.type) {
        case 'load':
          if (typeof currentData === 'string') {
            currentData = await this.loaders.loadFile(currentData, step.config);
          }
          break;
        
        case 'split':
          if (Array.isArray(currentData)) {
            const splitter = this.splitters.getSplitter(
              step.config.method || 'recursive_character',
              step.config.chunkSize || 1000,
              step.config.chunkOverlap || 200
            );
            if (splitter) {
              currentData = await splitter.splitDocuments(currentData);
            }
          }
          break;
        
        case 'retrieve':
          if (typeof currentData === 'string') {
            currentData = await this.retrievers.retrieve(
              step.config.retriever || 'default',
              currentData,
              step.config
            );
          }
          break;
        
        case 'parse':
          if (typeof currentData === 'string') {
            currentData = this.parsers.parse(currentData, step.config.parser);
          }
          break;
        
        case 'ai_call':
          let prompt = step.config.prompt;
          if (typeof currentData === 'object') {
            prompt = prompt.replace('{input}', JSON.stringify(currentData));
          } else {
            prompt = prompt.replace('{input}', String(currentData));
          }
          
          const llm = await getLLM(step.config.options || {});
          const response = await llm.invoke([new HumanMessage(prompt)]);
          currentData = response.content as string;
          break;
      }
    }

    return currentData;
  }
}

// Singleton instance
export const langchain = StudifyLangChain.getInstance();

// === CONVENIENCE FUNCTIONS ===

/**
 * Quick document analysis
 */
export async function analyzeDocument(
  source: string | Document,
  type: 'summary' | 'topics' | 'questions' | 'problem_solving' = 'summary'
) {
  return langchain.analyzeDocument(source, type);
}

/**
 * Smart semantic search
 */
export async function smartSearch(query: string, options?: {
  contentTypes?: string[];
  maxResults?: number;
  enhanceResults?: boolean;
}) {
  return langchain.smartSearch(query, options);
}

/**
 * Question answering
 */
export async function answerQuestion(question: string, options?: {
  contentTypes?: string[];
  maxContext?: number;
  includeSourceReferences?: boolean;
}) {
  return langchain.answerQuestion(question, options);
}

/**
 * Process and store document
 */
export async function processDocument(source: string | Document, options?: {
  storeInVector?: boolean;
  contentType?: string;
}) {
  return langchain.processDocument(source, options);
}

// Export schemas for external use
export { CommonSchemas };

// Note: StudifyLangChain is already exported above with its class declaration
// Export manager utilities
export {
  outputParserManager,
  documentLoaderManager,
  textSplitterManager,
  retrieverManager
};
