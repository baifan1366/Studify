/**
 * Liveblocks 配置和客户端
 * 
 * 用于实时协作功能：
 * - 白板多人协作
 * - 文档共同编辑
 * - 实时光标和选择
 * - 聊天和评论
 */

import { createClient, LiveMap, LiveList, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: '/api/liveblocks-auth',
  throttle: 16, // 60fps
  lostConnectionTimeout: 10000, // 10秒
  backgroundKeepAliveTimeout: 30000, // 30秒
});

// ============================================
// 类型定义
// ============================================

// Presence 类型（每个用户的临时状态）
export type Presence = {
  cursor: { x: number; y: number } | null;
  selection: { start: number; end: number } | null;
  currentTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  userName: string;
  userAvatar?: string;
  userColor: string;
  userRole?: 'student' | 'tutor';
  isDrawing?: boolean;
};

// Storage 类型（持久化数据）
export type Storage = {
  // 白板绘制数据
  whiteboardStrokes?: LiveList<{
    id: string;
    tool: 'pen' | 'eraser' | 'rectangle' | 'circle';
    points: number[];
    color: string;
    width: number;
    timestamp: number;
  }>;
  
  // 文本框数据
  whiteboardTextBoxes?: LiveList<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    timestamp: number;
  }>;
  
  // 形状数据（兼容旧版）
  shapes?: LiveMap<string, {
    id: string;
    type: 'rectangle' | 'circle' | 'line' | 'path';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: { x: number; y: number }[];
    fill: string;
    stroke: string;
    strokeWidth: number;
    userId: string;
    timestamp: number;
  }>;
  
  // 文档编辑数据
  documentContent?: LiveObject<{
    content: string;
    version: number;
    lastModified: string;
  }>;
  
  // 聊天消息
  messages?: LiveList<{
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    type: 'text' | 'system' | 'reaction';
  }>;
  
  // 评论数据
  comments?: LiveList<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    position: { x: number; y: number };
    timestamp: number;
    resolved: boolean;
  }>;
};

// UserMeta 类型（用户元数据）
export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
    color: string;
    role?: 'student' | 'tutor';
  };
};

// Room Event 类型
export type RoomEvent = 
  | { type: 'DRAWING_START'; data: { x: number; y: number } }
  | { type: 'DRAWING_END'; data: { shapeId: string } }
  | { type: 'CHAT_MESSAGE'; data: { message: string } }
  | { type: 'USER_REACTION'; data: { emoji: string; x: number; y: number } }
  | { type: 'CLEAR_CANVAS'; data: {} };

// ============================================
// React Hooks 导出
// ============================================

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useSelf,
    useBroadcastEvent,
    useEventListener,
    useStorage,
    useMutation,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useErrorListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export { client };
export { client as liveblocksClient };

// ============================================
// 工具函数
// ============================================

// 房间ID生成工具
export const generateRoomId = (classroomSlug: string, type: 'whiteboard' | 'chat' | 'document', sessionId?: string) => {
  const base = `classroom:${classroomSlug}`;
  if (sessionId) {
    return `${base}:${type}:${sessionId}`;
  }
  return `${base}:${type}`;
};

// 用户颜色（用于协作光标）
const USER_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD',
  '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
  '#4DB6AC', '#81C784', '#AED581', '#DCE775',
  '#FFD54F', '#FFB74D', '#FF8A65', '#A1887F',
];

export function getUserColor(userId: string): string {
  // 基于 userId 生成一致的颜色
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// 绘图颜色主题
export const COLORS = [
  '#000000', // 黑色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 品红
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#FFC0CB', // 粉色
];

// 工具类型
export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'select';

// 初始化存储
export const initialStorage: Storage = {
  shapes: new LiveMap<string, {
    id: string;
    type: 'rectangle' | 'circle' | 'line' | 'path';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: { x: number; y: number }[];
    fill: string;
    stroke: string;
    strokeWidth: number;
    userId: string;
    timestamp: number;
  }>(),
  messages: new LiveList<{
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    type: 'text' | 'system' | 'reaction';
  }>([]),
};
