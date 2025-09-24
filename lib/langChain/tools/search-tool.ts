// Search Tool - 语义搜索工具
import { DynamicTool } from "@langchain/core/tools";
import { smartSearch } from '../langchain-integration';

export const searchTool = new DynamicTool({
  name: "search",
  description: `Search for relevant content in the knowledge base. Use this when you need to find information about courses, lessons, posts, or any educational content. 
  Input should be a search query string.`,
  func: async (query: string) => {
    try {
      const result = await smartSearch(query, {
        maxResults: 5,
        enhanceResults: true
      });
      
      const formattedResults = result.results.map((doc, index) => 
        `[${index + 1}] ${doc.metadata.contentType}: ${doc.pageContent.substring(0, 200)}...`
      ).join('\n\n');
      
      let response = `Found ${result.results.length} relevant results:\n\n${formattedResults}`;
      
      if (result.enhancedSummary) {
        response += `\n\nSummary: ${result.enhancedSummary}`;
      }
      
      if (result.relatedQueries && result.relatedQueries.length > 0) {
        response += `\n\nRelated queries: ${result.relatedQueries.join(', ')}`;
      }
      
      return response;
    } catch (error) {
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
