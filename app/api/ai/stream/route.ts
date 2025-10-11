import { NextRequest } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { StudifyToolCallingAgent } from '@/lib/langChain/tool-calling-integration';
import { z } from 'zod';

// Request validation schema
const streamRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  toolCategories: z.array(z.string()).optional(),
  enabledTools: z.union([z.array(z.string()), z.literal('all')]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().optional(),
});

/**
 * POST /api/ai/stream - Streaming AI responses with tool calling
 * 
 * This endpoint demonstrates best practices:
 * 1. Real-time streaming for better UX
 * 2. Tool calling integration
 * 3. Memory management for conversations
 * 4. Proper error handling
 */
export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = parseInt(authResult.payload.sub);

    // Parse and validate request
    const body = await request.json();
    const validatedData = streamRequestSchema.parse(body);

    const { 
      prompt, 
      toolCategories, 
      enabledTools, 
      temperature, 
      model 
    } = validatedData;

    console.log(`🎬 Streaming request from user ${userId}: "${prompt.substring(0, 50)}..."`);

    // Create agent with configuration
    const agent = new StudifyToolCallingAgent({
      model,
      temperature,
      enabledTools,
      toolCategories: toolCategories as any,
      verbose: true,
      userId
    });

    await agent.initialize();

    // Create a readable stream for SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute with streaming
          for await (const chunk of agent.executeStream(prompt, { userId })) {
            // Send SSE formatted data
            const data = JSON.stringify({
              type: chunk.type,
              content: chunk.content,
              toolName: chunk.toolName,
              metadata: chunk.metadata,
              timestamp: Date.now()
            });

            controller.enqueue(
              encoder.encode(`data: ${data}\n\n`)
            );

            // Small delay to prevent overwhelming the client
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          const errorData = JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          });
          
          controller.enqueue(
            encoder.encode(`data: ${errorData}\n\n`)
          );
          
          controller.close();
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Stream API error:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return Response.json(
      { 
        error: 'Streaming failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/stream - Get streaming capabilities
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof Response) {
      return authResult;
    }

    return Response.json({
      success: true,
      capabilities: {
        streaming: true,
        toolCalling: true,
        memoryManagement: true,
        supportedEventTypes: [
          'token',
          'tool_start',
          'tool_end',
          'error',
          'final'
        ]
      },
      usage: {
        endpoint: '/api/ai/stream',
        method: 'POST',
        contentType: 'application/json',
        responseType: 'text/event-stream',
        example: {
          prompt: 'Explain quantum physics',
          toolCategories: ['SEARCH_AND_QA'],
          temperature: 0.3
        }
      },
      clientExample: `
// Frontend usage example
const response = await fetch('/api/ai/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Your question here',
    toolCategories: ['SEARCH_AND_QA']
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'token') {
        // Update UI with new token
        console.log(data.content);
      } else if (data.type === 'tool_start') {
        // Show tool usage
        console.log('Using tool:', data.toolName);
      }
    }
  }
}
      `
    });

  } catch (error) {
    console.error('❌ Error getting streaming info:', error);
    return Response.json(
      { error: 'Failed to get streaming information' },
      { status: 500 }
    );
  }
}
