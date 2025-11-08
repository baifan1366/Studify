// hooks/classroom/use-classroom-live-sessions.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { toast } from 'sonner';

import { LiveSession } from '@/interface/classroom/live-session-interface';

interface CreateSessionData {
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string | null;
  host_id: string;
}

interface UpdateSessionData {
  title?: string;
  description?: string;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled';
  starts_at?: string;
  ends_at?: string;
}

export function useClassroomLiveSessions(classroomSlug: string) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const queryKey = [`classroom-live-sessions`, classroomSlug];

  const { data, error, isLoading } = useQuery<LiveSession[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch live sessions');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const createSession = async (sessionData: CreateSessionData): Promise<LiveSession> => {
    if (isCreating) throw new Error('Already creating a session');

    setIsCreating(true);
    
    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sessionData,
          sendNotification: true, // Notify all classroom members about new live session
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create session');
      }

      const newSession: LiveSession = await response.json();
      
      // 更新 React Query 缓存
      queryClient.invalidateQueries({ queryKey });
      
      return newSession;

    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateSession = async (sessionId: string, updateData: UpdateSessionData): Promise<LiveSession> => {
    if (isUpdating) throw new Error('Already updating a session');

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updateData,
          sendNotification: updateData.status === 'live', // Notify when session goes live
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update session');
      }

      const updatedSession: LiveSession = await response.json();
      
      // 更新 React Query 缓存
      queryClient.invalidateQueries({ queryKey });
      
      return updatedSession;

    } catch (error) {
      console.error('Session update failed:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    if (isDeleting) throw new Error('Already deleting a session');

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/classroom/${classroomSlug}/live-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete session');
      }

      // 更新 React Query 缓存
      queryClient.invalidateQueries({ queryKey });
      
      toast.success('直播会话已删除');

    } catch (error) {
      console.error('Session deletion failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete session');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const getActiveSession = (): LiveSession | null => {
    return data?.find(session => session.status === 'live') || null;
  };

  const getScheduledSessions = (): LiveSession[] => {
    return data?.filter(session => session.status === 'scheduled') || [];
  };

  const getEndedSessions = (): LiveSession[] => {
    return data?.filter(session => session.status === 'ended') || [];
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    sessions: data,
    isLoading: isLoading || isCreating || isUpdating || isDeleting,
    error,
    createSession,
    updateSession,
    deleteSession,
    invalidateQueries,
    getActiveSession,
    getScheduledSessions,
    getEndedSessions,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
