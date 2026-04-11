import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';
import { z } from 'zod';

// Request validation schema for educational Q&A
const qaRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  contentTypes: z.array(z.string()).optional(),
  includeAnalysis: z.boolean().default(false),
  maxContext: z.number().min(1).max(20).default(5),
  aiMode: z.enum(['fast', 'thinking']).default('fast'),
  stream: z.boolean().default(false), // Add stream parameter
  // Support for conversation context
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    reasoning_details: z.any().optional()
  })).optional(),
  conversationId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = qaRequestSchema.parse(body);

    const { question, contentTypes, includeAnalysis, context, conversationId, aiMode, stream } = validatedData;

    // Get model based on AI mode - using NVIDIA Nemotron 3 Super for both modes
    const selectedModel = process.env.OPEN_ROUTER_MODEL_FAST || 'nvidia/nemotron-3-super-120b-a12b:free';

    console.log(`❓ Educational Q&A request from user ${authResult.payload.sub}: "${question.substring(0, 100)}..." ${context ? `(with ${context.length} context messages)` : '(no context)'} [${aiMode} mode - ${selectedModel}] [stream: ${stream}]`);

    // If streaming is requested, use OpenRouter API directly
    if (stream) {
      return handleStreamingResponse(question, context, aiMode, selectedModel);
    }

    // Non-streaming response (original behavior)
    const startTime = Date.now();
    const result = await enhancedAIExecutor.educationalQA(question, {
      userId: parseInt(authResult.payload.sub),
      contentTypes,
      includeAnalysis,
      conversationContext: context?.map(c => ({ role: c.role, content: c.content })),
      conversationId,
      model: selectedModel
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Educational Q&A completed in ${processingTime}ms using tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      question,
      answer: result.answer,
      sources: result.sources,
      analysis: result.analysis,
      confidence: result.confidence,
      toolsUsed: result.toolsUsed,
      metadata: {
        processingTimeMs: processingTime,
        contentTypes: contentTypes || ['all'],
        includeAnalysis,
        aiMode,
        model: selectedModel,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub
      }
    });

  } catch (error) {
    console.error('❌ Educational Q&A error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Educational Q&A failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle streaming response with retry logic
async function handleStreamingResponse(
  question: string,
  context: Array<{role: 'user' | 'assistant'; content: string; reasoning_details?: any}> | undefined,
  aiMode: 'fast' | 'thinking',
  selectedModel: string
) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Build messages array once (outside retry loop)
  const messages: any[] = [];
  
  // Add system prompt for thinking mode (helps some models generate better reasoning)
  if (aiMode === 'thinking') {
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant. When answering questions, think through your reasoning step-by-step before providing the final answer.'
    });
  }
  
  // Add conversation history if available
  if (context && context.length > 0) {
    messages.push(...context.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {})
    })));
  }
  
  // Add current question
  messages.push({
    role: 'user',
    content: question
  });

  // Try up to maxRetries times with different keys
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let keyName: string | null = null;
    
    try {
      // Get API key
      const { key: apiKey, name } = await apiKeyManager.getAvailableKey();
      keyName = name;
      
      console.log(`🔑 Attempt ${attempt + 1}/${maxRetries} using key: ${keyName}`);

      // Test the API key with a preflight request (non-streaming)
      const preflightResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Studify'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          stream: false
        })
      });

      if (!preflightResponse.ok) {
        const errorText = await preflightResponse.text();
        let errorMessage = `OpenRouter API error: ${preflightResponse.status}`;
        
        // Parse error details if available
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} - ${preflightResponse.statusText}`;
        }
        
        // Add specific messages for common errors
        if (preflightResponse.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (preflightResponse.status === 401) {
          errorMessage = 'API authentication failed. Please check your API key.';
        } else if (preflightResponse.status === 402) {
          errorMessage = 'Insufficient credits. Please check your OpenRouter account.';
        }
        
        const error = new Error(errorMessage);
        
        // Record failure
        await apiKeyManager.recordUsage(keyName, false, error);
        
        throw error;
      }

      // Preflight succeeded, now start actual streaming
      console.log(`✅ Preflight check passed for key ${keyName}, starting stream...`);

      // Create a TransformStream for streaming response
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      // Start streaming in background
      (async () => {
        try {
          // Call OpenRouter API with streaming
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              'X-Title': 'Studify'
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: messages,
              stream: true,
              reasoning: aiMode === 'thinking' ? { enabled: true } : undefined,
              temperature: aiMode === 'thinking' ? 0.3 : 0.5,
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `OpenRouter API error: ${response.status}`;
            
            // Parse error details if available
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error?.message || errorMessage;
            } catch (e) {
              errorMessage = `${errorMessage} - ${response.statusText}`;
            }
            
            // Add specific messages for common errors
            if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (response.status === 401) {
              errorMessage = 'API authentication failed. Please check your API key.';
            } else if (response.status === 402) {
              errorMessage = 'Insufficient credits. Please check your OpenRouter account.';
            }
            
            const error = new Error(errorMessage);
            
            // Record failure
            if (keyName) {
              await apiKeyManager.recordUsage(keyName, false, error);
            }
            
            throw error;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No reader available');
          }

          let thinkingContent = '';
          let answerContent = '';
          let isInThinking = false;
          let reasoningDetails: any = null;
          let hasContent = false;
          let buffer = ''; // Buffer for incomplete JSON chunks

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Split by newlines but keep incomplete lines in buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

            for (const line of lines) {
              if (!line.trim().startsWith('data: ')) continue;
              
              const data = line.replace('data: ', '').trim();
              
              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (!delta) continue;

                hasContent = true;

                // Debug: Log the delta structure to understand what OpenRouter is sending
                if (delta.reasoning_details || delta.content) {
                  console.log('📦 Delta received:', JSON.stringify({
                    hasReasoningDetails: !!delta.reasoning_details,
                    reasoningDetailsCount: delta.reasoning_details?.length || 0,
                    hasContent: !!delta.content,
                    contentPreview: delta.content?.substring(0, 50)
                  }));
                }

                // Handle reasoning_details (thinking mode) - OpenRouter format
                if (delta.reasoning_details && Array.isArray(delta.reasoning_details)) {
                  for (const reasoningDetail of delta.reasoning_details) {
                    // Extract text from reasoning detail based on type
                    let reasoningText = '';
                    
                    // According to OpenRouter docs:
                    // - reasoning.text has "text" field
                    // - reasoning.summary has "summary" field
                    // - reasoning.encrypted has "data" field
                    if (reasoningDetail.type === 'reasoning.text' && reasoningDetail.text) {
                      reasoningText = reasoningDetail.text;
                    } else if (reasoningDetail.type === 'reasoning.summary' && reasoningDetail.summary) {
                      reasoningText = reasoningDetail.summary;
                    }
                    
                    if (reasoningText) {
                      if (!isInThinking) {
                        isInThinking = true;
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                          type: 'thinking_start',
                          content: ''
                        })}\n\n`));
                        // Force flush by writing empty comment
                        await writer.write(encoder.encode(': ping\n\n'));
                      }
                      
                      thinkingContent += reasoningText;
                      await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'thinking',
                        content: reasoningText
                      })}\n\n`));
                      // Force flush after each chunk
                      await writer.write(encoder.encode(': ping\n\n'));
                    }
                  }
                }

                // Handle regular content (answer)
                if (delta.content) {
                  if (isInThinking) {
                    isInThinking = false;
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'answer_start',
                      content: ''
                    })}\n\n`));
                    // Force flush
                    await writer.write(encoder.encode(': ping\n\n'));
                  }
                  
                  answerContent += delta.content;
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'answer',
                    content: delta.content
                  })}\n\n`));
                  // Force flush after each chunk
                  await writer.write(encoder.encode(': ping\n\n'));
                }

                // Capture reasoning_details from message for preserving in conversation
                if (parsed.choices?.[0]?.message?.reasoning_details) {
                  reasoningDetails = parsed.choices[0].message.reasoning_details;
                }

              } catch (e) {
                // Silently skip malformed JSON chunks (likely incomplete)
                // This is normal for SSE streaming
                continue;
              }
            }
          }

          // Send reasoning_details if available (for conversation preservation)
          if (reasoningDetails) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ 
              type: 'reasoning_details',
              content: reasoningDetails
            })}\n\n`));
          }

          // Send completion marker
          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            content: '',
            metadata: {
              thinkingLength: thinkingContent.length,
              answerLength: answerContent.length,
              hasReasoningDetails: !!reasoningDetails
            }
          })}\n\n`));

          console.log('✅ Streaming completed', {
            thinkingLength: thinkingContent.length,
            answerLength: answerContent.length,
            hasReasoningDetails: !!reasoningDetails,
            keyUsed: keyName
          });

          // Record success
          if (keyName && hasContent) {
            await apiKeyManager.recordUsage(keyName, true);
          }

        } catch (error) {
          console.error('❌ Streaming error:', error);
          
          // Record failure
          if (keyName) {
            await apiKeyManager.recordUsage(keyName, false, error instanceof Error ? error : new Error(String(error)));
          }
          
          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            content: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`));
        } finally {
          await writer.close();
        }
      })();

      // Return streaming response with aggressive anti-buffering headers
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
          'X-Content-Type-Options': 'nosniff',
          'Transfer-Encoding': 'chunked',
          // Vercel-specific headers to prevent buffering
          'x-vercel-no-cache': '1',
        },
      });

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt + 1} failed with key ${keyName}:`, lastError.message);
      
      // Record failure
      if (keyName) {
        await apiKeyManager.recordUsage(keyName, false, lastError);
      }
      
      // If this is a rate limit error and we have more retries, continue
      if (lastError.message.includes('Rate limit') && attempt < maxRetries - 1) {
        console.log(`🔄 Retrying with different key...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        continue;
      }
      
      // For other errors or last attempt, throw
      if (attempt === maxRetries - 1) {
        break;
      }
    }
  }

  // All retries failed
  console.error(`❌ All ${maxRetries} attempts failed. Last error:`, lastError?.message);
  return new Response(
    JSON.stringify({ 
      error: 'Stream setup failed after multiple retries',
      message: lastError?.message || 'Unknown error',
      attempts: maxRetries
    }),
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
