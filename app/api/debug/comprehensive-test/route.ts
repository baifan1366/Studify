import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // Test 1: Environment Variables
  console.log('🔍 Test 1: Checking environment variables...');
  const envTest = {
    name: 'Environment Configuration',
    status: 'passed',
    details: {} as any
  };

  envTest.details.qstash_token = process.env.QSTASH_TOKEN ? 
    `✅ Configured (${process.env.QSTASH_TOKEN.substring(0, 20)}...)` : 
    '❌ Missing';
  
  envTest.details.qstash_signing_key = process.env.QSTASH_CURRENT_SIGNING_KEY ? 
    `✅ Configured (${process.env.QSTASH_CURRENT_SIGNING_KEY.substring(0, 15)}...)` : 
    '❌ Missing';
  
  envTest.details.site_url = process.env.NEXT_PUBLIC_SITE_URL ? 
    `✅ Configured: ${process.env.NEXT_PUBLIC_SITE_URL}` : 
    '⚠️ Not configured (using default)';
  
  envTest.details.mega_credentials = (process.env.MEGA_EMAIL && process.env.MEGA_PASSWORD) ? 
    '✅ Configured' : 
    '❌ Missing';
  
  envTest.details.cloudinary = process.env.CLOUDINARY_CLOUD_NAME ? 
    '✅ Configured' : 
    '❌ Missing';

  if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_CURRENT_SIGNING_KEY) {
    envTest.status = 'failed';
    results.summary.failed++;
  } else if (!process.env.NEXT_PUBLIC_SITE_URL) {
    envTest.status = 'warning';
    results.summary.warnings++;
  } else {
    results.summary.passed++;
  }
  
  results.tests.push(envTest);

  // Test 2: QStash Connection
  console.log('🔍 Test 2: Testing QStash API connection...');
  const qstashTest = {
    name: 'QStash API Connection',
    status: 'passed',
    details: {} as any
  };

  try {
    const token = process.env.QSTASH_TOKEN;
    const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    
    const response = await fetch(`${baseUrl}/v2/queues`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (response.ok) {
      const queues = await response.json();
      qstashTest.details.connection = '✅ Connected';
      qstashTest.details.queues_count = queues.length;
      qstashTest.details.queues = queues.map((q: any) => q.name);
      results.summary.passed++;
    } else {
      qstashTest.status = 'failed';
      qstashTest.details.error = `HTTP ${response.status}: ${await response.text()}`;
      results.summary.failed++;
    }
  } catch (error: any) {
    qstashTest.status = 'failed';
    qstashTest.details.error = error.message;
    results.summary.failed++;
  }

  results.tests.push(qstashTest);

  // Test 3: Database Connection
  console.log('🔍 Test 3: Testing database connection...');
  const dbTest = {
    name: 'Database Connection',
    status: 'passed',
    details: {} as any
  };

  try {
    const client = await createServerClient();
    const { data, error } = await client
      .from("video_processing_queue")
      .select("id, status, current_step, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      dbTest.status = 'failed';
      dbTest.details.error = error.message;
      results.summary.failed++;
    } else {
      dbTest.details.connection = '✅ Connected';
      dbTest.details.latest_queue = data?.[0] || 'No queues found';
      results.summary.passed++;
    }
  } catch (error: any) {
    dbTest.status = 'failed';
    dbTest.details.error = error.message;
    results.summary.failed++;
  }

  results.tests.push(dbTest);

  // Test 4: Check recent QStash events
  console.log('🔍 Test 4: Checking recent QStash events...');
  const eventsTest = {
    name: 'QStash Recent Events',
    status: 'passed',
    details: {} as any
  };

  try {
    const token = process.env.QSTASH_TOKEN;
    const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    
    const response = await fetch(`${baseUrl}/v2/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (response.ok) {
      const events = await response.json();
      // events might be an object with an array property, not an array directly
      const eventArray = Array.isArray(events) ? events : (events.events || events.cursor?.events || []);
      const recentEvents = eventArray.slice(0, 10);
      
      // Analyze events
      const failedEvents = eventArray.filter((e: any) => 
        e.state === 'ERROR' || e.state === 'FAILED'
      );
      
      const compressEvents = eventArray.filter((e: any) => 
        e.url && e.url.includes('/compress')
      );

      eventsTest.details.total_events = eventArray.length;
      eventsTest.details.failed_events = failedEvents.length;
      eventsTest.details.compress_related = compressEvents.length;
      
      if (failedEvents.length > 0) {
        eventsTest.details.recent_failure = {
          messageId: failedEvents[0].messageId,
          state: failedEvents[0].state,
          error: failedEvents[0].error,
          url: failedEvents[0].url,
          time: failedEvents[0].time
        };
      }
      
      if (compressEvents.length > 0) {
        eventsTest.details.last_compress_event = {
          messageId: compressEvents[0].messageId,
          state: compressEvents[0].state,
          responseStatus: compressEvents[0].responseStatus,
          time: compressEvents[0].time
        };
      }
      
      results.summary.passed++;
    } else {
      eventsTest.status = 'failed';
      eventsTest.details.error = `HTTP ${response.status}`;
      results.summary.failed++;
    }
  } catch (error: any) {
    eventsTest.status = 'failed';
    eventsTest.details.error = error.message;
    results.summary.failed++;
  }

  results.tests.push(eventsTest);

  // Test 5: Check Dead Letter Queue
  console.log('🔍 Test 5: Checking Dead Letter Queue...');
  const dlqTest = {
    name: 'Dead Letter Queue',
    status: 'passed',
    details: {} as any
  };

  try {
    const token = process.env.QSTASH_TOKEN;
    const baseUrl = process.env.QSTASH_URL || "https://qstash.upstash.io";
    
    const response = await fetch(`${baseUrl}/v2/dlq`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (response.ok) {
      const dlq = await response.json();
      dlqTest.details.message_count = dlq.length;
      
      if (dlq.length > 0) {
        dlqTest.status = 'warning';
        dlqTest.details.sample_message = {
          messageId: dlq[0].messageId,
          url: dlq[0].url,
          failedAt: dlq[0].failedAt
        };
        results.summary.warnings++;
      } else {
        dlqTest.details.status = '✅ No failed messages';
        results.summary.passed++;
      }
    } else {
      dlqTest.status = 'failed';
      dlqTest.details.error = `HTTP ${response.status}`;
      results.summary.failed++;
    }
  } catch (error: any) {
    dlqTest.status = 'failed';
    dlqTest.details.error = error.message;
    results.summary.failed++;
  }

  results.tests.push(dlqTest);

  // Test 6: Endpoint Accessibility
  console.log('🔍 Test 6: Testing endpoint accessibility...');
  const endpointTest = {
    name: 'Endpoint Accessibility',
    status: 'passed',
    details: {} as any
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studify-platform.vercel.app';
  const endpoints = [
    '/api/video-processing/steps/compress',
    '/api/video-processing/steps/audio-convert',
    '/api/video-processing/steps/transcribe',
    '/api/video-processing/steps/embed'
  ];

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      // Test with GET request (we added GET handlers for debugging)
      const response = await fetch(url, { method: 'GET' });
      
      if (response.ok) {
        const data = await response.json();
        endpointTest.details[endpoint] = '✅ Accessible';
      } else {
        endpointTest.details[endpoint] = `⚠️ HTTP ${response.status}`;
        endpointTest.status = 'warning';
        results.summary.warnings++;
      }
    } catch (error: any) {
      endpointTest.details[endpoint] = `❌ ${error.message}`;
      endpointTest.status = 'failed';
    }
  }

  if (endpointTest.status === 'passed') {
    results.summary.passed++;
  } else if (endpointTest.status === 'failed') {
    results.summary.failed++;
  }

  results.tests.push(endpointTest);

  // Generate recommendations
  const recommendations = [];
  
  if (!process.env.QSTASH_TOKEN) {
    recommendations.push('🔴 Critical: Configure QSTASH_TOKEN in your .env file');
  }
  
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    recommendations.push('🔴 Critical: Configure QSTASH_CURRENT_SIGNING_KEY for signature verification');
  }
  
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    recommendations.push('🟡 Important: Set NEXT_PUBLIC_SITE_URL to your actual domain');
  }
  
  const failedEvents = results.tests.find(t => t.name === 'QStash Recent Events')?.details?.failed_events;
  if (failedEvents > 0) {
    recommendations.push(`🟡 Warning: ${failedEvents} failed events in QStash. Check the logs for details`);
  }
  
  const dlqCount = results.tests.find(t => t.name === 'Dead Letter Queue')?.details?.message_count;
  if (dlqCount > 0) {
    recommendations.push(`🟡 Warning: ${dlqCount} messages in Dead Letter Queue. These need to be reprocessed`);
  }

  return NextResponse.json({
    ...results,
    recommendations,
    next_steps: [
      '1. Fix any critical issues (red items) first',
      '2. Run /api/debug/qstash-logs to see detailed error messages',
      '3. Try /api/debug/test-compress to manually trigger compression',
      '4. Check if your deployment URL matches NEXT_PUBLIC_SITE_URL',
      '5. Verify QStash can reach your deployment (not localhost)'
    ]
  }, { 
    status: results.summary.failed > 0 ? 500 : 200 
  });
}
