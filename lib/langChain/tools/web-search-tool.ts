// Web Search Tool - Google Custom Search API integration
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import redis from '@/utils/redis/redis';
import crypto from 'crypto';

// Interface definitions
interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
}

interface WebSearchResponse {
  message: string;
  results: WebSearchResult[];
  count: number;
  cached: boolean;
}

interface GoogleSearchAPIResponse {
  items?: Array<{
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

// Configuration validation
function validateConfig(): { valid: boolean; error?: string } {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'GOOGLE_API_KEY not configured' };
  }
  
  if (!cx || cx.trim() === '') {
    return { valid: false, error: 'GOOGLE_CX not configured' };
  }
  
  return { valid: true };
}

// Generate cache key from query
function getCacheKey(query: string): string {
  const hash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  return `web_search:${hash}`;
}

// Filter and prioritize results
function filterResults(items: any[]): WebSearchResult[] {
  if (!items || items.length === 0) return [];
  
  // Score each result
  const scoredResults = items.map(item => {
    let score = 0;
    const link = item.link.toLowerCase();
    const displayLink = item.displayLink.toLowerCase();
    
    // Prioritize educational domains
    if (displayLink.includes('.edu')) score += 10;
    if (displayLink.includes('wikipedia.org')) score += 8;
    if (displayLink.includes('github.com')) score += 7;
    if (displayLink.includes('stackoverflow.com')) score += 6;
    if (displayLink.includes('medium.com')) score += 5;
    if (displayLink.includes('dev.to')) score += 5;
    
    // Filter inappropriate content (basic filtering)
    const inappropriateKeywords = ['adult', 'casino', 'gambling', 'porn'];
    const hasInappropriate = inappropriateKeywords.some(keyword => 
      link.includes(keyword) || displayLink.includes(keyword)
    );
    
    if (hasInappropriate) score = -1000; // Exclude these results
    
    return { ...item, score };
  });
  
  // Filter out inappropriate content and sort by score
  return scoredResults
    .filter(item => item.score > -1000)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Limit to 5 results
    .map(({ title, snippet, link, displayLink }) => ({
      title,
      snippet,
      link,
      displayLink
    }));
}

// Call Google Custom Search API with timeout
async function callGoogleAPI(
  query: string,
  maxResults: number = 5
): Promise<GoogleSearchAPIResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  // Enhance query for educational content
  const enhancedQuery = `${query} educational tutorial`;
  
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.append('key', apiKey!);
  url.searchParams.append('cx', cx!);
  url.searchParams.append('q', enhancedQuery);
  url.searchParams.append('num', Math.min(maxResults, 10).toString());
  url.searchParams.append('safe', 'active'); // Enable SafeSearch
  
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000);
  });
  
  // Race between fetch and timeout
  const response = await Promise.race([
    fetch(url.toString()),
    timeoutPromise
  ]);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }
  
  return await response.json();
}

// Main search function with caching
async function performWebSearch(query: string): Promise<WebSearchResponse> {
  const startTime = Date.now();
  
  // Validate configuration
  const configCheck = validateConfig();
  if (!configCheck.valid) {
    console.warn(`⚠️ Web Search Tool disabled: ${configCheck.error}`);
    return {
      message: 'Web search is currently unavailable. Please configure GOOGLE_API_KEY and GOOGLE_CX.',
      results: [],
      count: 0,
      cached: false
    };
  }
  
  // Check cache first
  const cacheKey = getCacheKey(query);
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Web search cache hit: "${query}" (${Date.now() - startTime}ms)`);
      const cached = cachedData as WebSearchResponse;
      return { ...cached, cached: true };
    }
  } catch (cacheError) {
    console.warn('⚠️ Cache read failed:', cacheError);
    // Continue without cache
  }
  
  console.log(`🔍 Web search: "${query}"`);
  
  try {
    // Call Google API
    const apiResponse = await callGoogleAPI(query, 10); // Request more for filtering
    
    if (apiResponse.error) {
      const errorCode = apiResponse.error.code;
      const errorMessage = apiResponse.error.message;
      
      // Handle specific error cases
      if (errorCode === 403 && errorMessage.includes('quota')) {
        console.error('❌ Google API quota exceeded');
        return {
          message: 'Web search quota exceeded. Please try again later.',
          results: [],
          count: 0,
          cached: false
        };
      }
      
      if (errorCode === 400 && errorMessage.includes('API key')) {
        console.error('❌ Invalid Google API key');
        return {
          message: 'Web search configuration error. Please contact support.',
          results: [],
          count: 0,
          cached: false
        };
      }
      
      throw new Error(errorMessage);
    }
    
    // Filter and prioritize results
    const filteredResults = filterResults(apiResponse.items || []);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Web search completed: ${filteredResults.length} results (${responseTime}ms)`);
    
    const response: WebSearchResponse = {
      message: filteredResults.length > 0
        ? `Found ${filteredResults.length} relevant web results`
        : 'No relevant web results found. Try rephrasing your query.',
      results: filteredResults,
      count: filteredResults.length,
      cached: false
    };
    
    // Cache the results (24 hours TTL)
    if (filteredResults.length > 0) {
      try {
        await redis.set(cacheKey, response, { ex: 86400 }); // 24 hours
        console.log(`💾 Cached web search results for: "${query}"`);
      } catch (cacheError) {
        console.warn('⚠️ Cache write failed:', cacheError);
        // Continue without caching
      }
    }
    
    return response;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error(`❌ Web search timeout after ${responseTime}ms`);
        return {
          message: 'Web search is taking longer than expected. Please try again.',
          results: [],
          count: 0,
          cached: false
        };
      }
      
      if (error.message.includes('fetch')) {
        console.error('❌ Network error during web search:', error.message);
        return {
          message: 'Network error occurred. Please check your connection and try again.',
          results: [],
          count: 0,
          cached: false
        };
      }
      
      console.error('❌ Web search error:', error.message);
      return {
        message: `Web search failed: ${error.message}`,
        results: [],
        count: 0,
        cached: false
      };
    }
    
    console.error('❌ Unknown web search error:', error);
    return {
      message: 'An unexpected error occurred during web search.',
      results: [],
      count: 0,
      cached: false
    };
  }
}

// Define schema for structured input
const WebSearchSchema = z.object({
  query: z.string().describe("The search query for web search")
});

// Export the web search tool
export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description: `Search the web for latest information, news, trends, or external knowledge.
  Use this tool when:
  - User asks about current events or latest information (2024+)
  - User explicitly requests web search
  - Internal search returns insufficient results
  DO NOT use for course-specific content - use the 'search' tool instead.`,
  schema: WebSearchSchema,
  func: async (input) => {
    try {
      const { query } = input;
      const response = await performWebSearch(query);
      
      // Return JSON string format as per requirements
      return JSON.stringify(response);
      
    } catch (error) {
      console.error('Web search tool error:', error);
      return JSON.stringify({
        message: `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [],
        count: 0,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Export the raw search function for direct access
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  return performWebSearch(query);
}
