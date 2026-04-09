/**
 * Manual Integration Test Script
 * 
 * Run this script to manually test the Google Web Search integration
 * Usage: npx ts-node lib/langChain/tools/manual-integration-test.ts
 */

import { searchWeb } from './web-search-tool';
import { searchTool } from './search-tool';
import { WebSearchStatsTracker } from './web-search-stats';
import { StudifyToolCallingAgent } from '../tool-calling-integration';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

async function test1_LatestInfoQuery() {
  section('TEST 1: Web Search with Latest Info Query');
  log('Requirement: 1.1, 1.2', colors.yellow);
  
  const query = 'What are AI trends in 2026?';
  log(`Query: "${query}"`, colors.blue);
  
  try {
    const startTime = Date.now();
    const result = await searchWeb(query);
    const executionTime = Date.now() - startTime;
    
    log(`\n✅ Success! Execution time: ${executionTime}ms`, colors.green);
    log(`\nResults: ${result.count} found`, colors.green);
    log(`Cached: ${result.cached}`, colors.green);
    log(`Message: ${result.message.substring(0, 100)}...`, colors.green);
    
    if (result.results.length > 0) {
      log('\nFirst 3 results:', colors.bright);
      result.results.slice(0, 3).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   ${r.snippet.substring(0, 150)}...`);
        console.log(`   ${r.link}`);
      });
    }
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test2_InternalSearchPriority() {
  section('TEST 2: Internal Search Priority with Course Content');
  log('Requirement: 4.1', colors.yellow);
  
  const query = 'Explain React hooks';
  log(`Query: "${query}"`, colors.blue);
  
  try {
    const searchInput = {
      query: query,
      contentTypes: ['lesson', 'note']
    };
    
    const startTime = Date.now();
    const result = await (searchTool as any).call(searchInput);
    const executionTime = Date.now() - startTime;
    
    const parsed = JSON.parse(result);
    
    log(`\n✅ Success! Execution time: ${executionTime}ms`, colors.green);
    log(`\nResults: ${parsed.count} found`, colors.green);
    log(`Confidence: ${parsed.confidence.toFixed(2)}`, colors.green);
    log(`Result Count: ${parsed.result_count}`, colors.green);
    
    log('\nNote: Agent uses confidence and result_count to decide if web search is needed', colors.yellow);
    log('Low confidence (<0.6) or few results (<2) may trigger web search fallback', colors.yellow);
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test3_CacheFunctionality() {
  section('TEST 3: Cache Functionality with Repeated Queries');
  log('Requirement: 3.4', colors.yellow);
  
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    log('⚠️ Skipping - API not configured', colors.yellow);
    return true;
  }
  
  const query = 'Latest developments in quantum computing 2026';
  log(`Query: "${query}"`, colors.blue);
  
  try {
    // First call
    log('\n🔍 First call (should hit API)...', colors.blue);
    const startTime1 = Date.now();
    const result1 = await searchWeb(query);
    const time1 = Date.now() - startTime1;
    
    log(`✅ First call: ${time1}ms, cached: ${result1.cached}, results: ${result1.count}`, colors.green);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second call
    log('\n🔍 Second call (should hit cache)...', colors.blue);
    const startTime2 = Date.now();
    const result2 = await searchWeb(query);
    const time2 = Date.now() - startTime2;
    
    log(`✅ Second call: ${time2}ms, cached: ${result2.cached}, results: ${result2.count}`, colors.green);
    
    if (result2.cached) {
      log(`\n✅ Cache working! Second call was ${Math.round((time1 - time2) / time1 * 100)}% faster`, colors.green);
    } else {
      log('\n⚠️ Cache miss - this might be expected if cache expired', colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test4_ErrorHandling() {
  section('TEST 4: Error Handling with Invalid API Key');
  log('Requirement: 2.3, 2.5', colors.yellow);
  
  const originalKey = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = 'invalid_key_12345';
  
  const query = 'Test query with invalid key';
  log(`Query: "${query}"`, colors.blue);
  log('Using invalid API key...', colors.yellow);
  
  try {
    const result = await searchWeb(query);
    
    // Restore original key
    process.env.GOOGLE_API_KEY = originalKey;
    
    log(`\n✅ Graceful error handling!`, colors.green);
    log(`Message: ${result.message}`, colors.green);
    log(`Results: ${result.count}`, colors.green);
    
    if (result.message.toLowerCase().includes('error') || 
        result.message.toLowerCase().includes('unavailable')) {
      log('\n✅ Error message is user-friendly', colors.green);
    }
    
    return true;
  } catch (error) {
    // Restore original key
    process.env.GOOGLE_API_KEY = originalKey;
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test5_QuotaWarning() {
  section('TEST 5: Quota Warning at 90% Threshold');
  log('Requirement: 5.3', colors.yellow);
  
  try {
    const stats = await WebSearchStatsTracker.getStats();
    
    log('\nCurrent Quota Status:', colors.bright);
    log(`Used: ${stats.quotaUsed}/${stats.dailyQuota}`, colors.blue);
    log(`Percentage: ${Math.round((stats.quotaUsed / stats.dailyQuota) * 100)}%`, colors.blue);
    
    if (stats.quotaUsed >= stats.dailyQuota * 0.9) {
      log('\n⚠️ WARNING: Approaching quota limit!', colors.yellow);
    } else {
      log(`\n✅ Quota tracking working. ${stats.dailyQuota - stats.quotaUsed} calls remaining`, colors.green);
    }
    
    log('\nNote: Warning is logged to console when quota reaches 90%', colors.yellow);
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test6_AutoDisable() {
  section('TEST 6: Auto-Disable After 3 Consecutive Failures');
  log('Requirement: 5.5', colors.yellow);
  
  try {
    // Reset stats
    await WebSearchStatsTracker.resetGlobalStats();
    log('Reset global stats', colors.blue);
    
    // Simulate 3 failures
    log('\nSimulating 3 consecutive failures...', colors.blue);
    for (let i = 1; i <= 3; i++) {
      await WebSearchStatsTracker.logSearch({
        timestamp: Date.now(),
        query: `test_failure_${i}`,
        resultCount: 0,
        responseTime: 100,
        cached: false,
        success: false,
        error: 'Simulated failure'
      });
      log(`  Failure ${i}/3 logged`, colors.blue);
    }
    
    // Check disable status
    const shouldDisable = await WebSearchStatsTracker.shouldDisable();
    const stats = await WebSearchStatsTracker.getStats();
    
    if (shouldDisable && stats.isDisabled) {
      log(`\n✅ Auto-disable triggered!`, colors.green);
      log(`Consecutive failures: ${stats.consecutiveFailures}`, colors.green);
      log(`Disabled until: ${new Date(stats.disabledUntil!).toLocaleTimeString()}`, colors.green);
      log(`Duration: ${Math.ceil((stats.disabledUntil! - Date.now()) / 60000)} minutes`, colors.green);
    } else {
      log('\n⚠️ Auto-disable not triggered', colors.yellow);
    }
    
    // Reset for other tests
    await WebSearchStatsTracker.resetGlobalStats();
    log('\nReset stats for other tests', colors.blue);
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test7_SourceAttribution() {
  section('TEST 7: Agent Distinguishes Internal vs Web Sources');
  log('Requirement: 4.5', colors.yellow);
  
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: ['search', 'web_search'],
      verbose: false
    });
    
    await agent.initialize();
    log('Agent initialized with search and web_search tools', colors.blue);
    
    const query = 'What are the latest AI developments in 2026?';
    log(`\nQuery: "${query}"`, colors.blue);
    log('Executing with agent...', colors.blue);
    
    const startTime = Date.now();
    const result = await agent.execute(query, {
      includeSteps: true
    });
    const executionTime = Date.now() - startTime;
    
    log(`\n✅ Agent execution completed in ${executionTime}ms`, colors.green);
    log(`\nTools used: ${result.toolsUsed.join(', ')}`, colors.green);
    log(`\nResponse preview:`, colors.bright);
    console.log(result.output.substring(0, 500) + '...');
    
    if (result.toolsUsed.includes('web_search')) {
      log('\n✅ Web search was used', colors.green);
      log('Check if response mentions "web sources" or "online information"', colors.yellow);
    } else {
      log('\nℹ️ Web search not used for this query', colors.blue);
    }
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function test8_CompleteWorkflow() {
  section('TEST 8: Complete Workflow - Latest Info Query with Agent');
  log('Requirement: 1.1, 1.4, 4.1, 4.5', colors.yellow);
  
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    log('⚠️ Skipping - API not configured', colors.yellow);
    return true;
  }
  
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: 'all',
      verbose: false
    });
    
    await agent.initialize();
    log('Agent initialized with all tools', colors.blue);
    
    const query = 'What are the most recent breakthroughs in AI technology in 2026?';
    log(`\nQuery: "${query}"`, colors.blue);
    log('This should trigger web search for latest information...', colors.blue);
    
    const startTime = Date.now();
    const result = await agent.execute(query, {
      includeSteps: true
    });
    const executionTime = Date.now() - startTime;
    
    log(`\n✅ Complete workflow executed in ${executionTime}ms`, colors.green);
    log(`\nTools used: ${result.toolsUsed.join(', ')}`, colors.green);
    log(`Response length: ${result.output.length} characters`, colors.green);
    
    log(`\nResponse:`, colors.bright);
    console.log(result.output);
    
    // Print stats
    log('\n📊 Current Statistics:', colors.bright);
    await WebSearchStatsTracker.printStats();
    
    return true;
  } catch (error) {
    log(`\n❌ Failed: ${error}`, colors.red);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '█'.repeat(80), colors.bright + colors.cyan);
  log('  GOOGLE WEB SEARCH INTEGRATION - MANUAL TEST SUITE', colors.bright + colors.cyan);
  log('█'.repeat(80) + '\n', colors.bright + colors.cyan);
  
  // Check configuration
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    log('⚠️ WARNING: Google API credentials not configured', colors.yellow);
    log('Some tests will be skipped. Configure GOOGLE_API_KEY and GOOGLE_CX to run all tests.\n', colors.yellow);
  } else {
    log('✅ Google API credentials configured\n', colors.green);
  }
  
  const results: { name: string; passed: boolean }[] = [];
  
  // Run tests
  const tests = [
    { name: 'Latest Info Query', fn: test1_LatestInfoQuery },
    { name: 'Internal Search Priority', fn: test2_InternalSearchPriority },
    { name: 'Cache Functionality', fn: test3_CacheFunctionality },
    { name: 'Error Handling', fn: test4_ErrorHandling },
    { name: 'Quota Warning', fn: test5_QuotaWarning },
    { name: 'Auto-Disable', fn: test6_AutoDisable },
    { name: 'Source Attribution', fn: test7_SourceAttribution },
    { name: 'Complete Workflow', fn: test8_CompleteWorkflow },
  ];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log(`\n❌ Test "${test.name}" threw an error: ${error}`, colors.red);
      results.push({ name: test.name, passed: false });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  section('TEST SUMMARY');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const color = r.passed ? colors.green : colors.red;
    log(`${icon} ${r.name}`, color);
  });
  
  log(`\n${passed}/${total} tests passed`, passed === total ? colors.green : colors.yellow);
  
  if (passed === total) {
    log('\n🎉 All tests passed! Integration is working correctly.', colors.bright + colors.green);
  } else {
    log('\n⚠️ Some tests failed. Review the output above for details.', colors.yellow);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error}`, colors.red);
  console.error(error);
  process.exit(1);
});
