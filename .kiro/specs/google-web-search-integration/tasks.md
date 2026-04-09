# Implementation Plan - Google Web Search Integration

- [x] 1. Create Web Search Tool implementation













  - Create new file `lib/langChain/tools/web-search-tool.ts` (no existing mock found in project)
  - Follow the exact pattern of `search-tool.ts`: use DynamicStructuredTool with Zod schema
  - Implement Google Custom Search JSON API integration (https://developers.google.com/custom-search/v1/overview)
  - Use fetch or axios for HTTP requests to `https://www.googleapis.com/customsearch/v1`
  - Add query enhancement: append "educational" or "tutorial" to improve result relevance
  - Implement result filtering: prioritize .edu domains, filter inappropriate content
  - Limit results to maximum 5 items per search
  - Add 5-second timeout using Promise.race pattern
  - Return JSON string format: `{message, results: [{title, snippet, link, displayLink}], count, cached}`
  - Implement error handling for: missing API key, invalid key, quota exceeded, network errors, timeout
  - _Requirements: 1.1, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Implement Redis caching layer





  - Create cache key generation using query hash (format: "web_search:{hash}")
  - Implement cache read with TTL check (24 hours)
  - Implement cache write with 24-hour expiration
  - Add cache hit/miss logging
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Create statistics tracking system





  - Create `lib/langChain/tools/web-search-stats.ts` for usage monitoring
  - Implement search logging (query, result count, response time, cached status)
  - Implement daily quota tracking and 90% warning threshold
  - Implement consecutive failure tracking (3 failures = 10 min disable)
  - Implement statistics retrieval and console output
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
- [x] 4. Update existing Search Tool









- [ ] 4. Update existing Search Tool

  - Modify `lib/langChain/tools/search-tool.ts` to return result count
  - Add confidence score calculation based on similarity scores
  - Update tool description to clarify it's for internal course content
  - Update return format to include confidence and result_count fields
  - _Requirements: 7.1, 7.2, 7.3_


- [x] 5. Register Web Search Tool in tool registry




  - Add web_search tool to `lib/langChain/tools/index.ts` AVAILABLE_TOOLS
  - Create new TOOL_CATEGORIES.WEB_SEARCH category
  - Add tool description emphasizing latest info and external knowledge use cases
  - Implement conditional registration (only if API keys configured)
  - _Requirements: 2.3, 2.5, 7.4_

- [x] 6. Update Tool Calling Agent system prompt





  - Modify DEFAULT_SYSTEM_PROMPT in `lib/langChain/tool-calling-integration.ts`
  - Add search strategy guidelines (prioritize internal search)
  - Add web search usage conditions (latest info, low confidence results)
  - Add instruction to limit web_search to 1 call per query
  - Add instruction to distinguish internal vs external sources in answers
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.5, 7.6, 7.7_

- [x] 7. Create environment configuration





  - Add GOOGLE_API_KEY and GOOGLE_CX to `.env.example`
  - Document Google Custom Search Engine setup steps in README or docs
  - Add optional configuration variables (max results, timeout, cache TTL, quota)
  - _Requirements: 2.1, 2.2_

- [x] 8. Integration and end-to-end validation






  - Test web search with latest info query (e.g., "What are AI trends in 2026?")
  - Test internal search priority with course content query
  - Test cache functionality with repeated queries
  - Test error handling with invalid API key
  - Test quota warning at 90% threshold
  - Test auto-disable after 3 consecutive failures
  - Verify Agent distinguishes internal vs web sources in responses
  - _Requirements: 1.1, 1.2, 1.4, 2.3, 2.5, 3.4, 4.1, 4.5, 5.3, 5.5_
