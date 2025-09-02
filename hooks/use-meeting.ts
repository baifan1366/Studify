/**
 * Meeting data hook using React Query
 * Provides centralized access to meeting data and operations
 */

import { useQuery } from '@tanstack/react-query';
import { meetingApi } from '@/lib/api';

// 会议数据接口
interface Meeting {
  id: string;
  title: string;
  status: string;
  host: {
    id: string;
    name: string;
    avatar_url: string;
  };
  participants: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    left_at: string | null;
  }>;
  starts_at: string;
  ends_at: string | null;
  recording_url: string | null;
  whiteboard_id: string | null;
  course_id: string | null;
}

/**
 * Hook for fetching meeting data
 * @param meetingId - The ID of the meeting to fetch
 */
export function useMeeting(meetingId: string) {
  return useQuery<Meeting>({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await fetch(meetingApi.getMeeting(meetingId));
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '无法获取会议信息');
      }
      
      return response.json();
    },
  });
}

/**
 * Hook for fetching meeting token
 * @param meetingId - The ID of the meeting
 * @param role - The role of the user in the meeting
 */
export function useMeetingToken(meetingId: string, role: string) {
  return useQuery<{ token: string }>({
    queryKey: ['meeting-token', meetingId],
    queryFn: async () => {
      const response = await fetch(meetingApi.getToken(meetingId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '无法获取会议令牌');
      }
      
      return response.json();
    },
    enabled: !!meetingId, // 只有在有会议ID时才获取令牌
  });
}