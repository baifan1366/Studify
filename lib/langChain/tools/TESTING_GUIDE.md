# Web Search Integration - Testing Guide

## Quick Start

### 1. Quick Validation (30 seconds)
```bash
npx ts-node lib/langChain/tools/validate-integration.ts
```
This runs 8 basic validation checks to ensure everything is working.

### 2. Manual Tests (5-10 minutes)
```bash
npx ts-node lib/langChain/tools/manual-integration-test.ts
```
This runs comprehensive manual tests with detailed colored output.

### 3. View Statistics
```bash
npx ts-node -e "import('./lib/langChain/tools/web-search-stats').then(m => m.WebSearchStatsTracker.printStats())"
```

## Prerequisites

### Required Environment Variables
```bash
# Google Custom Search API (required for web search)
GOOGLE_API_KEY=your_api_key_here
GOOGLE_CX=your_search_engine_id_here

# Redis (required for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# OpenRouter (required for agent)
OPENROUTER_API_KEY=your_openrouter_key
```

## Test Scenarios

### Test 1: Latest Info Query ✅
```typescript
// Tests web search with latest information
const result = await searchWeb('What are AI trends in 2026?');
// Expected: Returns 3-5 results with title, snippet, link
```

### Test 2: Internal Search Priority ✅
```typescript
// Tests that internal search is prioritized
const result = await searchTool.call({
  query: 'Explain React hooks',
  contentTypes: ['lesson']
});
// Expected: Returns confidence score and result_count
```

### Test 3: Cache Functionality ✅
```typescript
// Tests caching with repeated queries
const result1 = await searchWeb('quantum computing 2026');
const result2 = await searchWeb('quantum computing 2026');
// Expected: result1.cached = false, result2.cached = true
```

### Test 4: Error Handling ✅
```typescript
// Tests graceful error handling
process.env.GOOGLE_API_KEY = 'invalid';
const result = await searchWeb('test');
// Expected: Returns error message, count = 0
```

### Test 5: Quota Warning ✅
```typescript
// Tests quota tracking
const stats = await WebSearchStatsTracker.getStats();
// Expected: Shows quota usage, warns at 90%
```

### Test 6: Auto-disable ✅
```typescript
// Tests auto-disable after failures
// Simulate 3 failures
for (let i = 0; i < 3; i++) {
  await WebSearchStatsTracker.logSearch({
    success: false,
    error: 'Test failure'
  });
}
const shouldDisable = await WebSearchStatsTracker.shouldDisable();
// Expected: shouldDisable = true, disabled for 10 minutes
```

### Test 7: Source Attribution ✅
```typescript
// Tests agent distinguishes sources
const agent = new StudifyToolCallingAgent({
  enabledTools: ['search', 'web_search']
});
const result = await agent.execute('Latest AI developments 2026');
// Expected: Response mentions "web sources" or "online information"
```

### Test 8: Complete Workflow ✅
```typescript
// Tests end-to-end integration
const agent = new StudifyToolCallingAgent({ enabledTools: 'all' });
const result = await agent.execute('Recent AI breakthroughs in 2026?');
// Expected: Uses web_search, returns comprehensive answer
```

## Troubleshooting

### "API not configured" errors
- Check that `GOOGLE_API_KEY` and `GOOGLE_CX` are set in `.env`
- Verify the API key is valid
- Ensure Custom Search Engine is configured

### Cache not working
- Verify Redis connection
- Check `UPSTASH_REDIS_REST_URL` and token
- Ensure Redis is accessible

### Agent not using tools
- Check `OPENROUTER_API_KEY` is set
- Verify model supports function calling
- Review agent logs for tool execution

### Tests timing out
- Increase timeout in test configuration
- Check network connectivity
- Verify API endpoints are accessible

## Monitoring

### View Current Statistics
```bash
npx ts-node -e "import('./lib/langChain/tools/web-search-stats').then(m => m.WebSearchStatsTracker.printStats())"
```

### Reset Statistics
```bash
# Reset daily stats
npx ts-node -e "import('./lib/langChain/tools/web-search-stats').then(m => m.WebSearchStatsTracker.resetDailyStats())"

# Reset global stats (failures, disable status)
npx ts-node -e "import('./lib/langChain/tools/web-search-stats').then(m => m.WebSearchStatsTracker.resetGlobalStats())"
```

## Performance Benchmarks

| Operation | Target | Typical |
|-----------|--------|---------|
| Cache Hit | < 50ms | 20-30ms |
| API Call | < 2000ms | 500-1500ms |
| Timeout | 5000ms | 5000ms |
| Agent Execution | < 10s | 3-8s |

## Test Coverage

All requirements from the spec are covered:

- ✅ Req 1.1: Latest info queries
- ✅ Req 1.2: Result structure
- ✅ Req 1.4: Agent integration
- ✅ Req 1.5: Timeout handling
- ✅ Req 2.3: Graceful disable
- ✅ Req 2.5: Service continuity
- ✅ Req 3.4: Cache functionality
- ✅ Req 4.1: Internal search priority
- ✅ Req 4.5: Source attribution
- ✅ Req 5.3: Quota warnings
- ✅ Req 5.5: Auto-disable

## Next Steps

1. Run quick validation to ensure setup is correct
2. Run manual tests for comprehensive verification
3. Test with real queries in your application
4. Monitor statistics regularly
5. Set up alerts for quota and failures

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test output for specific errors
3. Check the implementation files for details
4. Review the design document for architecture

## Files

- `validate-integration.ts` - Quick validation script
- `manual-integration-test.ts` - Comprehensive manual tests
- `__tests__/web-search-integration.test.ts` - Automated Jest tests
- `__tests__/README.md` - Detailed test documentation
- `__tests__/INTEGRATION_TEST_RESULTS.md` - Test results summary
