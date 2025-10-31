// hooks/classroom/use-livekit-token.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { toast } from 'sonner';
import { LiveKitTokenRequest, LiveKitTokenResponse } from '@/interface/livekit/token-interface';

interface UseLiveKitTokenOptions {
  classroomSlug: string;
  sessionId: string;
  participantName?: string;
  metadata?: string;
  autoRefresh?: boolean;
}

export function useLiveKitToken({
  classroomSlug,
  sessionId,
  participantName,
  metadata,
  autoRefresh = true
}: UseLiveKitTokenOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Query key for caching
  const queryKey = [`livekit-token`, classroomSlug, sessionId];

  const { data, error, isLoading: queryIsLoading } = useQuery<LiveKitTokenResponse>({
    queryKey,
    queryFn: () => Promise.resolve(null as any), // 不自动获取，需要手动触发
    enabled: false, // 禁用自动查询
    refetchOnWindowFocus: false,
    refetchOnReconnect: autoRefresh,
    refetchInterval: autoRefresh ? 45 * 60 * 1000 : 0, // 45分钟自动刷新
  });

  const generateToken = async (requestData?: LiveKitTokenRequest): Promise<LiveKitTokenResponse | null> => {
    if (isGenerating) {
      console.log('⚠️ [useLiveKitToken] Already generating token, skipping...');
      return null;
    }

    console.log('🚀 [useLiveKitToken] Starting token generation...');
    setIsGenerating(true);
    
    try {
      const apiUrl = `/api/classroom/${classroomSlug}/live-sessions/${sessionId}/token`;
      console.log('🚀 [useLiveKitToken] Generating token with:', {
        classroomSlug,
        sessionId,
        apiUrl,
        participantName: requestData?.participantName || participantName,
        metadata: requestData?.metadata || metadata || 'default-metadata'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantName: requestData?.participantName || participantName,
          metadata: requestData?.metadata || metadata || JSON.stringify({ role: 'participant', timestamp: Date.now() }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate token');
      }

      const tokenData: LiveKitTokenResponse = await response.json();
      
      console.log('✅ [useLiveKitToken] Token generated successfully:', {
        hasToken: !!tokenData.token,
        hasWsUrl: !!tokenData.wsUrl
      });
      
      // 更新 React Query 缓存
      queryClient.setQueryData(queryKey, tokenData);
      
      toast.success('LiveKit token generated successfully');
      return tokenData;

    } catch (error) {
      console.error('❌ [useLiveKitToken] Token generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate token');
      return null;
    } finally {
      console.log('🏁 [useLiveKitToken] Token generation finished, setting isGenerating to false');
      setIsGenerating(false);
    }
  };

  const refreshToken = async (): Promise<LiveKitTokenResponse | null> => {
    if (isGenerating) return null;

    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/classroom/${classroomSlug}/live-sessions/${sessionId}/token`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to refresh token');
      }

      const tokenData: LiveKitTokenResponse = await response.json();
      
      // 更新 React Query 缓存
      queryClient.setQueryData(queryKey, tokenData);
      
      toast.success('LiveKit token refreshed successfully');
      return tokenData;

    } catch (error) {
      console.error('Token refresh failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to refresh token');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearToken = () => {
    queryClient.removeQueries({ queryKey });
  };

  return {
    token: data?.token,
    tokenData: data,
    isLoading: isGenerating, // Only use isGenerating since query is disabled
    error,
    generateToken,
    refreshToken,
    clearToken,
    isGenerating,
  };
}
