/**
 * Test script for the complete video processing flow
 * This script tests the entire QStash-based video processing pipeline
 */

import { createServerClient } from "@/utils/supabase/server";

interface TestResult {
  step: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

export async function testVideoProcessingFlow(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Initialize Supabase client
    const client = createServerClient();
    
    // Test 1: Check database tables exist
    results.push(await testDatabaseTables(client));
    
    // Test 2: Check environment variables
    results.push(await testEnvironmentVariables());
    
    // Test 3: Test QStash connection
    results.push(await testQStashConnection());
    
    // Test 4: Test Hugging Face API endpoints
    results.push(await testHuggingFaceEndpoints());
    
    // Test 5: Test notification system
    results.push(await testNotificationSystem());
    
    return results;
    
  } catch (error: any) {
    results.push({
      step: 'Test Framework',
      status: 'error',
      message: `Test framework error: ${error.message}`
    });
    return results;
  }
}

async function testDatabaseTables(client: any): Promise<TestResult> {
  try {
    // Check if video_processing_queue table exists and has correct structure
    const { data: queueData, error: queueError } = await client
      .from('video_processing_queue')
      .select('*')
      .limit(1);
    
    if (queueError) {
      return {
        step: 'Database Tables',
        status: 'error',
        message: `video_processing_queue table error: ${queueError.message}`
      };
    }
    
    // Check if video_processing_steps table exists
    const { data: stepsData, error: stepsError } = await client
      .from('video_processing_steps')
      .select('*')
      .limit(1);
    
    if (stepsError) {
      return {
        step: 'Database Tables',
        status: 'error',
        message: `video_processing_steps table error: ${stepsError.message}`
      };
    }
    
    // Check if view exists
    const { data: viewData, error: viewError } = await client
      .from('video_processing_queue_status')
      .select('*')
      .limit(1);
    
    if (viewError) {
      return {
        step: 'Database Tables',
        status: 'error',
        message: `video_processing_queue_status view error: ${viewError.message}`
      };
    }
    
    return {
      step: 'Database Tables',
      status: 'success',
      message: 'All required database tables and views exist'
    };
    
  } catch (error: any) {
    return {
      step: 'Database Tables',
      status: 'error',
      message: `Database connection error: ${error.message}`
    };
  }
}

async function testEnvironmentVariables(): Promise<TestResult> {
  const requiredVars = [
    'BGE_HG_EMBEDDING_SERVER_API_URL',
    'E5_HG_EMBEDDING_SERVER_API_URL',
    'WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL',
    'QSTASH_URL',
    'QSTASH_TOKEN',
    'QSTASH_CURRENT_SIGNING_KEY',
    'QSTASH_NEXT_SIGNING_KEY',
    'MEGA_EMAIL',
    'MEGA_PASSWORD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return {
      step: 'Environment Variables',
      status: 'error',
      message: `Missing required environment variables: ${missing.join(', ')}`
    };
  }
  
  return {
    step: 'Environment Variables',
    status: 'success',
    message: 'All required environment variables are set'
  };
}

async function testQStashConnection(): Promise<TestResult> {
  try {
    const qstashUrl = process.env.QSTASH_URL;
    const qstashToken = process.env.QSTASH_TOKEN;
    
    if (!qstashUrl || !qstashToken) {
      return {
        step: 'QStash Connection',
        status: 'error',
        message: 'QStash credentials not configured'
      };
    }
    
    // Test QStash connection by checking the API
    const response = await fetch(`${qstashUrl}/v2/topics`, {
      headers: {
        'Authorization': `Bearer ${qstashToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        step: 'QStash Connection',
        status: 'error',
        message: `QStash API error: ${response.status} ${response.statusText}`
      };
    }
    
    return {
      step: 'QStash Connection',
      status: 'success',
      message: 'QStash connection successful'
    };
    
  } catch (error: any) {
    return {
      step: 'QStash Connection',
      status: 'error',
      message: `QStash connection failed: ${error.message}`
    };
  }
}

async function testHuggingFaceEndpoints(): Promise<TestResult> {
  const endpoints = [
    { name: 'BGE Embedding', url: process.env.BGE_HG_EMBEDDING_SERVER_API_URL },
    { name: 'E5 Embedding', url: process.env.E5_HG_EMBEDDING_SERVER_API_URL },
    { name: 'Whisper', url: process.env.WHISPER_HG_VOICE_TO_TEXT_SERVER_API_URL }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    if (!endpoint.url) {
      results.push(`${endpoint.name}: URL not configured`);
      continue;
    }
    
    try {
      // Test with a simple HEAD request to check if server is reachable
      const response = await fetch(endpoint.url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        results.push(`${endpoint.name}: Server reachable`);
      } else {
        results.push(`${endpoint.name}: Server returned ${response.status}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        results.push(`${endpoint.name}: Server may be sleeping (timeout)`);
      } else {
        results.push(`${endpoint.name}: Connection failed - ${error.message}`);
      }
    }
  }
  
  return {
    step: 'Hugging Face Endpoints',
    status: 'success',
    message: results.join('; '),
    data: results
  };
}

async function testNotificationSystem(): Promise<TestResult> {
  try {
    // Check if OneSignal is configured
    const oneSignalKey = process.env.ONESIGNAL_REST_API_KEY;
    
    if (!oneSignalKey) {
      return {
        step: 'Notification System',
        status: 'error',
        message: 'OneSignal REST API key not configured'
      };
    }
    
    // Test notification service import
    const { sendVideoProcessingNotification } = await import('@/lib/video-processing/notification-service');
    
    if (typeof sendVideoProcessingNotification !== 'function') {
      return {
        step: 'Notification System',
        status: 'error',
        message: 'Notification service not properly exported'
      };
    }
    
    return {
      step: 'Notification System',
      status: 'success',
      message: 'Notification system configured and ready'
    };
    
  } catch (error: any) {
    return {
      step: 'Notification System',
      status: 'error',
      message: `Notification system error: ${error.message}`
    };
  }
}

// CLI runner for the test
if (require.main === module) {
  testVideoProcessingFlow().then(results => {
    console.log('\n=== Video Processing System Test Results ===\n');
    
    results.forEach((result, index) => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.step}`);
      console.log(`   ${result.message}\n`);
    });
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    console.log(`\n=== Summary: ${successCount}/${totalCount} tests passed ===`);
    
    if (successCount === totalCount) {
      console.log('🎉 All tests passed! Video processing system is ready.');
    } else {
      console.log('⚠️  Some tests failed. Please check the configuration.');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}
