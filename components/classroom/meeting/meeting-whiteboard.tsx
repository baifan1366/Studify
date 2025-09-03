'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LiveblocksProvider, RoomProvider } from '@liveblocks/react';
import { ClientSideSuspense } from '@liveblocks/react';
import { Tldraw, TldrawEditor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MeetingWhiteboardProps {
  meetingId: string;
}

export default function MeetingWhiteboard({ meetingId }: MeetingWhiteboardProps) {
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['whiteboard', meetingId],
    queryFn: async () => {

      const response = await fetch(`/api/meeting/${meetingId}/whiteboard/init`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('初始化白板失败');
      }

      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (data && data.roomId) {
      setRoomId(data.roomId);
    }
  }, [data]);

  const handleSaveState = async (state: any) => {
    try {
      await fetch(`/api/meeting/${meetingId}/whiteboard/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotData: state }),
      });
    } catch (error) {
      console.error('保存白板状态失败:', error);
    }
  };

  if (isLoading || !roomId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <div className="text-gray-700">正在加载白板...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 text-xl font-bold mb-4">加载白板失败</div>
        <div className="text-gray-700 mb-6">{(error as Error).message}</div>
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          retry
        </Button>
      </div>
    );
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: [],
        color: [
          Math.random() * 255,
          Math.random() * 255,
          Math.random() * 255,
        ],
      }}
    >
      <ClientSideSuspense fallback={<div>加载中...</div>}>
        {() => (
          <div className="h-full w-full">
            <Tldraw
              onMount={(editor) => {
                // 每30秒保存一次白板状态
                const interval = setInterval(() => {
                  const snapshot = editor.store.getSnapshot();
                  handleSaveState(snapshot);
                }, 30000);

                return () => clearInterval(interval);
              }}
            />
          </div>
        )}
      </ClientSideSuspense>
    </RoomProvider>
  );
}