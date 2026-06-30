// PDF Text Extraction Service
// Extracts text content from PDF files and splits into chunks

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
    
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const document = await pdfjs.getDocument({
      data: Uint8Array.from(pdfBuffer),
    }).promise;
    const pages: Array<{ num: number; text: string }> = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push({ num: pageNumber, text });
      page.cleanup();
    }
    const fullText = pages.map(page => page.text).join('\n\n');
    const rawMetadata = await document.getMetadata().catch(() => null);
    const info = (rawMetadata?.info ?? {}) as Record<string, unknown>;
    
    console.log(`📊 PDF parsed: ${document.numPages} pages, ${fullText.length} characters`);
    
    // Extract metadata
    const metadata = {
      totalPages: document.numPages,
      totalWords: countWords(fullText),
      title: typeof info.Title === 'string' ? info.Title : undefined,
      author: typeof info.Author === 'string' ? info.Author : undefined,
      creationDate: undefined,
    };
    
    console.log(`📝 Metadata: ${metadata.totalWords} words, ${metadata.totalPages} pages`);
    
    // Extract chunks
    let chunks: PDFChunk[];
    
    if (opts.extractByPage) {
      // Extract by page using page-wise text
      chunks = extractByPageFromTextResult({ pages }, opts);
    } else {
      chunks = extractParagraphChunksFromPages(pages, opts);
    }
    
    console.log(`✅ Extracted ${chunks.length} chunks from PDF`);
    
    // Clean up
    await document.destroy();
    
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
 * Extract text by page from TextResult
 */
function extractByPageFromTextResult(
  textResult: any,
  options: Required<PDFExtractionOptions>
): PDFChunk[] {
  const chunks: PDFChunk[] = [];
  
  // Extract text from each page
  if (textResult.pages && Array.isArray(textResult.pages)) {
    textResult.pages.forEach((page: { num: number; text: string }) => {
      const trimmedText = page.text.trim();
      if (trimmedText.length > 0) {
        chunks.push({
          content: trimmedText,
          pageNumber: page.num,
          chunkIndex: chunks.length,
          chunkType: 'page',
          wordCount: countWords(trimmedText),
        });
      }
    });
  }
  
  return chunks;
}

/**
 * Extract text by paragraphs with sliding window
 */
function extractByParagraphs(
  fullText: string,
  pageNumber: number,
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
          pageNumber,
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
  
  // Never silently discard a short document tail. Merge it into the preceding
  // chunk when possible, otherwise retain it as the only chunk.
  if (currentChunk.trim().length > 0) {
    if (currentWordCount < options.minChunkSize && chunks.length > 0) {
      const previous = chunks[chunks.length - 1];
      previous.content = `${previous.content}\n\n${currentChunk.trim()}`;
      previous.wordCount = countWords(previous.content);
    } else {
      chunks.push({
        content: currentChunk.trim(),
        pageNumber,
        chunkIndex: chunkIndex++,
        chunkType: 'paragraph',
        wordCount: currentWordCount,
      });
    }
  }
  
  return chunks;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const cjkCharacters = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const nonCjkWords = text
    .replace(/[\u3400-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  // This is a language-aware size unit, not a linguistic word count. It keeps
  // Chinese text from being treated as a single word.
  return cjkCharacters + nonCjkWords;
}

/**
 * Get last N words from text
 */
function getLastWords(text: string, wordCount: number): string {
  const units = text.match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+/g) || [];
  if (units.length <= wordCount) return text;
  return units.slice(-wordCount).join(' ');
}

/**
 * Create paragraph chunks independently inside each real PDF page.
 */
function extractParagraphChunksFromPages(
  pages: Array<{ num: number; text: string }>,
  options: Required<PDFExtractionOptions>
): PDFChunk[] {
  const chunks: PDFChunk[] = [];

  for (const page of pages) {
    const pageChunks = extractByParagraphs(page.text, page.num, options);
    for (const chunk of pageChunks) {
      chunks.push({
        ...chunk,
        chunkIndex: chunks.length,
      });
    }
  }

  return chunks;
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
