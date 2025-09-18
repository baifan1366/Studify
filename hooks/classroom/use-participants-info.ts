"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-config";

export interface ParticipantInfo {
  id: string;
  user_id: string;
  classroom?: {
    id: number;
    name: string;
  };
  display_name?: string;
  name?: string;
  full_name?: string;
  email: string;
  avatar_url?: string;
  role: 'student' | 'tutor';
  joined_at: string;
}

/**
 * Get participant user info for a classroom
 * @param classroomSlug - The classroom slug
 */
export function useParticipantsInfo(classroomSlug: string | undefined) {
  return useQuery<ParticipantInfo[]>({
    queryKey: ["classroom", classroomSlug, "participants-info"],
    queryFn: () => apiGet<ParticipantInfo[]>(`/api/classroom/${classroomSlug}/members`),
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}
