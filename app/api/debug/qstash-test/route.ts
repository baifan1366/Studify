import { NextResponse } from "next/server";
import { Client } from "@upstash/qstash";

export async function GET() {
  try {
    // Check if environment variables are set
    const qstashToken = process.env.QSTASH_TOKEN;
    const qstashUrl = process.env.QSTASH_URL;
    
    if (!qstashToken) {
      return NextResponse.json({
        error: "QSTASH_TOKEN environment variable not set",
        env_vars: {
          QSTASH_TOKEN: !!qstashToken,
          QSTASH_URL: !!qstashUrl,
        }
      }, { status: 500 });
    }

    console.log('QStash Token (first 20 chars):', qstashToken.substring(0, 20));
    console.log('QStash URL:', qstashUrl);

    // Test QStash client initialization
    const client = new Client({
      token: qstashToken,
      baseUrl: qstashUrl
    });

    // Test basic QStash API call (get usage/stats)
    try {
      // Try to get QStash stats to test connection
      const response = await fetch('https://qstash.upstash.io/v2/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        return NextResponse.json({
          error: "QStash API test failed",
          status: response.status,
          statusText: response.statusText,
          response: responseText,
          token_format: qstashToken.startsWith('eyJ') ? 'JWT-like (possibly wrong format)' : 'Token format',
          debug_info: {
            token_length: qstashToken.length,
            starts_with: qstashToken.substring(0, 10),
            url_used: qstashUrl || 'https://qstash.upstash.io'
          }
        }, { status: 503 });
      }

      let statsData;
      try {
        statsData = JSON.parse(responseText);
      } catch {
        statsData = responseText;
      }

      return NextResponse.json({
        success: true,
        message: "QStash connection successful",
        qstash_stats: statsData,
        config: {
          token_configured: !!qstashToken,
          url_configured: !!qstashUrl,
          token_format: qstashToken.startsWith('qstash_') ? 'Correct format' : 'Check token format'
        }
      });

    } catch (fetchError: any) {
      return NextResponse.json({
        error: "Failed to connect to QStash API",
        details: fetchError.message,
        token_info: {
          format: qstashToken.startsWith('eyJ') ? 'JWT-like (possibly base64 credentials - incorrect)' : 'Token',
          length: qstashToken.length,
          prefix: qstashToken.substring(0, 10)
        },
        suggestion: "Your token appears to be base64 encoded credentials. You need the actual QStash token from Upstash console."
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('QStash test error:', error);
    
    return NextResponse.json({
      error: "QStash configuration test failed",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const qstashToken = process.env.QSTASH_TOKEN;
    
    if (!qstashToken) {
      return NextResponse.json({ error: "QSTASH_TOKEN not configured" }, { status: 500 });
    }

    // Test publishing a simple message
    const client = new Client({
      token: qstashToken,
      baseUrl: process.env.QSTASH_URL
    });

    const testEndpoint = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/debug/qstash-webhook`;
    
    const response = await client.publish({
      url: testEndpoint,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: "QStash test message"
      }),
    });

    return NextResponse.json({
      success: true,
      message: "QStash publish test successful",
      messageId: response.messageId,
      endpoint: testEndpoint
    });

  } catch (error: any) {
    console.error('QStash publish test error:', error);
    
    return NextResponse.json({
      error: "QStash publish test failed",
      details: error.message,
      suggestion: "Check your QStash token and ensure it's the correct format (not base64 credentials)"
    }, { status: 503 });
  }
}
