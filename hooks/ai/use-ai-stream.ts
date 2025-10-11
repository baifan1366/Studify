/**
 * React Hook for AI Streaming with Tool Calling
 * 
 * Best Practices Implementation:
 * - Real-time streaming for better UX
 * - Tool usage visibility
 * - Error handling
 * - Loading states
 */

import { useState, useCallback, useRef } from 'react';

interface StreamChunk {
  type: 'token' | 'tool_start' | 'tool_end' | 'error' | 'final' | 'done';
  content: string;
  toolName?: string;
  metadata?: any;
  timestamp: number;
}

interface StreamOptions {
  toolCategories?: string[];
  enabledTools?: string[] | 'all';
  temperature?: number;
  model?: string;
  onToken?: (token: string) => void;
  onToolStart?: (toolName: string, metadata?: any) => void;
  onToolEnd?: (toolName: string, metadata?: any) => void;
  onError?: (error: string) => void;
  onComplete?: (fullResponse: string, metadata: any) => void;
}

export function useAIStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamQuery = useCallback(async (
    prompt: string,
    options: StreamOptions = {}
  ) => {
    // Reset state
    setIsStreaming(true);
    setCurrentResponse('');
    setToolsUsed([]);
    setError(null);
    setMetadata(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          toolCategories: options.toolCategories,
          enabledTools: options.enabledTools,
          temperature: options.temperature,
          model: options.model,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream completed');
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'token':
                  // Append token to response
                  setCurrentResponse(prev => {
                    const newResponse = prev + data.content;
                    options.onToken?.(data.content);
                    return newResponse;
                  });
                  break;

                case 'tool_start':
                  console.log(`🔧 Tool started: ${data.toolName}`);
                  if (data.toolName) {
                    setToolsUsed(prev => [...prev, data.toolName!]);
                    options.onToolStart?.(data.toolName, data.metadata);
                  }
                  break;

                case 'tool_end':
                  console.log(`✅ Tool completed: ${data.toolName}`);
                  options.onToolEnd?.(data.toolName!, data.metadata);
                  break;

                case 'final':
                  console.log('🎯 Final response:', data.metadata);
                  setMetadata(data.metadata);
                  options.onComplete?.(data.content, data.metadata);
                  break;

                case 'error':
                  console.error('❌ Stream error:', data.content);
                  setError(data.content);
                  options.onError?.(data.content);
                  break;

                case 'done':
                  console.log('✅ Stream done');
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by user');
          setError('Cancelled');
        } else {
          console.error('Stream error:', err);
          setError(err.message);
          options.onError?.(err.message);
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('🛑 Stream cancelled');
    }
  }, []);

  const reset = useCallback(() => {
    setCurrentResponse('');
    setToolsUsed([]);
    setError(null);
    setMetadata(null);
  }, []);

  return {
    // State
    isStreaming,
    currentResponse,
    toolsUsed,
    error,
    metadata,
    
    // Actions
    streamQuery,
    cancelStream,
    reset,
  };
}

/**
 * Example Usage:
 * 
 * ```tsx
 * function ChatComponent() {
 *   const { 
 *     isStreaming, 
 *     currentResponse, 
 *     toolsUsed, 
 *     streamQuery, 
 *     cancelStream 
 *   } = useAIStream();
 * 
 *   const handleAsk = async () => {
 *     await streamQuery('Explain quantum physics', {
 *       toolCategories: ['SEARCH_AND_QA'],
 *       onToken: (token) => {
 *         // Real-time UI update
 *         console.log('New token:', token);
 *       },
 *       onToolStart: (toolName) => {
 *         console.log('Using tool:', toolName);
 *       },
 *       onComplete: (response, metadata) => {
 *         console.log('Done!', metadata);
 *       }
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleAsk} disabled={isStreaming}>
 *         Ask Question
 *       </button>
 *       
 *       {isStreaming && (
 *         <button onClick={cancelStream}>Cancel</button>
 *       )}
 *       
 *       <div>
 *         {currentResponse}
 *         {isStreaming && <span className="animate-pulse">▊</span>}
 *       </div>
 *       
 *       {toolsUsed.length > 0 && (
 *         <div>Tools used: {toolsUsed.join(', ')}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
