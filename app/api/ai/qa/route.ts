import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force Node.js runtime for streaming support (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request validation schema for educational Q&A
const qaRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  contentTypes: z.array(z.string()).optional(),
  includeAnalysis: z.boolean().default(false),
  maxContext: z.number().min(1).max(20).default(5),
  aiMode: z.enum(['fast', 'thinking']).default('fast'),
  stream: z.boolean().default(false),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    reasoning_details: z.any().optional()
  })).optional(),
  conversationId: z.string().optional(),
  sessionId: z.string().uuid().optional()
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validatedData = qaRequestSchema.parse(body);
    const { question, contentTypes, includeAnalysis, context, conversationId, aiMode, stream, sessionId } = validatedData;

    const userId = authResult.user.profile?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Select model based on AI mode: thinking mode uses THINKING model, fast mode uses FAST model
    const selectedModel = aiMode === 'thinking'
      ? (process.env.OPEN_ROUTER_MODEL_THINKING || 'deepseek/deepseek-r1')
      : (process.env.OPEN_ROUTER_MODEL_FAST || 'nvidia/nemotron-3-super-120b-a12b:free');

    console.log(`❓ Q&A request: "${question.substring(0, 100)}..." [${aiMode} mode] [stream: ${stream}]`);

    if (stream) {
      return handleStreamingResponse(question, context, aiMode, selectedModel, sessionId, userId);
    }

    // Non-streaming response
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
    console.log(`✅ Q&A completed in ${processingTime}ms`);

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
    console.error('❌ Q&A error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Q&A failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle streaming with OpenRouter SDK
async function handleStreamingResponse(
  question: string,
  context: Array<{ role: 'user' | 'assistant'; content: string; reasoning_details?: any }> | undefined,
  aiMode: 'fast' | 'thinking',
  selectedModel: string,
  sessionId?: string,
  userId?: number
) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Build messages
  const messages: any[] = [];

  if (aiMode === 'thinking') {
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant. Think through your reasoning step-by-step before providing the final answer.'
    });
  }

  if (context && context.length > 0) {
    messages.push(...context.map(msg => ({
      role: msg.role,
      content: msg.content
    })));
  }

  messages.push({ role: 'user', content: question });

  // Retry loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let keyName: string | null = null;

    try {
      const { key: apiKey, name } = await apiKeyManager.getAvailableKey();
      keyName = name;

      console.log(`🔑 Attempt ${attempt + 1}/${maxRetries} using key: ${keyName}`);

      // Create stream
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();

      // Start streaming in background
      (async () => {
        try {
          const streamStartTime = Date.now();
          console.log(`🚀 Starting OpenRouter streaming with ${aiMode} mode...`);
          console.log(`📡 Request config:`, {
            model: selectedModel,
            messageCount: messages.length,
            hasReasoning: aiMode === 'thinking',
            temperature: aiMode === 'thinking' ? 0.3 : 0.5
          });

          // Call OpenRouter API directly with fetch
          const fetchStartTime = Date.now();
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
              ...(aiMode === 'thinking' ? {
                reasoning: {
                  enabled: true,
                  summary: 'auto'
                }
              } : {}),
              temperature: aiMode === 'thinking' ? 0.3 : 0.5,
            })
          });

          const fetchEndTime = Date.now();
          console.log(`⏱️ Fetch completed in ${fetchEndTime - fetchStartTime}ms, status: ${response.status}`);
          console.log(`📋 Response headers:`, {
            contentType: response.headers.get('content-type'),
            transferEncoding: response.headers.get('transfer-encoding'),
            cacheControl: response.headers.get('cache-control')
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No reader available');
          }

          console.log(`📖 Reader obtained, starting to read chunks...`);

          let thinkingContent = '';
          let answerContent = '';
          let isInThinking = false;
          let reasoningDetails: any[] = [];
          let hasContent = false;
          let chunkCount = 0;
          let buffer = ''; // Buffer for incomplete SSE data
          let firstChunkTime: number | null = null;
          let lastChunkTime = Date.now();

          while (true) {
            const readStartTime = Date.now();
            const { done, value } = await reader.read();
            const readEndTime = Date.now();

            if (!firstChunkTime && value) {
              firstChunkTime = readEndTime;
              console.log(`🎯 First chunk received after ${firstChunkTime - streamStartTime}ms`);
            }

            if (done) {
              console.log(`✅ Stream done, total time: ${Date.now() - streamStartTime}ms`);
              break;
            }

            const timeSinceLastChunk = readEndTime - lastChunkTime;
            lastChunkTime = readEndTime;

            console.log(`📦 Raw chunk received: ${value?.length || 0} bytes, read took ${readEndTime - readStartTime}ms, gap: ${timeSinceLastChunk}ms`);

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            console.log(`📝 Buffer size: ${buffer.length} chars`);

            // Split by newlines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim().startsWith('data: ')) continue;

              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                hasContent = true;
                chunkCount++;
                const chunkTime = Date.now() - streamStartTime;

                // Handle reasoning_details (snake_case from OpenRouter API)
                if (delta.reasoning_details && Array.isArray(delta.reasoning_details)) {
                  console.log(`🧠 Reasoning chunk #${chunkCount} at ${chunkTime}ms:`, delta.reasoning_details.length, 'details');

                  for (const reasoningDetail of delta.reasoning_details) {
                    let reasoningText = '';

                    // OpenRouter API format: reasoning.text, reasoning.summary
                    if (reasoningDetail.type === 'reasoning.text' && reasoningDetail.text) {
                      reasoningText = reasoningDetail.text;
                      console.log(`  📄 reasoning.text: ${reasoningText.length} chars`);
                    } else if (reasoningDetail.type === 'reasoning.summary' && reasoningDetail.summary) {
                      reasoningText = reasoningDetail.summary;
                      console.log(`  📝 reasoning.summary: ${reasoningText.length} chars`);
                    }

                    if (reasoningText) {
                      if (!isInThinking) {
                        isInThinking = true;
                        console.log(`🟣 Thinking phase started`);
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_start', content: '' })}\n\n`));
                      }

                      thinkingContent += reasoningText;
                      reasoningDetails.push(reasoningDetail);

                      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: reasoningText })}\n\n`));
                    }
                  }
                }

                // Handle content
                if (delta.content) {
                  console.log(`💬 Content chunk #${chunkCount} at ${chunkTime}ms: "${delta.content.substring(0, 50)}..." (${delta.content.length} chars)`);

                  if (isInThinking) {
                    isInThinking = false;
                    console.log(`⚪ Answer phase started`);
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'answer_start', content: '' })}\n\n`));
                  }

                  answerContent += delta.content;

                  // 将大块内容拆分成单个字符，实现流畅的打字效果
                  // Split content into individual characters for smooth typing effect
                  const content = delta.content;

                  // 逐字符发送，实现真正的打字机效果
                  for (let i = 0; i < content.length; i++) {
                    const char = content[i];
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'answer', content: char })}\n\n`));
                  }
                }

                // Capture reasoning_details from final message
                if (parsed.choices?.[0]?.message?.reasoning_details) {
                  reasoningDetails = parsed.choices[0].message.reasoning_details;
                  console.log(`📋 Final reasoning_details captured`);
                }

              } catch (e) {
                console.warn(`⚠️ Failed to parse SSE line, skipping:`, e);
                // Skip malformed JSON
                continue;
              }
            }
          }

          // Send reasoning details if available
          if (reasoningDetails.length > 0) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning_details', content: reasoningDetails })}\n\n`));
          }

          // Send completion message
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            content: '',
            metadata: {
              thinkingLength: thinkingContent.length,
              answerLength: answerContent.length,
              hasReasoningDetails: reasoningDetails.length > 0,
              totalChunks: chunkCount,
              streamDuration: Date.now() - streamStartTime
            }
          })}\n\n`));

          console.log(`✅ SDK Streaming completed: ${chunkCount} chunks, thinking: ${thinkingContent.length}, answer: ${answerContent.length}, duration: ${Date.now() - streamStartTime}ms`);

          if (keyName && hasContent) {
            await apiKeyManager.recordUsage(keyName, true);
          }

          // Save messages to session (fire-and-forget)
          if (sessionId && userId && answerContent) {
            (async () => {
              try {
                // Resolve sessionId (UUID) to numeric session_id
                const { data: session, error: sessionError } = await supabase
                  .from('ai_quick_qa_sessions')
                  .select('id')
                  .eq('public_id', sessionId)
                  .eq('user_id', userId)
                  .single();

                if (sessionError || !session) {
                  console.error('❌ Failed to resolve session:', sessionError?.message);
                  return;
                }

                const numericSessionId = session.id;

                // Save user message
                await supabase
                  .from('ai_quick_qa_messages')
                  .insert({
                    session_id: numericSessionId,
                    role: 'user',
                    content: question,
                    ai_mode: aiMode
                  });

                // Save assistant message
                await supabase
                  .from('ai_quick_qa_messages')
                  .insert({
                    session_id: numericSessionId,
                    role: 'assistant',
                    content: answerContent,
                    thinking: thinkingContent || null,
                    reasoning_details: reasoningDetails.length > 0 ? reasoningDetails : null,
                    ai_mode: aiMode
                  });

                // Update session updated_at
                await supabase
                  .from('ai_quick_qa_sessions')
                  .update({ updated_at: new Date().toISOString() })
                  .eq('id', numericSessionId);

                console.log(`💾 Messages saved to session ${sessionId}`);
              } catch (saveError) {
                console.error('❌ Failed to save messages:', saveError);
              }
            })();
          }

        } catch (error) {
          console.error('❌ SDK Streaming error:', error);

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

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Content-Type-Options': 'nosniff',
          'Transfer-Encoding': 'chunked',
          'x-vercel-no-cache': '1',
        },
      });

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt + 1} failed:`, lastError.message);

      if (keyName) {
        await apiKeyManager.recordUsage(keyName, false, lastError);
      }

      if (lastError.message.includes('Rate limit') && attempt < maxRetries - 1) {
        console.log(`🔄 Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (attempt === maxRetries - 1) {
        break;
      }
    }
  }

  console.error(`❌ All ${maxRetries} attempts failed`);
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
