import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { enhancedAIExecutor } from '@/lib/langChain/tool-calling-integration';
import { apiKeyManager } from '@/lib/langChain/api-key-manager';
import { z } from 'zod';

// Get model based on user preference (fast or thinking mode)
function getModel(mode: 'fast' | 'thinking' = 'fast'): string {
  return mode === 'thinking' 
    ? process.env.OPEN_ROUTER_MODEL_THINKING || 'nvidia/nemotron-3-super-120b-a12b:free'
    : process.env.OPEN_ROUTER_MODEL_FAST || 'nvidia/nemotron-3-super-120b-a12b:free';
}

// Request validation schema for content analysis
const analysisRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  analysisType: z.enum(['summary', 'topics', 'questions', 'notes', 'problem_solving', 'learning_path']).default('summary'),
  includeRecommendations: z.boolean().default(false),
  aiMode: z.enum(['fast', 'thinking']).default('fast'),
  stream: z.boolean().default(false), // Add stream parameter
  imageUrl: z.string().optional(),
  learningGoal: z.string().optional(),
  currentLevel: z.string().optional(),
  timeConstraint: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Authorize user
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Handle both JSON and FormData (for image uploads)
    let validatedData;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle image upload for problem solving
      const formData = await request.formData();
      const content = formData.get('content') as string || '';
      const analysisTypeRaw = formData.get('analysisType') as string || 'problem_solving';
      const includeRecommendations = formData.get('includeRecommendations') === 'true';
      const aiModeRaw = formData.get('aiMode') as string || 'fast';
      const streamRaw = formData.get('stream') as string || 'false';
      const imageFile = formData.get('image') as File;
      
      // Validate analysisType
      const validAnalysisTypes = ['summary', 'topics', 'questions', 'notes', 'problem_solving'] as const;
      const analysisType = validAnalysisTypes.includes(analysisTypeRaw as any) 
        ? analysisTypeRaw as typeof validAnalysisTypes[number]
        : 'problem_solving';
      
      // Validate aiMode
      const aiMode = (aiModeRaw === 'thinking' ? 'thinking' : 'fast') as 'fast' | 'thinking';
      const stream = streamRaw === 'true';
      
      let imageData = null;
      if (imageFile) {
        // Convert image to base64 for AI processing
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageFile.type || 'image/jpeg';
        imageData = `data:${mimeType};base64,${base64}`;
        
        console.log(`📸 Processing uploaded image: ${imageFile.name} (${imageFile.size} bytes, ${mimeType})`);
      }
      
      validatedData = {
        content: imageData || content,
        analysisType,
        includeRecommendations,
        aiMode,
        stream,
        imageUrl: imageFile ? `uploaded_${imageFile.name}` : undefined
      };
    } else {
      // Handle JSON request
      const body = await request.json();
      validatedData = analysisRequestSchema.parse(body);
    }

    const { content, analysisType, includeRecommendations, aiMode, stream, imageUrl, learningGoal, currentLevel, timeConstraint } = validatedData;

    const selectedModel = getModel(aiMode);
    console.log(`📊 Content analysis request from user ${authResult.payload.sub}: ${analysisType} analysis using ${selectedModel} (${aiMode} mode) [stream: ${stream}]`);

    // If streaming is requested, use OpenRouter API directly
    if (stream) {
      return handleStreamingAnalysis(content, analysisType, aiMode, selectedModel, imageUrl);
    }

    // Non-streaming response (original behavior)
    const startTime = Date.now();
    const result = await enhancedAIExecutor.analyzeCourseContent(
      content,
      analysisType,
      {
        userId: parseInt(authResult.payload.sub),
        includeRecommendations,
        imageUrl,
        learningGoal,
        currentLevel,
        timeConstraint,
        model: selectedModel
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`✅ Course analysis completed in ${processingTime}ms using ${selectedModel} (${aiMode} mode), tools: ${result.toolsUsed.join(', ')}`);

    return NextResponse.json({
      success: true,
      type: analysisType,
      result: result.analysis,
      answer: result.analysis,
      content: {
        preview: imageUrl ? `Image: ${imageUrl}` : content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        length: content.length,
        type: imageUrl ? 'image' : 'text'
      },
      analysisType,
      analysis: result.analysis,
      recommendations: result.recommendations,
      toolsUsed: result.toolsUsed,
      executionTime: result.executionTime,
      confidence: 0.95,
      metadata: {
        processingTimeMs: processingTime,
        includeRecommendations,
        aiMode,
        model: selectedModel,
        timestamp: new Date().toISOString(),
        userId: authResult.payload.sub,
        imageProcessed: !!imageUrl
      }
    });

  } catch (error) {
    console.error('❌ Course analysis error:', error);

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
        error: 'Course analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle streaming analysis response with retry logic
async function handleStreamingAnalysis(
  content: string,
  analysisType: string,
  aiMode: 'fast' | 'thinking',
  selectedModel: string,
  imageUrl?: string
) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Build prompt based on analysis type (once, outside retry loop)
  let prompt = '';
  const isImageAnalysis = content.startsWith('data:image');

  switch (analysisType) {
    case 'problem_solving':
      prompt = isImageAnalysis
        ? 'Analyze this image and solve the problem shown. Provide a step-by-step solution with clear explanations.'
        : `Solve this problem step by step:\n\n${content}`;
      break;
    case 'summary':
      prompt = `Provide a concise summary of the following content:\n\n${content}`;
      break;
    case 'topics':
      prompt = `Extract the main topics from the following content:\n\n${content}`;
      break;
    case 'questions':
      prompt = `Generate relevant questions based on the following content:\n\n${content}`;
      break;
    case 'notes':
      prompt = `Create structured notes from the following content:\n\n${content}`;
      break;
    case 'learning_path':
      prompt = `Create a learning path based on the following content:\n\n${content}`;
      break;
    default:
      prompt = content;
  }

  // Build messages array once (outside retry loop)
  const messages: any[] = [];
  
  // Add system prompt for thinking mode (helps some models generate better reasoning)
  if (aiMode === 'thinking') {
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant. When analyzing content, think through your reasoning step-by-step before providing the final analysis.'
    });
  }
  
  if (isImageAnalysis) {
    // For image analysis, use vision model format
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: content
          }
        }
      ]
    });
  } else {
    // For text analysis
    messages.push({
      role: 'user',
      content: prompt
    });
  }

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

                // Handle reasoning content (thinking mode)
                if (delta.reasoning_content) {
                  if (!isInThinking) {
                    isInThinking = true;
                    await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'thinking_start',
                      content: ''
                    })}\n\n`));
                    // Force flush by writing empty comment
                    await writer.write(encoder.encode(': ping\n\n'));
                  }
                  
                  thinkingContent += delta.reasoning_content;
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'thinking',
                    content: delta.reasoning_content
                  })}\n\n`));
                  // Force flush after each chunk
                  await writer.write(encoder.encode(': ping\n\n'));
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

                // Capture reasoning_details
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

          // Send reasoning_details if available
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
              hasReasoningDetails: !!reasoningDetails,
              analysisType
            }
          })}\n\n`));

          console.log('✅ Streaming analysis completed', {
            thinkingLength: thinkingContent.length,
            answerLength: answerContent.length,
            analysisType,
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
      
      // For other errors or last attempt, break
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
