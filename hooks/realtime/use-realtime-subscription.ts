'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-realtime';
import { apiSend } from '@/lib/api-config';

interface UseRealtimeSubscriptionOptions<T> {
  channelName: string;      // e.g. "post-comments-123" or "classroom-chat-456"
  table: string;            // Supabase table name: "post_comments" | "messages"
  filter: string;           // Filter for Supabase subscription: e.g. `post_id=eq.xxx`
  apiUrl: string;           // API endpoint to fetch latest data
  mapData: (data: any) => T; // Mapper to transform raw API response into final object
  initialData: T[];         // Initial list from server (SSR or first fetch)
  role?: string;            // Optional role for secured API calls
}

export function useRealtimeSubscription<T>({
  channelName,
  table,
  filter,
  apiUrl,
  mapData,
  initialData,
  role = 'user',
}: UseRealtimeSubscriptionOptions<T>) {
  const [items, setItems] = useState<T[]>(initialData);

  // Sync initial state
  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  // Setup Supabase Realtime Subscription
  useEffect(() => {
    if (!channelName) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        async (payload) => {
          try {
            // Fetch latest inserted data from API
            const latestData = await apiSend<any>({
              url: `${apiUrl}/${payload.new.id}`,
              method: 'GET',
              role,
            });

            if (latestData) {
              const newItem = mapData(latestData);
              setItems((prev) => [...prev, newItem]);
            }
          } catch (error) {
            console.error(`[Realtime] Fetch failed for ${table}:`, error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, filter, apiUrl, role]);

  return { items };
}
