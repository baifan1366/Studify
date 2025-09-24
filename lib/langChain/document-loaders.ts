import { createHash } from 'crypto';

// Document interface
export interface Document {
  pageContent: string;
  metadata: {
    source: string;
    contentType: string;
    size?: number;
    createdAt?: string;
    modifiedAt?: string;
    language?: string;
    encoding?: string;
    [key: string]: any;
  };
}

// Base document loader interface
export interface DocumentLoader {
  load(): Promise<Document[]>;
  loadAndSplit?(textSplitter?: any): Promise<Document[]>;
}

// Base loader class
export abstract class BaseLoader implements DocumentLoader {
  abstract load(): Promise<Document[]>;

  async loadAndSplit(textSplitter?: any): Promise<Document[]> {
    const docs = await this.load();
    if (!textSplitter) {
      return docs;
    }

    const splitDocs: Document[] = [];
    for (const doc of docs) {
      const chunks = await textSplitter.splitText(doc.pageContent);
      for (let i = 0; i < chunks.length; i++) {
        splitDocs.push({
          pageContent: chunks[i],
          metadata: {
            ...doc.metadata,
            chunkIndex: i,
            totalChunks: chunks.length
          }
        });
      }
    }
    return splitDocs;
  }
}

// Text loader for plain text files
export class TextLoader extends BaseLoader {
  constructor(
    private filePath: string,
    private encoding: string = 'utf-8'
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      // In a browser environment, this would need to be adapted
      const fs = await import('fs');
      const path = await import('path');
      
      const content = fs.readFileSync(this.filePath, { encoding: this.encoding as BufferEncoding });
      const stats = fs.statSync(this.filePath);
      
      return [{
        pageContent: content,
        metadata: {
          source: this.filePath,
          contentType: 'text/plain',
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          encoding: this.encoding
        }
      }];
    } catch (error) {
      throw new Error(`Failed to load text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// JSON loader
export class JsonLoader extends BaseLoader {
  constructor(
    private filePath: string,
    private jqSchema?: string // For extracting specific fields
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const content = fs.readFileSync(this.filePath, { encoding: 'utf-8' });
      const stats = fs.statSync(this.filePath);
      const jsonData = JSON.parse(content);
      
      // If it's an array, create a document for each item
      if (Array.isArray(jsonData)) {
        return jsonData.map((item, index) => ({
          pageContent: typeof item === 'string' ? item : JSON.stringify(item, null, 2),
          metadata: {
            source: this.filePath,
            contentType: 'application/json',
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            arrayIndex: index,
            totalItems: jsonData.length
          }
        }));
      } else {
        // Single JSON object
        return [{
          pageContent: JSON.stringify(jsonData, null, 2),
          metadata: {
            source: this.filePath,
            contentType: 'application/json',
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            jsonKeys: Object.keys(jsonData)
          }
        }];
      }
    } catch (error) {
      throw new Error(`Failed to load JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// CSV loader
export class CsvLoader extends BaseLoader {
  constructor(
    private filePath: string,
    private options: {
      delimiter?: string;
      hasHeader?: boolean;
      encoding?: string;
      contentColumn?: string; // Which column contains the main content
      metadataColumns?: string[]; // Which columns to include as metadata
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      const fs = await import('fs');
      const {
        delimiter = ',',
        hasHeader = true,
        encoding = 'utf-8',
        contentColumn,
        metadataColumns = []
      } = this.options;
      
      const content = fs.readFileSync(this.filePath, { encoding: encoding as BufferEncoding });
      const stats = fs.statSync(this.filePath);
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return [];
      }

      let headers: string[] = [];
      let dataStartIndex = 0;

      if (hasHeader) {
        headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        dataStartIndex = 1;
      }

      const documents: Document[] = [];

      for (let i = dataStartIndex; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        
        let pageContent: string;
        const metadata: any = {
          source: this.filePath,
          contentType: 'text/csv',
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          rowIndex: i - dataStartIndex,
          totalRows: lines.length - dataStartIndex
        };

        if (hasHeader && headers.length > 0) {
          // Create object from headers and values
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Use specified content column or concatenate all values
          if (contentColumn && rowData[contentColumn]) {
            pageContent = rowData[contentColumn];
          } else {
            pageContent = values.join(' | ');
          }

          // Add metadata columns
          metadataColumns.forEach(col => {
            if (rowData[col] !== undefined) {
              metadata[col] = rowData[col];
            }
          });

          // Add all column data as structured metadata
          metadata.rowData = rowData;
        } else {
          pageContent = values.join(' | ');
          metadata.columnCount = values.length;
        }

        documents.push({ pageContent, metadata });
      }

      return documents;
    } catch (error) {
      throw new Error(`Failed to load CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// HTML loader
export class HtmlLoader extends BaseLoader {
  constructor(
    private source: string, // URL or file path
    private options: {
      selector?: string; // CSS selector to extract specific elements
      excludeSelectors?: string[]; // Elements to exclude
      includeMetadata?: boolean;
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      let htmlContent: string;
      const metadata: any = {
        source: this.source,
        contentType: 'text/html'
      };

      // Check if it's a URL or file path
      if (this.source.startsWith('http://') || this.source.startsWith('https://')) {
        const response = await fetch(this.source);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        htmlContent = await response.text();
        metadata.url = this.source;
        metadata.status = response.status;
      } else {
        const fs = await import('fs');
        const content = fs.readFileSync(this.source, { encoding: 'utf-8' });
        const stats = fs.statSync(this.source);
        metadata.size = stats.size;
        metadata.createdAt = stats.birthtime.toISOString();
        metadata.modifiedAt = stats.mtime.toISOString();
        htmlContent = content;
      }

      // Basic HTML parsing (in a real implementation, you might use cheerio or jsdom)
      const textContent = this.extractTextFromHtml(htmlContent);
      
      if (this.options.includeMetadata) {
        const htmlMetadata = this.extractHtmlMetadata(htmlContent);
        Object.assign(metadata, htmlMetadata);
      }

      return [{
        pageContent: textContent,
        metadata
      }];
    } catch (error) {
      throw new Error(`Failed to load HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTextFromHtml(html: string): string {
    // Simple HTML to text conversion
    return html
      // Remove script and style tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities (basic)
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractHtmlMetadata(html: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract meta tags
    const metaMatches = html.matchAll(/<meta[^>]+>/gi);
    for (const match of metaMatches) {
      const metaTag = match[0];
      const nameMatch = metaTag.match(/name=["']([^"']+)["']/i);
      const contentMatch = metaTag.match(/content=["']([^"']+)["']/i);
      
      if (nameMatch && contentMatch) {
        metadata[`meta_${nameMatch[1]}`] = contentMatch[1];
      }
    }

    return metadata;
  }
}

// Markdown loader
export class MarkdownLoader extends BaseLoader {
  constructor(
    private filePath: string,
    private options: {
      encoding?: string;
      includeFrontmatter?: boolean;
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      const fs = await import('fs');
      const { encoding = 'utf-8', includeFrontmatter = true } = this.options;
      
      const content = fs.readFileSync(this.filePath, { encoding: encoding as BufferEncoding });
      const stats = fs.statSync(this.filePath);
      
      let pageContent = content;
      const metadata: any = {
        source: this.filePath,
        contentType: 'text/markdown',
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };

      // Extract frontmatter if present
      if (includeFrontmatter && content.startsWith('---')) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (frontmatterMatch) {
          const [, frontmatter, body] = frontmatterMatch;
          pageContent = body;
          
          // Parse frontmatter (simple YAML-like parsing)
          const frontmatterData = this.parseFrontmatter(frontmatter);
          metadata.frontmatter = frontmatterData;
          Object.assign(metadata, frontmatterData);
        }
      }

      // Extract headers for metadata
      const headers = this.extractHeaders(pageContent);
      if (headers.length > 0) {
        metadata.headers = headers;
        metadata.title = headers[0]?.text || metadata.title;
      }

      return [{
        pageContent: pageContent.trim(),
        metadata
      }];
    } catch (error) {
      throw new Error(`Failed to load Markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseFrontmatter(frontmatter: string): Record<string, any> {
    const data: Record<string, any> = {};
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        data[key.trim()] = value.trim().replace(/^["'](.*)["']$/, '$1');
      }
    }
    
    return data;
  }

  private extractHeaders(content: string): Array<{ level: number; text: string }> {
    const headers: Array<{ level: number; text: string }> = [];
    const headerMatches = content.matchAll(/^(#{1,6})\s+(.+)$/gm);
    
    for (const match of headerMatches) {
      headers.push({
        level: match[1].length,
        text: match[2].trim()
      });
    }
    
    return headers;
  }
}

// PDF loader (basic - would need pdf-parse or similar in real implementation)
export class PdfLoader extends BaseLoader {
  constructor(
    private filePath: string,
    private options: {
      splitPages?: boolean;
      includeMetadata?: boolean;
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    // Note: This is a placeholder implementation
    // In a real environment, you would use pdf-parse or similar library
    throw new Error('PDF loader requires pdf-parse library. Please install and implement PDF parsing.');
  }
}

// Web loader for scraping web pages
export class WebLoader extends BaseLoader {
  constructor(
    private urls: string[],
    private options: {
      selector?: string;
      excludeSelectors?: string[];
      maxPages?: number;
      delay?: number; // Delay between requests
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    const documents: Document[] = [];
    const { maxPages = 10, delay = 1000 } = this.options;
    
    const urlsToProcess = this.urls.slice(0, maxPages);
    
    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      
      try {
        const htmlLoader = new HtmlLoader(url, {
          selector: this.options.selector,
          excludeSelectors: this.options.excludeSelectors,
          includeMetadata: true
        });
        
        const docs = await htmlLoader.load();
        documents.push(...docs);
        
        // Add delay between requests
        if (i < urlsToProcess.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.warn(`Failed to load URL ${url}:`, error);
        // Continue with other URLs
      }
    }
    
    return documents;
  }
}

// Directory loader
export class DirectoryLoader extends BaseLoader {
  constructor(
    private directoryPath: string,
    private loaderMap: Record<string, typeof BaseLoader>, // File extension to loader mapping
    private options: {
      recursive?: boolean;
      excludePatterns?: string[];
      maxFiles?: number;
    } = {}
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const { recursive = true, excludePatterns = [], maxFiles = 100 } = this.options;
      
      const files = this.getFiles(this.directoryPath, recursive);
      const filteredFiles = files
        .filter(file => !this.shouldExclude(file, excludePatterns))
        .slice(0, maxFiles);
      
      const documents: Document[] = [];
      
      for (const filePath of filteredFiles) {
        try {
          const ext = path.extname(filePath).toLowerCase();
          const LoaderClass = this.loaderMap[ext];
        
        if (LoaderClass) {
          const loader = new (LoaderClass as any)(filePath);
            const docs = await loader.load();
            documents.push(...docs);
          }
        } catch (error) {
          console.warn(`Failed to load file ${filePath}:`, error);
        }
      }
      
      return documents;
    } catch (error) {
      throw new Error(`Failed to load directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getFiles(dirPath: string, recursive: boolean): string[] {
    const fs = require('fs');
    const path = require('path');
    
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        files.push(itemPath);
      } else if (stats.isDirectory() && recursive) {
        files.push(...this.getFiles(itemPath, recursive));
      }
    }
    
    return files;
  }

  private shouldExclude(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }
}

// Supabase document loader for loading from database
export class SupabaseLoader extends BaseLoader {
  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    private query: {
      table: string;
      contentColumn: string;
      metadataColumns?: string[];
      filter?: Record<string, any>;
      limit?: number;
    }
  ) {
    super();
  }

  async load(): Promise<Document[]> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(this.supabaseUrl, this.supabaseKey);
      
      const { table, contentColumn, metadataColumns = [], filter = {}, limit } = this.query;
      
      // Build query
      let query = supabase.from(table).select(`${contentColumn}, ${metadataColumns.join(', ')}`);
      
      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        pageContent: row[contentColumn] || '',
        metadata: {
          source: `${table}:${row.id}`,
          contentType: 'application/database',
          table,
          ...Object.fromEntries(
            metadataColumns.map(col => [col, row[col]])
          )
        }
      }));
    } catch (error) {
      throw new Error(`Failed to load from Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Document loader manager
export class DocumentLoaderManager {
  private loaders = new Map<string, typeof BaseLoader>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.loaders.set('.txt', TextLoader as any);
    this.loaders.set('.json', JsonLoader as any);
    this.loaders.set('.csv', CsvLoader as any);
    this.loaders.set('.html', HtmlLoader as any);
    this.loaders.set('.htm', HtmlLoader as any);
    this.loaders.set('.md', MarkdownLoader as any);
    this.loaders.set('.markdown', MarkdownLoader as any);
    this.loaders.set('.pdf', PdfLoader as any);
  }

  registerLoader(extension: string, LoaderClass: typeof BaseLoader): void {
    this.loaders.set(extension, LoaderClass);
  }

  getLoader(extension: string): typeof BaseLoader | undefined {
    return this.loaders.get(extension);
  }

  async loadFile(filePath: string, options?: any): Promise<Document[]> {
    const path = await import('path');
    const ext = path.extname(filePath).toLowerCase();
    const LoaderClass = this.getLoader(ext);
    
    if (!LoaderClass) {
      throw new Error(`No loader registered for file extension: ${ext}`);
    }
    
    const loader = new (LoaderClass as any)(filePath, options);
    return loader.load();
  }

  async loadDirectory(
    directoryPath: string,
    options?: {
      recursive?: boolean;
      excludePatterns?: string[];
      maxFiles?: number;
    }
  ): Promise<Document[]> {
    const loader = new DirectoryLoader(
      directoryPath,
      Object.fromEntries(this.loaders.entries()),
      options
    );
    return loader.load();
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.loaders.keys());
  }
}

// Singleton instance
export const documentLoaderManager = new DocumentLoaderManager();

// Utility functions
export async function loadTextFile(filePath: string): Promise<Document[]> {
  const loader = new TextLoader(filePath);
  return loader.load();
}

export async function loadJsonFile(filePath: string): Promise<Document[]> {
  const loader = new JsonLoader(filePath);
  return loader.load();
}

export async function loadCsvFile(
  filePath: string,
  options?: {
    delimiter?: string;
    hasHeader?: boolean;
    contentColumn?: string;
    metadataColumns?: string[];
  }
): Promise<Document[]> {
  const loader = new CsvLoader(filePath, options);
  return loader.load();
}

export async function loadWebPage(url: string): Promise<Document[]> {
  const loader = new HtmlLoader(url, { includeMetadata: true });
  return loader.load();
}

export async function loadMarkdownFile(filePath: string): Promise<Document[]> {
  const loader = new MarkdownLoader(filePath, { includeFrontmatter: true });
  return loader.load();
}

