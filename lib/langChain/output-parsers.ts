import { z } from 'zod';

// Base output parser interface
export interface OutputParser<T = any> {
  name: string;
  description: string;
  parse(text: string): T;
  getFormatInstructions(): string;
  validateOutput?(output: any): boolean;
}

// JSON Output Parser
export class JsonOutputParser<T = any> implements OutputParser<T> {
  name = 'json';
  description = 'Parses JSON output from LLM responses';

  constructor(
    private schema?: z.ZodSchema<T>,
    private fallbackValue?: T
  ) {}

  parse(text: string): T {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text.trim();
      
      const parsed = JSON.parse(jsonText);
      
      // Validate against schema if provided
      if (this.schema) {
        const result = this.schema.safeParse(parsed);
        if (result.success) {
          return result.data;
        } else {
          console.warn('JSON validation failed:', result.error);
          if (this.fallbackValue !== undefined) {
            return this.fallbackValue;
          }
          throw new Error(`JSON validation failed: ${result.error.message}`);
        }
      }
      
      return parsed;
    } catch (error) {
      if (this.fallbackValue !== undefined) {
        return this.fallbackValue;
      }
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getFormatInstructions(): string {
    return `
Please format your response as valid JSON. You can wrap it in markdown code blocks:
\`\`\`json
{
  // Your JSON response here
}
\`\`\`

${this.schema ? `The JSON should match this schema: ${JSON.stringify(this.schema, null, 2)}` : ''}
`;
  }

  validateOutput(output: any): boolean {
    if (!this.schema) return true;
    return this.schema.safeParse(output).success;
  }
}

// XML Output Parser
export class XmlOutputParser implements OutputParser<Record<string, any>> {
  name = 'xml';
  description = 'Parses XML output from LLM responses';

  constructor(private rootElement?: string) {}

  parse(text: string): Record<string, any> {
    try {
      // Extract XML from markdown code blocks if present
      const xmlMatch = text.match(/```(?:xml)?\s*([\s\S]*?)\s*```/);
      const xmlText = xmlMatch ? xmlMatch[1] : text.trim();
      
      // Simple XML parser (for more complex needs, consider using a proper XML parser)
      const result: Record<string, any> = {};
      
      // Extract root element if specified
      if (this.rootElement) {
        const rootMatch = xmlText.match(new RegExp(`<${this.rootElement}[^>]*>([\\s\\S]*?)<\\/${this.rootElement}>`));
        if (rootMatch) {
          return this.parseXmlContent(rootMatch[1]);
        }
      }
      
      return this.parseXmlContent(xmlText);
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseXmlContent(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Simple regex-based XML parsing (basic implementation)
    const elementRegex = /<([^/>]+)>([^<]*)<\/\1>/g;
    let match;
    
    while ((match = elementRegex.exec(content)) !== null) {
      const [, tagName, value] = match;
      result[tagName.trim()] = value.trim();
    }
    
    return result;
  }

  getFormatInstructions(): string {
    return `
Please format your response as valid XML${this.rootElement ? ` with root element <${this.rootElement}>` : ''}:
\`\`\`xml
${this.rootElement ? `<${this.rootElement}>` : '<root>'}
  <element1>value1</element1>
  <element2>value2</element2>
${this.rootElement ? `</${this.rootElement}>` : '</root>'}
\`\`\`
`;
  }

  validateOutput(output: any): boolean {
    return typeof output === 'object' && output !== null;
  }
}

// List Output Parser
export class ListOutputParser implements OutputParser<string[]> {
  name = 'list';
  description = 'Parses list output from LLM responses';

  constructor(
    private separator: string = '\n',
    private numbered: boolean = false
  ) {}

  parse(text: string): string[] {
    const lines = text.split(this.separator).map(line => line.trim()).filter(line => line.length > 0);
    
    if (this.numbered) {
      return lines.map(line => {
        // Remove numbering patterns like "1.", "1)", "- ", "• "
        return line.replace(/^\d+[\.\)]\s*|^[-•]\s*/, '').trim();
      }).filter(line => line.length > 0);
    }
    
    return lines;
  }

  getFormatInstructions(): string {
    if (this.numbered) {
      return `
Please format your response as a numbered list:
1. First item
2. Second item
3. Third item
`;
    } else {
      return `
Please format your response as a list, one item per line:
- First item
- Second item
- Third item
`;
    }
  }

  validateOutput(output: any): boolean {
    return Array.isArray(output) && output.every(item => typeof item === 'string');
  }
}

// Comma Separated Values Parser
export class CsvOutputParser implements OutputParser<string[][]> {
  name = 'csv';
  description = 'Parses CSV output from LLM responses';

  constructor(
    private delimiter: string = ',',
    private hasHeader: boolean = true
  ) {}

  parse(text: string): string[][] {
    // Extract CSV from markdown code blocks if present
    const csvMatch = text.match(/```(?:csv)?\s*([\s\S]*?)\s*```/);
    const csvText = csvMatch ? csvMatch[1] : text.trim();
    
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return lines.map(line => {
      // Simple CSV parsing (for complex CSV, consider using a proper CSV parser)
      return line.split(this.delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
  }

  getFormatInstructions(): string {
    return `
Please format your response as CSV${this.hasHeader ? ' with headers' : ''}:
\`\`\`csv
${this.hasHeader ? `Header1${this.delimiter}Header2${this.delimiter}Header3\n` : ''}Value1${this.delimiter}Value2${this.delimiter}Value3
Value4${this.delimiter}Value5${this.delimiter}Value6
\`\`\`
`;
  }

  validateOutput(output: any): boolean {
    return Array.isArray(output) && output.every(row => Array.isArray(row) && row.every(cell => typeof cell === 'string'));
  }
}

// Structured Output Parser using Zod schemas
export class StructuredOutputParser<T> implements OutputParser<T> {
  name = 'structured';
  description = 'Parses structured output using Zod schema validation';

  constructor(
    private schema: z.ZodSchema<T>,
    private formatHint?: string
  ) {}

  parse(text: string): T {
    try {
      // Try to extract JSON first
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
      let parsedData: any;
      
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to parse the entire text as JSON
        parsedData = JSON.parse(text.trim());
      }
      
      // Validate against schema
      const result = this.schema.safeParse(parsedData);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Schema validation failed: ${result.error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse structured output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getFormatInstructions(): string {
    // Generate format instructions from schema
    const schemaDescription = this.generateSchemaDescription(this.schema);
    
    return `
Please format your response as JSON matching this structure:
\`\`\`json
${schemaDescription}
\`\`\`

${this.formatHint || 'Make sure all required fields are included and match the expected types.'}
`;
  }

  private generateSchemaDescription(schema: z.ZodSchema<any>): string {
    try {
      // This is a simplified schema description generator
      // For a full implementation, you might want to use zod-to-json-schema
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const example: Record<string, any> = {};
        
        for (const [key, fieldSchema] of Object.entries(shape)) {
          example[key] = this.getExampleValue(fieldSchema as z.ZodSchema);
        }
        
        return JSON.stringify(example, null, 2);
      }
      
      return '{\n  "data": "Your structured data here"\n}';
    } catch (error) {
      return '{\n  "data": "Your structured data here"\n}';
    }
  }

  private getExampleValue(schema: z.ZodSchema): any {
    if (schema instanceof z.ZodString) return "example string";
    if (schema instanceof z.ZodNumber) return 123;
    if (schema instanceof z.ZodBoolean) return true;
    if (schema instanceof z.ZodArray) return ["example", "array"];
    if (schema instanceof z.ZodObject) return { "example": "object" };
    if (schema instanceof z.ZodOptional) return this.getExampleValue(schema._def.innerType);
    return "example value";
  }

  validateOutput(output: any): boolean {
    return this.schema.safeParse(output).success;
  }
}

// Boolean Output Parser
export class BooleanOutputParser implements OutputParser<boolean> {
  name = 'boolean';
  description = 'Parses boolean output from LLM responses';

  parse(text: string): boolean {
    const cleaned = text.toLowerCase().trim();
    
    // Check for explicit boolean values
    if (cleaned === 'true' || cleaned === 'yes' || cleaned === '1') return true;
    if (cleaned === 'false' || cleaned === 'no' || cleaned === '0') return false;
    
    // Check for boolean in JSON format
    try {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\]|true|false)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (typeof parsed === 'boolean') return parsed;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    
    // Heuristic: check if text contains positive/negative indicators
    const positiveWords = /\b(yes|true|correct|right|valid|success|positive|good|accept)\b/i;
    const negativeWords = /\b(no|false|incorrect|wrong|invalid|fail|negative|bad|reject)\b/i;
    
    if (positiveWords.test(cleaned) && !negativeWords.test(cleaned)) return true;
    if (negativeWords.test(cleaned) && !positiveWords.test(cleaned)) return false;
    
    throw new Error('Could not determine boolean value from text');
  }

  getFormatInstructions(): string {
    return `
Please respond with a clear boolean value:
- "true" or "false"
- "yes" or "no"
- Or in JSON format: \`true\` or \`false\`
`;
  }

  validateOutput(output: any): boolean {
    return typeof output === 'boolean';
  }
}

// Datetime Output Parser
export class DateTimeOutputParser implements OutputParser<Date> {
  name = 'datetime';
  description = 'Parses datetime output from LLM responses';

  parse(text: string): Date {
    try {
      // Extract datetime from various formats
      const isoMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?/);
      if (isoMatch) {
        return new Date(isoMatch[0]);
      }
      
      // Try parsing the trimmed text directly
      const date = new Date(text.trim());
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      throw new Error('Invalid date format');
    } catch (error) {
      throw new Error(`Failed to parse datetime: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getFormatInstructions(): string {
    return `
Please format your response as a valid datetime in ISO format:
- "2024-01-15T10:30:00Z"
- "2024-01-15T10:30:00.000Z"
- Or any standard datetime format
`;
  }

  validateOutput(output: any): boolean {
    return output instanceof Date && !isNaN(output.getTime());
  }
}

// Parser Manager for handling multiple parsers
export class OutputParserManager {
  private parsers = new Map<string, OutputParser>();

  constructor() {
    // Register default parsers
    this.registerParser(new JsonOutputParser());
    this.registerParser(new XmlOutputParser());
    this.registerParser(new ListOutputParser());
    this.registerParser(new CsvOutputParser());
    this.registerParser(new BooleanOutputParser());
    this.registerParser(new DateTimeOutputParser());
  }

  registerParser(parser: OutputParser): void {
    this.parsers.set(parser.name, parser);
  }

  getParser(name: string): OutputParser | undefined {
    return this.parsers.get(name);
  }

  parse<T = any>(text: string, parserName: string): T {
    const parser = this.getParser(parserName);
    if (!parser) {
      throw new Error(`Parser '${parserName}' not found`);
    }
    return parser.parse(text);
  }

  tryParse<T = any>(text: string, parserName: string, fallback?: T): T | undefined {
    try {
      return this.parse<T>(text, parserName);
    } catch (error) {
      console.warn(`Failed to parse with ${parserName}:`, error);
      return fallback;
    }
  }

  getFormatInstructions(parserName: string): string {
    const parser = this.getParser(parserName);
    return parser?.getFormatInstructions() || '';
  }

  listParsers(): Array<{ name: string; description: string }> {
    return Array.from(this.parsers.values()).map(parser => ({
      name: parser.name,
      description: parser.description
    }));
  }
}

// Singleton instance
export const outputParserManager = new OutputParserManager();

// Utility functions
export function parseJson<T = any>(text: string, schema?: z.ZodSchema<T>): T {
  const parser = new JsonOutputParser(schema);
  return parser.parse(text);
}

export function parseList(text: string, numbered: boolean = false): string[] {
  const parser = new ListOutputParser('\n', numbered);
  return parser.parse(text);
}

export function parseBoolean(text: string): boolean {
  const parser = new BooleanOutputParser();
  return parser.parse(text);
}

export function parseStructured<T>(text: string, schema: z.ZodSchema<T>): T {
  const parser = new StructuredOutputParser(schema);
  return parser.parse(text);
}

// Common Zod schemas for structured parsing
export const CommonSchemas: Record<string, z.ZodSchema<any>> = {
  // Course analysis schema
  courseAnalysis: z.object({
    mainTopics: z.array(z.string()).min(3).max(10),
    keysConcepts: z.array(z.string()),
    learningObjectives: z.array(z.string()),
    difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedDuration: z.string(),
    prerequisites: z.array(z.string()).optional()
  }),

  // Quiz generation schema
  quizQuestion: z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]),
    explanation: z.string(),
    difficulty: z.number().min(1).max(5),
    learningObjective: z.string()
  }),

  quiz: z.object({
    questions: z.array(z.lazy(() => CommonSchemas.quizQuestion)),
    metadata: z.object({
      totalQuestions: z.number(),
      estimatedTime: z.string(),
      topics: z.array(z.string())
    })
  }),

  // Content recommendation schema
  contentRecommendation: z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['course', 'lesson', 'quiz', 'article']),
    description: z.string(),
    relevanceScore: z.number().min(0).max(1),
    reasoning: z.string(),
    prerequisites: z.array(z.string()).optional(),
    tags: z.array(z.string())
  }),

  recommendations: z.object({
    items: z.array(z.lazy(() => CommonSchemas.contentRecommendation)),
    learningPath: z.array(z.string()),
    metadata: z.object({
      totalRecommendations: z.number(),
      avgRelevanceScore: z.number(),
      categories: z.array(z.string())
    })
  })
};

// Note: Classes are already exported above with their declarations
