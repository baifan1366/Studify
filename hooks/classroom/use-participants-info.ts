"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-config";
import { useMemo, useRef } from 'react';
import type { Participant } from 'livekit-client';

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
  role: 'student' | 'tutor' | 'owner';
  joined_at: string;
}

/**
 * Get participant user info for a classroom
 * @param classroomSlug - The classroom slug
 */
export function useParticipantsInfo(classroomSlug: string | undefined) {
  return useQuery<ParticipantInfo[]>({
    queryKey: ["classroom", classroomSlug, "participants-info"],
    queryFn: async () => {
      // 🎯 修复：API 返回 { success, members } 格式，需要提取 members
      const response = await apiGet<{ 
        success?: boolean; 
        members?: ParticipantInfo[];
      }>(`/api/classroom/${classroomSlug}/members`);
      
      // 提取 members 数组，如果不存在则返回空数组
      return response.members || [];
    },
    enabled: !!classroomSlug,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}

// ============================================
// Merged Participants Hook
// ============================================

/**
 * 合并参与者接口
 */
export interface MergedParticipant {
  livekitParticipant: Participant;
  sid: string;
  identity: string;
  displayName: string;
  role: 'student' | 'tutor' | 'owner';
  avatarUrl?: string;
  userInfo: ParticipantInfo | null;
}

interface UseMergedParticipantsOptions {
  livekitParticipants: Participant[];
  participantsInfo: ParticipantInfo[];
  enableDebugLogs?: boolean;
}

/**
 * useMergedParticipants Hook
 * 
 * 优化参与者合并逻辑，减少不必要的重渲染和日志输出
 * 
 * 解决的问题：
 * 1. 频繁的控制台日志输出
 * 2. 重复的参与者合并计算
 * 3. 性能问题
 */
export function useMergedParticipants({
  livekitParticipants,
  participantsInfo,
  enableDebugLogs = false,
}: UseMergedParticipantsOptions): MergedParticipant[] {
  
  // 追踪上次参与者状态，避免重复日志
  const lastStateRef = useRef({
    livekitIdentities: '',
    infoCount: 0,
  });

  // 创建参与者信息映射表（O(1) 查找）
  const participantsInfoMap = useMemo(() => {
    const m = new Map<string, ParticipantInfo>();
    
    if (Array.isArray(participantsInfo)) {
      participantsInfo.forEach(info => {
        // LiveKit identity format is 'user-{profile.id}'
        if (info.id) {
          m.set(String(info.id), info);
          m.set(`user-${info.id}`, info);
        }
        // Also map by user_id (UUID format)
        if (info.user_id) {
          m.set(String(info.user_id), info);
        }
      });
    }
    
    const currentState = {
      livekitIdentities: '',
      infoCount: participantsInfo.length,
    };
    
    // 只在状态真正变化时记录日志
    const stateChanged = lastStateRef.current.infoCount !== currentState.infoCount;
    
    if (enableDebugLogs && stateChanged && process.env.NODE_ENV === 'development') {
      console.log('🗺️ Participants info map updated:', {
        totalParticipants: participantsInfo.length,
        mapSize: m.size,
        sampleKeys: Array.from(m.keys()).slice(0, 3),
      });
    }
    
    return m;
  }, [participantsInfo, enableDebugLogs]);

  // 合并 LiveKit 参与者和数据库信息
  const mergedParticipants = useMemo(() => {
    const currentIdentities = livekitParticipants
      .map(p => p.identity)
      .sort()
      .join(',');
    
    const stateChanged = 
      lastStateRef.current.livekitIdentities !== currentIdentities ||
      lastStateRef.current.infoCount !== participantsInfo.length;
    
    // 只在状态变化时记录日志
    if (enableDebugLogs && stateChanged && process.env.NODE_ENV === 'development') {
      console.log('🔄 Merging participants:', {
        livekitCount: livekitParticipants.length,
        identities: livekitParticipants.map(p => p.identity),
        infoMapSize: participantsInfoMap.size,
      });
      
      lastStateRef.current = {
        livekitIdentities: currentIdentities,
        infoCount: participantsInfo.length,
      };
    }
    
    return livekitParticipants.map(p => {
      const idKey = String(p.identity);
      const info = participantsInfoMap.get(idKey) ?? null;

      // 只在找不到信息且是新参与者时警告一次
      if (!info && stateChanged && enableDebugLogs && process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ No database info for participant: ${p.identity}`);
      }

      // 显示名称回退逻辑
      const displayName = 
        info?.display_name || 
        info?.name || 
        info?.full_name || 
        p.name || 
        `User ${p.identity}`;

      // 头像 URL 处理
      let avatarUrl: string | undefined;
      if (info?.avatar_url) {
        if (!info.avatar_url.startsWith('http')) {
          avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${info.avatar_url}`;
        } else {
          avatarUrl = info.avatar_url;
        }
      }

      return {
        livekitParticipant: p,
        sid: p.sid,
        identity: p.identity,
        displayName,
        role: info?.role || 'student',
        avatarUrl,
        userInfo: info,
      };
    });
  }, [livekitParticipants, participantsInfoMap, participantsInfo.length, enableDebugLogs]);

  return mergedParticipants;
}
