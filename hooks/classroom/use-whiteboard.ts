'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface WhiteboardSession {
  id: number;
  public_id: string;
  session_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  classroom_live_session?: {
    id: number;
    session_name: string;
    status: string;
    classroom_id: number;
  };
}

export interface WhiteboardEvent {
  id: number;
  public_id: string;
  wb_id: number;
  actor_id: number;
  kind: string;
  payload: any;
  created_at: string;
  profiles?: {
    id: number;
    display_name: string;
    avatar_url: string;
  };
}

export interface CreateWhiteboardData {
  session_id: string;
  title?: string;
}

export interface UpdateWhiteboardData {
  title?: string;
}

export interface CreateEventData {
  kind: string;
  payload: any;
}

// Hook to fetch whiteboards for a classroom
export function useWhiteboards(classroomSlug: string, sessionId?: string) {
  const queryKey = ['whiteboards', classroomSlug, sessionId].filter(Boolean);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(`${API_BASE_URL}/classroom/${classroomSlug}/whiteboard`);
      if (sessionId) {
        url.searchParams.set('session_id', sessionId);
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch whiteboards');
      }

      return response.json() as Promise<WhiteboardSession[]>;
    },
    enabled: !!classroomSlug,
  });
}

// Hook to fetch a specific whiteboard
export function useWhiteboard(classroomSlug: string, whiteboardId: string) {
  return useQuery({
    queryKey: ['whiteboard', classroomSlug, whiteboardId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/whiteboard/${whiteboardId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch whiteboard');
      }

      return response.json() as Promise<WhiteboardSession>;
    },
    enabled: !!classroomSlug && !!whiteboardId,
  });
}

// Hook to create a new whiteboard
export function useCreateWhiteboard(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWhiteboardData) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/whiteboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create whiteboard');
      }

      return response.json() as Promise<WhiteboardSession>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards', classroomSlug] });
    },
  });
}

// Hook to update whiteboard metadata
export function useUpdateWhiteboard(classroomSlug: string, whiteboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateWhiteboardData) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/whiteboard/${whiteboardId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update whiteboard');
      }

      return response.json() as Promise<WhiteboardSession>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', classroomSlug, whiteboardId] });
      queryClient.invalidateQueries({ queryKey: ['whiteboards', classroomSlug] });
    },
  });
}

// Hook to delete a whiteboard
export function useDeleteWhiteboard(classroomSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (whiteboardId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/whiteboard/${whiteboardId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete whiteboard');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboards', classroomSlug] });
    },
  });
}

// Hook to fetch whiteboard events
export function useWhiteboardEvents(
  classroomSlug: string, 
  whiteboardId: string, 
  options?: { since?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['whiteboard-events', classroomSlug, whiteboardId, options?.since],
    queryFn: async () => {
      const url = new URL(`${API_BASE_URL}/classroom/${classroomSlug}/whiteboard/${whiteboardId}/events`);
      if (options?.since) {
        url.searchParams.set('since', options.since);
      }
      if (options?.limit) {
        url.searchParams.set('limit', options.limit.toString());
      }

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch whiteboard events');
      }

      return response.json() as Promise<WhiteboardEvent[]>;
    },
    enabled: !!classroomSlug && !!whiteboardId,
    refetchInterval: 1000, // Poll every second for real-time updates
  });
}

// Hook to create whiteboard events
export function useCreateWhiteboardEvent(classroomSlug: string, whiteboardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await fetch(
        `${API_BASE_URL}/classroom/${classroomSlug}/whiteboard/${whiteboardId}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create whiteboard event');
      }

      return response.json() as Promise<WhiteboardEvent>;
    },
    onSuccess: () => {
      // Invalidate events to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ['whiteboard-events', classroomSlug, whiteboardId] 
      });
    },
  });
}

// Combined hook for whiteboard management with real-time events
export function useWhiteboardManager(classroomSlug: string, whiteboardId?: string) {
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string>();
  const eventStreamRef = useRef<string>();

  const createWhiteboard = useCreateWhiteboard(classroomSlug);
  const deleteWhiteboard = useDeleteWhiteboard(classroomSlug);
  
  const whiteboard = whiteboardId ? useWhiteboard(classroomSlug, whiteboardId) : undefined;
  const updateWhiteboard = whiteboardId ? useUpdateWhiteboard(classroomSlug, whiteboardId) : undefined;
  const createEvent = whiteboardId ? useCreateWhiteboardEvent(classroomSlug, whiteboardId) : undefined;
  
  // Fetch events incrementally for real-time updates
  const events = whiteboardId ? useWhiteboardEvents(classroomSlug, whiteboardId, {
    since: lastEventTimestamp,
    limit: 100
  }) : undefined;

  const sendEvent = useCallback(async (kind: string, payload: any) => {
    if (!createEvent) return;
    
    try {
      await createEvent.mutateAsync({ kind, payload });
    } catch (error) {
      console.error('Failed to send whiteboard event:', error);
    }
  }, [createEvent]);

  // Update last event timestamp when new events arrive
  const handleNewEvents = useCallback((newEvents: WhiteboardEvent[]) => {
    if (newEvents && newEvents.length > 0) {
      const latest = newEvents[newEvents.length - 1];
      setLastEventTimestamp(latest.created_at);
    }
  }, []);

  return {
    // Queries
    whiteboard,
    events,
    
    // Mutations
    createWhiteboard,
    updateWhiteboard,
    deleteWhiteboard,
    
    // Event handling
    sendEvent,
    handleNewEvents,
    
    // Status
    isLoading: whiteboard?.isLoading || events?.isLoading,
    isCreating: createWhiteboard.isPending,
    isUpdating: updateWhiteboard?.isPending,
    isDeleting: deleteWhiteboard.isPending,
    isSendingEvent: createEvent?.isPending,
  };
}
