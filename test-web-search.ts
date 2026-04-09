// Quick test script for Web Search Tool
import dotenv from 'dotenv';
import path from 'path';

// Load .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { webSearchTool, searchWeb } from './lib/langChain/tools/web-search-tool';

async function testWebSearch() {
  console.log('🧪 Testing Web Search Tool Integration\n');
  console.log('=' .repeat(60));
  
  // Test 1: Check environment variables
  console.log('\n📋 Test 1: Environment Configuration');
  console.log('-'.repeat(60));
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  console.log('Debug - All GOOGLE env vars:');
  Object.keys(process.env).filter(k => k.includes('GOOGLE')).forEach(k => {
    console.log(`  ${k}: ${process.env[k]?.substring(0, 20)}...`);
  });
  
  if (!apiKey || apiKey.trim() === '' || apiKey === '""') {
    console.error('❌ GOOGLE_API_KEY not configured or empty');
    console.error('   Current value:', apiKey);
    return;
  }
  if (!cx || cx.trim() === '' || cx === '""') {
    console.error('❌ GOOGLE_CX not configured or empty');
    console.error('   Current value:', cx);
    return;
  }
  
  console.log('✅ GOOGLE_API_KEY:', apiKey.substring(0, 10) + '...');
  console.log('✅ GOOGLE_CX:', cx);
  
  // Test 2: Direct function call
  console.log('\n📋 Test 2: Direct Function Call (searchWeb)');
  console.log('-'.repeat(60));
  
  try {
    const query = 'What is artificial intelligence?';
    console.log(`🔍 Query: "${query}"`);
    
    const result = await searchWeb(query);
    
    console.log('\n📊 Results:');
    console.log(`  - Count: ${result.count}`);
    console.log(`  - Cached: ${result.cached}`);
    console.log(`  - Message: ${result.message}`);
    
    if (result.results.length > 0) {
      console.log('\n📄 Top Results:');
      result.results.slice(0, 3).forEach((item, index) => {
        console.log(`\n  ${index + 1}. ${item.title}`);
        console.log(`     Link: ${item.link}`);
        console.log(`     Snippet: ${item.snippet.substring(0, 100)}...`);
      });
      console.log('\n✅ Test 2 PASSED');
    } else {
      console.log('⚠️ No results returned');
    }
    
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
  }
  
  // Test 3: Tool interface call
  console.log('\n📋 Test 3: Tool Interface Call (webSearchTool)');
  console.log('-'.repeat(60));
  
  try {
    const query = 'latest AI trends 2024';
    console.log(`🔍 Query: "${query}"`);
    
    const toolResult = await webSearchTool.func({ query });
    const parsed = JSON.parse(toolResult);
    
    console.log('\n📊 Tool Results:');
    console.log(`  - Count: ${parsed.count}`);
    console.log(`  - Cached: ${parsed.cached}`);
    console.log(`  - Message: ${parsed.message}`);
    
    if (parsed.results && parsed.results.length > 0) {
      console.log('\n📄 Top Results:');
      parsed.results.slice(0, 2).forEach((item: any, index: number) => {
        console.log(`\n  ${index + 1}. ${item.title}`);
        console.log(`     Link: ${item.link}`);
      });
      console.log('\n✅ Test 3 PASSED');
    } else {
      console.log('⚠️ No results returned');
    }
    
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
  }
  
  // Test 4: Check tool registration
  console.log('\n📋 Test 4: Tool Registration Check');
  console.log('-'.repeat(60));
  
  try {
    const { AVAILABLE_TOOLS, getToolByName } = await import('./lib/langChain/tools/index');
    
    const hasWebSearch = 'web_search' in AVAILABLE_TOOLS;
    console.log(`  - web_search in AVAILABLE_TOOLS: ${hasWebSearch ? '✅' : '❌'}`);
    
    const tool = getToolByName('web_search');
    console.log(`  - getToolByName('web_search'): ${tool ? '✅' : '❌'}`);
    
    if (tool) {
      console.log(`  - Tool name: ${tool.name}`);
      console.log(`  - Tool description: ${tool.description.substring(0, 80)}...`);
      console.log('\n✅ Test 4 PASSED');
    } else {
      console.log('\n❌ Test 4 FAILED: Tool not registered');
    }
    
  } catch (error) {
    console.error('❌ Test 4 FAILED:', error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Testing Complete!\n');
}

// Run tests
testWebSearch().catch(console.error);
