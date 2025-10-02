'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useMutation as useLiveblocksMutation,
  useStorage,
  useHistory,
} from '@/lib/liveblocks';

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
  const eventStreamRef = useRef<string | undefined>(undefined);

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

// ============================================
// Whiteboard Drawing & Canvas Types
// ============================================

/**
 * 文本框类型定义
 */
export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  backgroundColor?: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  alignment: 'left' | 'center' | 'right';
  isEditing: boolean;
  isSelected: boolean;
  zIndex: number;
}

export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

export interface DrawingState {
  isDrawing: boolean;
  isDragging: boolean;
  isResizing: boolean;
  activeTextBox: string | null;
  startPoint: { x: number; y: number } | null;
  dragOffset: { x: number; y: number };
  resizeHandle: 'se' | 'sw' | 'ne' | 'nw' | null;
}

export type DrawingAction =
  | { type: 'START_DRAWING'; payload: { x: number; y: number } }
  | { type: 'STOP_DRAWING' }
  | { type: 'START_DRAGGING'; payload: { textBoxId: string; offsetX: number; offsetY: number } }
  | { type: 'STOP_DRAGGING' }
  | { type: 'START_RESIZING'; payload: { textBoxId: string; handle: 'se' | 'sw' | 'ne' | 'nw' } }
  | { type: 'STOP_RESIZING' }
  | { type: 'SELECT_TEXTBOX'; payload: { textBoxId: string } }
  | { type: 'DESELECT_ALL' }
  | { type: 'START_EDIT_TEXTBOX'; payload: { textBoxId: string } }
  | { type: 'FINISH_EDIT_TEXTBOX' };

// ============================================
// Whiteboard Reducer
// ============================================

export const initialDrawingState: DrawingState = {
  isDrawing: false,
  isDragging: false,
  isResizing: false,
  activeTextBox: null,
  startPoint: null,
  dragOffset: { x: 0, y: 0 },
  resizeHandle: null,
};

export function whiteboardReducer(
  state: DrawingState,
  action: DrawingAction
): DrawingState {
  switch (action.type) {
    case 'START_DRAWING':
      return {
        ...state,
        isDrawing: true,
        startPoint: { x: action.payload.x, y: action.payload.y },
        isDragging: false,
        isResizing: false,
      };

    case 'STOP_DRAWING':
      return {
        ...state,
        isDrawing: false,
        startPoint: null,
      };

    case 'START_DRAGGING':
      return {
        ...state,
        isDragging: true,
        activeTextBox: action.payload.textBoxId,
        dragOffset: {
          x: action.payload.offsetX,
          y: action.payload.offsetY,
        },
        isDrawing: false,
      };

    case 'STOP_DRAGGING':
      return {
        ...state,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      };

    case 'START_RESIZING':
      return {
        ...state,
        isResizing: true,
        activeTextBox: action.payload.textBoxId,
        resizeHandle: action.payload.handle,
        isDrawing: false,
      };

    case 'STOP_RESIZING':
      return {
        ...state,
        isResizing: false,
        resizeHandle: null,
      };

    case 'SELECT_TEXTBOX':
      return {
        ...state,
        activeTextBox: action.payload.textBoxId,
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        activeTextBox: null,
      };

    case 'START_EDIT_TEXTBOX':
      return {
        ...state,
        activeTextBox: action.payload.textBoxId,
        isDrawing: false,
        isDragging: false,
        isResizing: false,
      };

    case 'FINISH_EDIT_TEXTBOX':
    default:
      return state;
  }
}

// ============================================
// Collaborative Whiteboard Hook (Liveblocks)
// ============================================

/**
 * useCollaborativeWhiteboard Hook
 * 
 * 集成 Liveblocks 实现白板多人实时协作
 * 
 * 功能:
 * - 实时同步绘制笔触
 * - 多人光标显示
 * - 文本框协作编辑
 * - 撤销/重做支持
 */

export function useCollaborativeWhiteboard() {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const history = useHistory();

  // 获取共享的文本框数据
  const textBoxes = useStorage((root) => root.whiteboardTextBoxes);
  
  /**
   * 更新光标位置
   */
  const updateCursor = useCallback((x: number, y: number) => {
    updateMyPresence({ cursor: { x, y } });
  }, [updateMyPresence]);

  /**
   * 隐藏光标（离开白板区域）
   */
  const hideCursor = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  /**
   * 更新当前工具
   */
  const updateTool = useCallback((tool: Tool) => {
    updateMyPresence({ currentTool: tool });
  }, [updateMyPresence]);

  /**
   * 添加文本框（协作）
   */
  const addTextBox = useLiveblocksMutation(({ storage }: any, textBox: Omit<TextBox, 'isEditing' | 'isSelected' | 'zIndex'>) => {
    const textBoxes = storage.get('whiteboardTextBoxes');
    if (textBoxes) {
      textBoxes.push({
        id: textBox.id,
        x: textBox.x,
        y: textBox.y,
        width: textBox.width,
        height: textBox.height,
        text: textBox.text,
        color: textBox.color,
        fontSize: textBox.fontSize,
        fontFamily: textBox.fontFamily,
        timestamp: Date.now(),
      });
    }
  }, []);

  /**
   * 更新文本框
   */
  const updateTextBox = useLiveblocksMutation(
    ({ storage }: any, id: string, updates: Partial<TextBox>) => {
      const textBoxes = storage.get('whiteboardTextBoxes');
      if (textBoxes && Array.isArray(textBoxes)) {
        const index = textBoxes.findIndex((tb: any) => tb.id === id);
        if (index !== -1) {
          const current = textBoxes[index];
          textBoxes[index] = {
            ...current,
            ...updates,
            timestamp: Date.now(),
          };
        }
      }
    },
    []
  );

  /**
   * 删除文本框
   */
  const deleteTextBox = useLiveblocksMutation(({ storage }: any, id: string) => {
    const textBoxes = storage.get('whiteboardTextBoxes');
    if (textBoxes && Array.isArray(textBoxes)) {
      const index = textBoxes.findIndex((tb: any) => tb.id === id);
      if (index !== -1) {
        textBoxes.splice(index, 1);
      }
    }
  }, []);

  /**
   * 清空白板
   */
  const clearWhiteboard = useLiveblocksMutation(({ storage }: any) => {
    const textBoxes = storage.get('whiteboardTextBoxes');
    if (textBoxes && typeof textBoxes.clear === 'function') {
      textBoxes.clear();
    }
    
    const strokes = storage.get('whiteboardStrokes');
    if (strokes && typeof strokes.clear === 'function') {
      strokes.clear();
    }
  }, []);

  /**
   * 获取其他用户的光标
   */
  const othersCursors = others
    .map((other) => ({
      connectionId: other.connectionId,
      presence: other.presence,
      info: other.info,
    }))
    .filter((other) => other.presence.cursor !== null);

  /**
   * 获取其他用户的当前工具
   */
  const othersTools = others.map((other) => ({
    connectionId: other.connectionId,
    tool: other.presence.currentTool,
    userName: other.presence.userName,
    userColor: other.presence.userColor,
  }));

  return {
    // 我的状态
    myPresence,
    updateCursor,
    hideCursor,
    updateTool,
    
    // 其他用户
    othersCursors,
    othersTools,
    
    // 协作数据
    textBoxes: textBoxes || [],
    addTextBox,
    updateTextBox,
    deleteTextBox,
    clearWhiteboard,
    
    // 历史记录
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  };
}

