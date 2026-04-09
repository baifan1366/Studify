// Direct Google API test without Redis dependency
import dotenv from 'dotenv';
dotenv.config();

async function testGoogleAPI() {
  console.log('🧪 Direct Google Custom Search API Test\n');
  console.log('='.repeat(60));
  
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  
  console.log('\n📋 Configuration:');
  console.log(`  API Key: ${apiKey?.substring(0, 15)}...`);
  console.log(`  CX: ${cx}`);
  
  if (!apiKey || !cx) {
    console.error('❌ Missing configuration');
    return;
  }
  
  const query = 'artificial intelligence';
  console.log(`\n🔍 Testing query: "${query}"`);
  
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.append('key', apiKey);
  url.searchParams.append('cx', cx);
  url.searchParams.append('q', query);
  url.searchParams.append('num', '3');
  url.searchParams.append('safe', 'active');
  
  console.log(`\n📡 Request URL: ${url.toString().substring(0, 100)}...`);
  console.log('\n⏳ Sending request...\n');
  
  try {
    const startTime = Date.now();
    
    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url.toString(), {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Response received in ${responseTime}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error Response:');
      console.error(errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 Response Summary:');
    console.log(`   Search Time: ${data.searchInformation?.searchTime}s`);
    console.log(`   Total Results: ${data.searchInformation?.totalResults}`);
    console.log(`   Items Returned: ${data.items?.length || 0}`);
    
    if (data.items && data.items.length > 0) {
      console.log('\n📄 Results:');
      data.items.forEach((item: any, index: number) => {
        console.log(`\n  ${index + 1}. ${item.title}`);
        console.log(`     ${item.link}`);
        console.log(`     ${item.snippet.substring(0, 100)}...`);
      });
      
      console.log('\n✅ SUCCESS - Google API is working correctly!');
    } else {
      console.log('\n⚠️ No results returned');
    }
    
    if (data.error) {
      console.error('\n❌ API Error:', data.error);
    }
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('\n❌ Request timeout after 10 seconds');
        console.error('   This might indicate:');
        console.error('   - Network connectivity issues');
        console.error('   - Firewall blocking the request');
        console.error('   - Google API service issues');
      } else {
        console.error('\n❌ Error:', error.message);
        console.error('   Stack:', error.stack);
      }
    } else {
      console.error('\n❌ Unknown error:', error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

testGoogleAPI().catch(console.error);
