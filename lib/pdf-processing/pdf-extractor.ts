// PDF Text Extraction Service
// Extracts text content from PDF files and splits into chunks

import pdf from 'pdf-parse';

export interface PDFChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  chunkType: 'paragraph' | 'section' | 'page';
  sectionTitle?: string;
  wordCount: number;
}

export interface PDFExtractionResult {
  chunks: PDFChunk[];
  metadata: {
    totalPages: number;
    totalWords: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
  success: boolean;
  error?: string;
}

export interface PDFExtractionOptions {
  chunkSize?: number; // Target words per chunk
  chunkOverlap?: number; // Overlap words between chunks
  minChunkSize?: number; // Minimum words per chunk
  extractByPage?: boolean; // Extract by page instead of semantic chunks
}

const DEFAULT_OPTIONS: Required<PDFExtractionOptions> = {
  chunkSize: 300,
  chunkOverlap: 50,
  minChunkSize: 50,
  extractByPage: false,
};

/**
 * Extract text from PDF buffer
 */
export async function extractPDFText(
  pdfBuffer: Buffer,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    console.log('📄 Starting PDF text extraction...');
    
    // Parse PDF
    const data = await pdf(pdfBuffer, {
      max: 0, // Extract all pages
    });
    
    console.log(`📊 PDF parsed: ${data.numpages} pages, ${data.text.length} characters`);
    
    // Extract metadata
    const metadata = {
      totalPages: data.numpages,
      totalWords: countWords(data.text),
      title: data.info?.Title,
      author: data.info?.Author,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
    };
    
    console.log(`📝 Metadata: ${metadata.totalWords} words, ${metadata.totalPages} pages`);
    
    // Extract chunks
    let chunks: PDFChunk[];
    
    if (opts.extractByPage) {
      // Extract by page
      chunks = await extractByPage(pdfBuffer, opts);
    } else {
      // Extract by semantic chunks (paragraphs)
      chunks = extractByParagraphs(data.text, data.numpages, opts);
    }
    
    console.log(`✅ Extracted ${chunks.length} chunks from PDF`);
    
    return {
      chunks,
      metadata,
      success: true,
    };
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    return {
      chunks: [],
      metadata: {
        totalPages: 0,
        totalWords: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract text by page
 */
async function extractByPage(
  pdfBuffer: Buffer,
  options: Required<PDFExtractionOptions>
): Promise<PDFChunk[]> {
  const chunks: PDFChunk[] = [];
  
  // Parse PDF with page-by-page extraction
  const data = await pdf(pdfBuffer, {
    max: 0,
    pagerender: async (pageData: any) => {
      const pageNum = pageData.pageIndex + 1;
      const text = await pageData.getTextContent();
      
      // Combine text items
      const pageText = text.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText.length > 0) {
        chunks.push({
          content: pageText,
          pageNumber: pageNum,
          chunkIndex: chunks.length,
          chunkType: 'page',
          wordCount: countWords(pageText),
        });
      }
      
      return pageData;
    },
  });
  
  return chunks;
}

/**
 * Extract text by paragraphs with sliding window
 */
function extractByParagraphs(
  fullText: string,
  totalPages: number,
  options: Required<PDFExtractionOptions>
): PDFChunk[] {
  const chunks: PDFChunk[] = [];
  
  // Clean and normalize text
  const cleanText = fullText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
  
  // Split into paragraphs (double newline or more)
  const paragraphs = cleanText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  console.log(`📝 Found ${paragraphs.length} paragraphs`);
  
  // Group paragraphs into chunks
  let currentChunk = '';
  let currentWordCount = 0;
  let chunkIndex = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWords = countWords(paragraph);
    
    // Check if adding this paragraph would exceed chunk size
    if (currentWordCount > 0 && currentWordCount + paragraphWords > options.chunkSize) {
      // Save current chunk
      if (currentWordCount >= options.minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          pageNumber: estimatePageNumber(chunkIndex, chunks.length, totalPages),
          chunkIndex: chunkIndex++,
          chunkType: 'paragraph',
          wordCount: currentWordCount,
        });
      }
      
      // Start new chunk with overlap
      const overlapText = getLastWords(currentChunk, options.chunkOverlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentWordCount = countWords(overlapText) + paragraphWords;
    } else {
      // Add to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
      currentWordCount += paragraphWords;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0 && currentWordCount >= options.minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      pageNumber: estimatePageNumber(chunkIndex, chunks.length, totalPages),
      chunkIndex: chunkIndex++,
      chunkType: 'paragraph',
      wordCount: currentWordCount,
    });
  }
  
  return chunks;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Get last N words from text
 */
function getLastWords(text: string, wordCount: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) return text;
  return words.slice(-wordCount).join(' ');
}

/**
 * Estimate page number for a chunk
 */
function estimatePageNumber(chunkIndex: number, totalChunks: number, totalPages: number): number {
  if (totalChunks === 0) return 1;
  const estimatedPage = Math.ceil((chunkIndex / totalChunks) * totalPages);
  return Math.max(1, Math.min(estimatedPage, totalPages));
}

/**
 * Extract text from PDF URL
 */
export async function extractPDFFromURL(
  url: string,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  try {
    console.log(`📥 Fetching PDF from URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return extractPDFText(buffer, options);
    
  } catch (error) {
    console.error('❌ Failed to extract PDF from URL:', error);
    return {
      chunks: [],
      metadata: {
        totalPages: 0,
        totalWords: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate PDF buffer
 */
export function isPDFBuffer(buffer: Buffer): boolean {
  // PDF files start with %PDF-
  return buffer.length > 4 && buffer.toString('utf8', 0, 5) === '%PDF-';
}
