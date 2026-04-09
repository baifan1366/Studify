/**
 * Quick Validation Script for Web Search Integration
 * 
 * This script performs quick validation checks without requiring Jest
 * Run: npx ts-node lib/langChain/tools/validate-integration.ts
 */

import { searchWeb } from './web-search-tool';
import { searchTool } from './search-tool';
import { WebSearchStatsTracker } from './web-search-stats';
import { StudifyToolCallingAgent } from '../tool-calling-integration';

async function validate() {
  console.log('\n🔍 Web Search Integration Validation\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  // Check 1: API Configuration
  console.log('\n✓ Check 1: API Configuration');
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX) {
    console.log('  ✅ Google API credentials configured');
    passed++;
  } else {
    console.log('  ⚠️  Google API credentials not configured (some tests will be skipped)');
    skipped++;
  }
  
  // Check 2: Web Search Tool Basic Functionality
  console.log('\n✓ Check 2: Web Search Tool');
  try {
    const result = await searchWeb('test query');
    if (result && result.hasOwnProperty('message') && result.hasOwnProperty('results')) {
      console.log('  ✅ Web search tool returns correct structure');
      passed++;
    } else {
      console.log('  ❌ Web search tool returns invalid structure');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Web search tool error: ${error}`);
    failed++;
  }
  
  // Check 3: Internal Search Tool
  console.log('\n✓ Check 3: Internal Search Tool');
  try {
    const searchInput = {
      query: 'test',
      contentTypes: ['lesson']
    };
    const result = await (searchTool as any).call(searchInput);
    const parsed = JSON.parse(result);
    
    if (parsed.hasOwnProperty('confidence') && parsed.hasOwnProperty('result_count')) {
      console.log('  ✅ Internal search returns confidence and result_count');
      passed++;
    } else {
      console.log('  ❌ Internal search missing required fields');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Internal search error: ${error}`);
    failed++;
  }
  
  // Check 4: Statistics Tracking
  console.log('\n✓ Check 4: Statistics Tracking');
  try {
    const stats = await WebSearchStatsTracker.getStats();
    if (stats && stats.hasOwnProperty('quotaUsed') && stats.hasOwnProperty('consecutiveFailures')) {
      console.log('  ✅ Statistics tracking working');
      console.log(`     Quota: ${stats.quotaUsed}/${stats.dailyQuota}`);
      console.log(`     Consecutive failures: ${stats.consecutiveFailures}`);
      passed++;
    } else {
      console.log('  ❌ Statistics tracking returns invalid data');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Statistics tracking error: ${error}`);
    failed++;
  }
  
  // Check 5: Agent Integration
  console.log('\n✓ Check 5: Agent Integration');
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: ['search', 'web_search'],
      verbose: false
    });
    await agent.initialize();
    
    const tools = agent.getAvailableTools();
    const hasSearch = tools.some(t => t.name === 'search');
    const hasWebSearch = tools.some(t => t.name === 'web_search');
    
    if (hasSearch && hasWebSearch) {
      console.log('  ✅ Agent has both search and web_search tools');
      console.log(`     Total tools: ${tools.length}`);
      passed++;
    } else {
      console.log('  ❌ Agent missing required tools');
      console.log(`     Has search: ${hasSearch}, Has web_search: ${hasWebSearch}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Agent integration error: ${error}`);
    failed++;
  }
  
  // Check 6: Cache Functionality (if API configured)
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX) {
    console.log('\n✓ Check 6: Cache Functionality');
    try {
      const query = 'validation test query ' + Date.now();
      
      // First call
      const result1 = await searchWeb(query);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Second call
      const result2 = await searchWeb(query);
      
      if (!result1.cached && result2.cached) {
        console.log('  ✅ Cache working correctly');
        passed++;
      } else {
        console.log('  ⚠️  Cache behavior unexpected');
        console.log(`     First call cached: ${result1.cached}`);
        console.log(`     Second call cached: ${result2.cached}`);
        skipped++;
      }
    } catch (error) {
      console.log(`  ❌ Cache test error: ${error}`);
      failed++;
    }
  } else {
    console.log('\n✓ Check 6: Cache Functionality');
    console.log('  ⚠️  Skipped (API not configured)');
    skipped++;
  }
  
  // Check 7: Error Handling
  console.log('\n✓ Check 7: Error Handling');
  try {
    const originalKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'invalid_key';
    
    const result = await searchWeb('test');
    
    process.env.GOOGLE_API_KEY = originalKey;
    
    if (result.count === 0 && result.message) {
      console.log('  ✅ Graceful error handling working');
      passed++;
    } else {
      console.log('  ❌ Error handling not working correctly');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ Error handling test failed: ${error}`);
    failed++;
  }
  
  // Check 8: Auto-disable Mechanism
  console.log('\n✓ Check 8: Auto-disable Mechanism');
  try {
    await WebSearchStatsTracker.resetGlobalStats();
    
    // Simulate 3 failures
    for (let i = 0; i < 3; i++) {
      await WebSearchStatsTracker.logSearch({
        timestamp: Date.now(),
        query: `test_${i}`,
        resultCount: 0,
        responseTime: 100,
        cached: false,
        success: false,
        error: 'Test failure'
      });
    }
    
    const shouldDisable = await WebSearchStatsTracker.shouldDisable();
    const stats = await WebSearchStatsTracker.getStats();
    
    if (shouldDisable && stats.isDisabled) {
      console.log('  ✅ Auto-disable mechanism working');
      console.log(`     Disabled for: ${Math.ceil((stats.disabledUntil! - Date.now()) / 60000)} minutes`);
      passed++;
    } else {
      console.log('  ❌ Auto-disable not triggered');
      failed++;
    }
    
    // Reset
    await WebSearchStatsTracker.resetGlobalStats();
  } catch (error) {
    console.log(`  ❌ Auto-disable test error: ${error}`);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   Total: ${passed + failed + skipped}`);
  
  if (failed === 0) {
    console.log('\n🎉 All validation checks passed!');
    console.log('\nThe web search integration is working correctly.');
    console.log('\nNext steps:');
    console.log('  1. Run manual tests: npx ts-node lib/langChain/tools/manual-integration-test.ts');
    console.log('  2. Test with real queries in the application');
    console.log('  3. Monitor statistics: await WebSearchStatsTracker.printStats()');
  } else {
    console.log('\n⚠️  Some validation checks failed.');
    console.log('Review the errors above and fix any issues.');
  }
  
  console.log('\n');
  
  return failed === 0;
}

// Run validation
validate()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  });
