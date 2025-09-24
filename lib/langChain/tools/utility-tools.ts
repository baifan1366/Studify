// Utility Tools - 实用工具集合
import { DynamicTool } from "@langchain/core/tools";

// Math Calculator Tool
export const calculatorTool = new DynamicTool({
  name: "calculate",
  description: "Perform mathematical calculations safely. Supports basic arithmetic, trigonometry, and common math functions. Input should be a mathematical expression as string.",
  func: async (expression: string) => {
    try {
      // Simple safe calculation (in production, consider using a safer math parser)
      const sanitizedExpression = expression.replace(/[^0-9+\-*/.() ]/g, '');
      
      // Basic validation
      if (sanitizedExpression !== expression) {
        return `Invalid characters in expression. Only numbers and basic operators (+, -, *, /, (, )) are allowed.`;
      }
      
      const result = eval(sanitizedExpression);
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return `Calculation resulted in an invalid number: ${result}`;
      }
      
      return `${expression} = ${Number(result.toFixed(4))}`;
    } catch (error) {
      return `Calculation failed: ${error instanceof Error ? error.message : 'Invalid expression'}`;
    }
  }
});

// Date and Time Tool
export const dateTimeTool = new DynamicTool({
  name: "get_datetime",
  description: "Get current date and time, or format dates. Useful for timestamps, scheduling, and time-based queries. Input: 'current', 'timestamp', 'date', 'time', or a date string to format.",
  func: async (query: string) => {
    const now = new Date();
    
    if (query.toLowerCase().includes('timestamp') || query.toLowerCase() === 'current') {
      return `Current timestamp: ${now.toISOString()}`;
    } else if (query.toLowerCase().includes('date')) {
      return `Current date: ${now.toLocaleDateString()} (${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})`;
    } else if (query.toLowerCase().includes('time')) {
      return `Current time: ${now.toLocaleTimeString()}`;
    } else {
      // Try to parse as a date string
      try {
        const parsedDate = new Date(query);
        if (isNaN(parsedDate.getTime())) {
          return `Current date and time: ${now.toLocaleString()}`;
        } else {
          return `Formatted date: ${parsedDate.toLocaleString()}`;
        }
      } catch {
        return `Current date and time: ${now.toLocaleString()}`;
      }
    }
  }
});

// Text Processing Tool
export const textProcessingTool = new DynamicTool({
  name: "process_text",
  description: `Process text with various operations like word count, character count, summarization, or extraction.
  Input should be a JSON string: {"text": "text to process", "operation": "word_count|char_count|extract_keywords|extract_emails|to_uppercase|to_lowercase"}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { text, operation } = params;

      if (!text || !operation) {
        return 'Error: Both text and operation are required';
      }

      switch (operation) {
        case 'word_count':
          const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0);
          return `Word count: ${words.length} words`;

        case 'char_count':
          return `Character count: ${text.length} characters (${text.replace(/\s/g, '').length} without spaces)`;

        case 'extract_keywords':
          // Simple keyword extraction (remove common words)
          const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
          const words_extract = text.toLowerCase().match(/\b\w+\b/g) || [];
          const keywords = words_extract
            .filter((word: string) => word.length > 3 && !commonWords.has(word))
            .reduce((acc: Record<string, number>, word: string) => {
              acc[word] = (acc[word] || 0) + 1;
              return acc;
            }, {});
          
          const sortedKeywords = Object.entries(keywords)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10)
            .map(([word, count]) => `${word} (${count})`);
          
          return `Top keywords: ${sortedKeywords.join(', ')}`;

        case 'extract_emails':
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          const emails = text.match(emailRegex) || [];
          return `Extracted emails: ${emails.length > 0 ? emails.join(', ') : 'No emails found'}`;

        case 'to_uppercase':
          return text.toUpperCase();

        case 'to_lowercase':
          return text.toLowerCase();

        case 'extract_urls':
          const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
          const urls = text.match(urlRegex) || [];
          return `Extracted URLs: ${urls.length > 0 ? urls.join(', ') : 'No URLs found'}`;

        default:
          return `Error: Unknown operation "${operation}". Supported operations: word_count, char_count, extract_keywords, extract_emails, to_uppercase, to_lowercase, extract_urls`;
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with text and operation parameters.';
      }
      return `Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
