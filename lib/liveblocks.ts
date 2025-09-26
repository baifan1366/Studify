import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { LiveMap, LiveList } from "@liveblocks/client";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
  throttle: 16,
});

// 定义房间状态类型
type Presence = {
  cursor: { x: number; y: number } | null;
  userName: string;
  userAvatar: string;
  userRole: 'student' | 'tutor';
  isDrawing?: boolean;
};

type Storage = {
  shapes: LiveMap<string, {
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
  // 聊天消息
  messages: LiveList<{
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    type: 'text' | 'system' | 'reaction';
  }>;
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar: string;
    role: 'student' | 'tutor';
  };
};

type RoomEvent = 
  | { type: 'DRAWING_START'; data: { x: number; y: number } }
  | { type: 'DRAWING_END'; data: { shapeId: string } }
  | { type: 'CHAT_MESSAGE'; data: { message: string } }
  | { type: 'USER_REACTION'; data: { emoji: string; x: number; y: number } }
  | { type: 'CLEAR_CANVAS'; data: {} };

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useOthers,
    useBroadcastEvent,
    useEventListener,
    useStorage,
    useMutation,
    useHistory,
    useCanUndo,
    useCanRedo,
    useUndo,
    useRedo,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export { client };

// 房间ID生成工具
export const generateRoomId = (classroomSlug: string, type: 'whiteboard' | 'chat' | 'document', sessionId?: string) => {
  const base = `classroom:${classroomSlug}`;
  if (sessionId) {
    return `${base}:${type}:${sessionId}`;
  }
  return `${base}:${type}`;
};

// 颜色主题
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
