/**
 * Meeting data hooks using React Query
 * Centralized access to meeting data and token
 */

import { useQuery } from '@tanstack/react-query';
import { meetingApi } from '@/lib/api';
import { apiGet, apiSend } from '@/lib/api-config';

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
 * 获取会议信息
 * @param meetingId - 会议ID
 */
export function useMeeting(meetingId: string) {
  return useQuery<Meeting>({
    queryKey: ['meeting', meetingId],
    queryFn: () => apiGet<Meeting>(meetingApi.getMeeting(meetingId)),
    enabled: !!meetingId, // 防止 meetingId 为空时报错
  });
}

/**
 * 获取会议令牌
 * @param meetingId - 会议ID
 * @param role - 用户角色
 */
export function useMeetingToken(meetingId: string, role: string) {
  return useQuery<{ token: string }>({
    queryKey: ['meeting-token', meetingId, role],
    queryFn: () =>
      apiSend<{ token: string }, { role: string }>({
        url: meetingApi.getToken(meetingId),
        method: 'POST',
        body: { role }, // ✅ 放到请求体中
        role, // ✅ 自动加到请求头
      }),
    enabled: !!meetingId && !!role, // 必须有会议ID和角色才能获取令牌
  });
}
