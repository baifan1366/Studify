import { Document } from './document-loaders';
import { cosineSimilarity } from './embedding';

// Text splitter interface
export interface TextSplitter {
  splitText(text: string): Promise<string[]>;
  splitDocuments(documents: Document[]): Promise<Document[]>;
  createDocuments(texts: string[], metadatas?: Record<string, any>[]): Promise<Document[]>;
}

// Base text splitter class
export abstract class BaseTextSplitter implements TextSplitter {
  constructor(
    protected chunkSize: number = 1000,
    protected chunkOverlap: number = 200,
    protected lengthFunction: (text: string) => number = (text) => text.length,
    protected keepSeparator: boolean = false,
    protected addStartIndex: boolean = false
  ) {}

  abstract splitText(text: string): Promise<string[]>;

  async splitDocuments(documents: Document[]): Promise<Document[]> {
    const splitDocs: Document[] = [];
    
    for (const doc of documents) {
      const chunks = await this.splitText(doc.pageContent);
      for (let i = 0; i < chunks.length; i++) {
        splitDocs.push({
          pageContent: chunks[i],
          metadata: {
            ...doc.metadata,
            chunkIndex: i,
            totalChunks: chunks.length,
            ...(this.addStartIndex && { startIndex: this.calculateStartIndex(doc.pageContent, chunks[i], i) })
          }
        });
      }
    }
    
    return splitDocs;
  }

  async createDocuments(texts: string[], metadatas?: Record<string, any>[]): Promise<Document[]> {
    const _metadatas = metadatas || texts.map(() => ({}));
    const documents: Document[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const chunks = await this.splitText(texts[i]);
      for (let j = 0; j < chunks.length; j++) {
        documents.push({
          pageContent: chunks[j],
          metadata: {
            ..._metadatas[i],
            source: `doc_${i}`,
            contentType: 'text/plain',
            chunkIndex: j,
            totalChunks: chunks.length,
            ...(this.addStartIndex && { startIndex: this.calculateStartIndex(texts[i], chunks[j], j) })
          }
        });
      }
    }
    
    return documents;
  }

  protected calculateStartIndex(originalText: string, chunk: string, chunkIndex: number): number {
    if (chunkIndex === 0) return 0;
    
    const index = originalText.indexOf(chunk);
    return index !== -1 ? index : chunkIndex * (this.chunkSize - this.chunkOverlap);
  }

  protected mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;

    for (const split of splits) {
      const splitLen = this.lengthFunction(split);
      
      if (total + splitLen + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
        if (total > this.chunkSize) {
          console.warn(`Created a chunk of size ${total}, which is longer than the specified ${this.chunkSize}`);
        }
        if (currentDoc.length > 0) {
          const doc = this.joinDocs(currentDoc, separator);
          if (doc !== null) {
            docs.push(doc);
          }
          // Keep some overlap
          while (total > this.chunkOverlap || (total + splitLen + separator.length > this.chunkSize && total > 0)) {
            total -= this.lengthFunction(currentDoc[0]) + (currentDoc.length > 1 ? separator.length : 0);
            currentDoc.shift();
          }
        }
      }
      
      currentDoc.push(split);
      total += splitLen + (currentDoc.length > 1 ? separator.length : 0);
    }

    const doc = this.joinDocs(currentDoc, separator);
    if (doc !== null) {
      docs.push(doc);
    }
    
    return docs;
  }

  protected joinDocs(docs: string[], separator: string): string | null {
    const text = docs.join(separator).trim();
    return text === "" ? null : text;
  }
}

// Character text splitter
export class CharacterTextSplitter extends BaseTextSplitter {
  constructor(
    private separator: string = "\n\n",
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    lengthFunction?: (text: string) => number,
    keepSeparator: boolean = false,
    addStartIndex: boolean = false
  ) {
    super(chunkSize, chunkOverlap, lengthFunction, keepSeparator, addStartIndex);
  }

  async splitText(text: string): Promise<string[]> {
    const splits = text.split(this.separator);
    return this.mergeSplits(splits, this.separator);
  }
}

// Recursive character text splitter (more sophisticated)
export class RecursiveCharacterTextSplitter extends BaseTextSplitter {
  constructor(
    private separators: string[] = ["\n\n", "\n", " ", ""],
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    lengthFunction?: (text: string) => number,
    keepSeparator: boolean = false,
    addStartIndex: boolean = false,
    private stripWhitespace: boolean = true
  ) {
    super(chunkSize, chunkOverlap, lengthFunction, keepSeparator, addStartIndex);
  }

  async splitText(text: string): Promise<string[]> {
    const finalChunks: string[] = [];
    let separator = this.separators[this.separators.length - 1];
    let newSeparators: string[] = [];
    
    for (let i = 0; i < this.separators.length; i++) {
      const _separator = this.separators[i];
      if (_separator === "") {
        separator = _separator;
        break;
      }
      if (text.includes(_separator)) {
        separator = _separator;
        newSeparators = this.separators.slice(i + 1);
        break;
      }
    }

    const splits = this.splitTextWithSeparator(text, separator, this.keepSeparator);
    const goodSplits: string[] = [];
    const _separator = this.keepSeparator ? "" : separator;

    for (const s of splits) {
      if (this.lengthFunction(s) < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length > 0) {
          const mergedText = this.mergeSplits(goodSplits, _separator);
          finalChunks.push(...mergedText);
          goodSplits.length = 0;
        }
        if (!newSeparators) {
          finalChunks.push(s);
        } else {
          const otherInfo = await new RecursiveCharacterTextSplitter(
            newSeparators,
            this.chunkSize,
            this.chunkOverlap,
            this.lengthFunction,
            this.keepSeparator,
            this.addStartIndex,
            this.stripWhitespace
          ).splitText(s);
          finalChunks.push(...otherInfo);
        }
      }
    }

    if (goodSplits.length > 0) {
      const mergedText = this.mergeSplits(goodSplits, _separator);
      finalChunks.push(...mergedText);
    }

    return finalChunks;
  }

  private splitTextWithSeparator(text: string, separator: string, keepSeparator: boolean): string[] {
    let splits: string[];
    if (separator) {
      if (keepSeparator) {
        const regexEscaped = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${regexEscaped})`, 'g');
        splits = text.split(regex);
      } else {
        splits = text.split(separator);
      }
    } else {
      splits = text.split('');
    }

    return this.stripWhitespace ? splits.filter(s => s !== "").map(s => s.trim()) : splits.filter(s => s !== "");
  }
}

// Token-based text splitter
export class TokenTextSplitter extends BaseTextSplitter {
  constructor(
    private encodingName: string = "gpt2",
    private modelName?: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    private allowedSpecial: string[] = [],
    private disallowedSpecial: string[] = []
  ) {
    super(chunkSize, chunkOverlap, (text: string) => this.tokenLengthFunction(text));
  }

  async splitText(text: string): Promise<string[]> {
    // This is a simplified implementation
    // In a real implementation, you would use tiktoken or similar
    const tokens = this.tokenize(text);
    const chunks: string[] = [];
    
    for (let i = 0; i < tokens.length; i += this.chunkSize - this.chunkOverlap) {
      const chunkTokens = tokens.slice(i, i + this.chunkSize);
      const chunkText = this.decode(chunkTokens);
      chunks.push(chunkText);
    }
    
    return chunks;
  }

  private tokenLengthFunction(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  private tokenize(text: string): string[] {
    // Simplified tokenization - split on word boundaries and punctuation
    return text.match(/\w+|\W+/g) || [];
  }

  private decode(tokens: string[]): string {
    return tokens.join('');
  }
}

// Language-aware text splitter
export class LanguageTextSplitter extends RecursiveCharacterTextSplitter {
  constructor(
    language: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    lengthFunction?: (text: string) => number,
    keepSeparator: boolean = false,
    addStartIndex: boolean = false,
    stripWhitespace: boolean = true
  ) {
    const separators = LanguageTextSplitter.getSeparatorsForLanguage(language);
    super(separators, chunkSize, chunkOverlap, lengthFunction, keepSeparator, addStartIndex, stripWhitespace);
  }

  private static getSeparatorsForLanguage(language: string): string[] {
    const separatorMap: Record<string, string[]> = {
      python: [
        // Triple quotes
        '\n"""',
        "\n'''",
        // Class and function definitions
        '\nclass ',
        '\ndef ',
        '\n\tdef ',
        // Control structures
        '\nif ',
        '\nfor ',
        '\nwhile ',
        '\nwith ',
        '\ntry:',
        // Comments and docstrings
        '\n# ',
        '\n\n',
        '\n',
        ' ',
        ''
      ],
      javascript: [
        // Functions
        '\nfunction ',
        '\nconst ',
        '\nlet ',
        '\nvar ',
        // Classes and methods
        '\nclass ',
        '\n\tfunction ',
        '\n\t// ',
        // Control structures
        '\nif (',
        '\nfor (',
        '\nwhile (',
        // Comments
        '\n// ',
        '\n/* ',
        '\n\n',
        '\n',
        ' ',
        ''
      ],
      typescript: [
        '\ninterface ',
        '\ntype ',
        '\nenum ',
        '\nfunction ',
        '\nconst ',
        '\nlet ',
        '\nclass ',
        '\nif (',
        '\nfor (',
        '\nwhile (',
        '\n// ',
        '\n/* ',
        '\n\n',
        '\n',
        ' ',
        ''
      ],
      markdown: [
        '\n## ',
        '\n### ',
        '\n#### ',
        '\n##### ',
        '\n###### ',
        '\n# ',
        '```\n',
        '\n\n***\n\n',
        '\n\n---\n\n',
        '\n\n___\n\n',
        '\n\n',
        '\n',
        ' ',
        ''
      ],
      latex: [
        '\n\\chapter{',
        '\n\\section{',
        '\n\\subsection{',
        '\n\\subsubsection{',
        '\n\\begin{',
        '\n\\end{',
        '\n\n',
        '\n',
        ' ',
        ''
      ],
      html: [
        '<body>',
        '<div>',
        '<p>',
        '<br>',
        '<li>',
        '<h1>',
        '<h2>',
        '<h3>',
        '<h4>',
        '<h5>',
        '<h6>',
        '<span>',
        '<table>',
        '<tr>',
        '<td>',
        '<th>',
        '\n\n',
        '\n',
        ' ',
        ''
      ]
    };

    return separatorMap[language.toLowerCase()] || ["\n\n", "\n", " ", ""];
  }
}

// Semantic text splitter (using embeddings for intelligent chunking)
export class SemanticTextSplitter extends BaseTextSplitter {
  constructor(
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    private similarityThreshold: number = 0.8,
    private embeddingFunction?: (text: string) => Promise<number[]>,
    private bufferSize: number = 1,
    private breakpointThresholdType: 'percentile' | 'standard_deviation' | 'interquartile' = 'percentile',
    private breakpointThresholdAmount?: number
  ) {
    super(chunkSize, chunkOverlap, (text: string) => text.length);
  }

  async splitText(text: string): Promise<string[]> {
    if (!this.embeddingFunction) {
      // Fallback to recursive character splitting if no embedding function provided
      const fallbackSplitter = new RecursiveCharacterTextSplitter();
      return fallbackSplitter.splitText(text);
    }

    // Split into sentences first
    const sentences = this.splitIntoSentences(text);
    if (sentences.length <= 1) {
      return [text];
    }

    // Calculate embeddings for each sentence
    const embeddings: number[][] = [];
    for (const sentence of sentences) {
      try {
        const embedding = await this.embeddingFunction(sentence);
        embeddings.push(embedding);
      } catch (error) {
        console.warn(`Failed to get embedding for sentence: ${sentence.substring(0, 50)}...`);
        embeddings.push(new Array(384).fill(0)); // Default zero vector
      }
    }

    // Calculate distances between adjacent sentences
    const distances: number[] = [];
    for (let i = 0; i < embeddings.length - 1; i++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[i + 1]);
      distances.push(1 - similarity); // Convert similarity to distance
    }

    // Find breakpoints based on distance threshold
    const breakpoints = this.identifyBreakpoints(distances);

    // Create chunks based on breakpoints
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceLength = sentence.length;

      // Check if adding this sentence would exceed chunk size
      if (currentSize + sentenceLength > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' ').trim());
        
        // Handle overlap
        if (this.chunkOverlap > 0) {
          const overlapText = currentChunk.join(' ');
          const overlapChars = Math.min(this.chunkOverlap, overlapText.length);
          const overlapStart = Math.max(0, overlapText.length - overlapChars);
          const overlap = overlapText.substring(overlapStart);
          currentChunk = [overlap];
          currentSize = overlap.length;
        } else {
          currentChunk = [];
          currentSize = 0;
        }
      }

      currentChunk.push(sentence);
      currentSize += sentenceLength + (currentChunk.length > 1 ? 1 : 0); // +1 for space

      // Force break at semantic breakpoint if chunk is getting large
      if (breakpoints.includes(i) && currentSize > this.chunkSize * 0.5) {
        chunks.push(currentChunk.join(' ').trim());
        currentChunk = [];
        currentSize = 0;
      }
    }

    // Add remaining sentences as final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' ').trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting with better handling of abbreviations
    const sentences = text
      .replace(/([.!?])\s*\n/g, '$1 ')
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }

  private identifyBreakpoints(distances: number[]): number[] {
    if (distances.length === 0) return [];

    let threshold: number;

    switch (this.breakpointThresholdType) {
      case 'percentile':
        const percentile = this.breakpointThresholdAmount || 95;
        threshold = this.calculatePercentile(distances, percentile);
        break;
      case 'standard_deviation':
        const stdDevs = this.breakpointThresholdAmount || 2;
        const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);
        threshold = mean + stdDevs * stdDev;
        break;
      case 'interquartile':
        const multiplier = this.breakpointThresholdAmount || 1.5;
        const q1 = this.calculatePercentile(distances, 25);
        const q3 = this.calculatePercentile(distances, 75);
        const iqr = q3 - q1;
        threshold = q3 + multiplier * iqr;
        break;
      default:
        threshold = Math.max(...distances) * 0.8;
    }

    return distances
      .map((distance, index) => ({ distance, index }))
      .filter(item => item.distance > threshold)
      .map(item => item.index);
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    return lower === upper 
      ? sorted[lower] 
      : sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// Markdown header text splitter
export class MarkdownHeaderTextSplitter {
  constructor(
    private headersToSplitOn: Array<[string, string]> = [
      ["#", "Header 1"],
      ["##", "Header 2"],
      ["###", "Header 3"],
    ],
    private returnEachLine: boolean = false
  ) {}

  splitText(text: string): Document[] {
    const lines = text.split('\n');
    const chunks: Document[] = [];
    let currentContent: string[] = [];
    let currentHeaders: Record<string, string> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      let isHeader = false;

      // Check if line is a header
      for (const [headerMark, headerName] of this.headersToSplitOn) {
        if (trimmedLine.startsWith(headerMark + ' ')) {
          // Save current chunk if it exists
          if (currentContent.length > 0) {
            chunks.push({
              pageContent: currentContent.join('\n').trim(),
              metadata: {
                ...currentHeaders,
                source: 'markdown',
                contentType: 'text/markdown'
              }
            });
            currentContent = [];
          }

          // Update headers
          const headerLevel = headerMark.length;
          const headerText = trimmedLine.substring(headerMark.length + 1).trim();
          
          // Remove headers of same or lower level
          const newHeaders: Record<string, string> = {};
          for (const [mark, name] of this.headersToSplitOn) {
            if (mark.length < headerLevel && currentHeaders[name]) {
              newHeaders[name] = currentHeaders[name];
            }
          }
          newHeaders[headerName] = headerText;
          currentHeaders = newHeaders;

          isHeader = true;
          
          if (this.returnEachLine) {
            chunks.push({
              pageContent: trimmedLine,
              metadata: {
                ...currentHeaders,
                source: 'markdown',
                contentType: 'text/markdown',
                type: 'header'
              }
            });
          }
          break;
        }
      }

      if (!isHeader) {
        currentContent.push(line);
      }
    }

    // Add remaining content
    if (currentContent.length > 0) {
      chunks.push({
        pageContent: currentContent.join('\n').trim(),
        metadata: {
          ...currentHeaders,
          source: 'markdown',
          contentType: 'text/markdown'
        }
      });
    }

    return chunks.filter(chunk => chunk.pageContent.length > 0);
  }
}

// Python code splitter
export class PythonCodeTextSplitter extends LanguageTextSplitter {
  constructor(
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    lengthFunction?: (text: string) => number,
    keepSeparator: boolean = true,
    addStartIndex: boolean = false
  ) {
    super('python', chunkSize, chunkOverlap, lengthFunction, keepSeparator, addStartIndex);
  }
}

// Splitter manager
export class TextSplitterManager {
  private splitters = new Map<string, new (...args: any[]) => TextSplitter>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.splitters.set('character', CharacterTextSplitter);
    this.splitters.set('recursive_character', RecursiveCharacterTextSplitter);
    this.splitters.set('token', TokenTextSplitter);
    this.splitters.set('semantic', SemanticTextSplitter);
    this.splitters.set('python', PythonCodeTextSplitter);
    this.splitters.set('language', LanguageTextSplitter);
  }

  registerSplitter(name: string, SplitterClass: new (...args: any[]) => TextSplitter): void {
    this.splitters.set(name, SplitterClass);
  }

  getSplitter(name: string, ...args: any[]): TextSplitter | undefined {
    const SplitterClass = this.splitters.get(name);
    return SplitterClass ? new SplitterClass(...args) : undefined;
  }

  listSplitters(): string[] {
    return Array.from(this.splitters.keys());
  }
}

// Singleton instance
export const textSplitterManager = new TextSplitterManager();

// Utility functions
export async function splitTextByCharacter(
  text: string,
  separator: string = "\n\n",
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new CharacterTextSplitter(separator, chunkSize, chunkOverlap);
  return splitter.splitText(text);
}

export async function splitTextRecursively(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter(undefined, chunkSize, chunkOverlap);
  return splitter.splitText(text);
}

export async function splitTextByLanguage(
  text: string,
  language: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new LanguageTextSplitter(language, chunkSize, chunkOverlap);
  return splitter.splitText(text);
}

export async function splitTextSemantically(
  text: string,
  embeddingFunction: (text: string) => Promise<number[]>,
  chunkSize: number = 1000,
  chunkOverlap: number = 200,
  similarityThreshold: number = 0.8
): Promise<string[]> {
  const splitter = new SemanticTextSplitter(chunkSize, chunkOverlap, similarityThreshold, embeddingFunction);
  return splitter.splitText(text);
}

