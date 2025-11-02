import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Liveblocks client configuration
const client = createClient({
  authEndpoint: async (room) => {
    console.log("🔐 [Liveblocks] Requesting auth for room:", room);

    // Use the simpler auth endpoint that handles authentication internally
    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ [Liveblocks] Auth failed:", error);
      throw new Error(error.error || "Authentication failed");
    }

    const data = await response.json();
    console.log("✅ [Liveblocks] Auth successful");
    return data;
  },
  throttle: 100,
});

// Type definitions for Liveblocks storage
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedTool?: string | null;
  currentTool?: string | null;
  userName?: string;
  userAvatar?: string;
  userRole?: "student" | "tutor" | "owner";
  isDrawing?: boolean;
  selection?: any;
  userColor?: string;
};

type Storage = {
  drawings: any[]; // Will be defined more specifically based on drawing data structure
  messages?: any[]; // Chat messages for collaborative chat
  shapes?: any; // Whiteboard shapes for collaborative drawing (LiveMap)
  whiteboardTextBoxes?: any; // Text boxes for whiteboard
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
    role: "student" | "tutor" | "owner";
  };
};

export type RoomEvent = {
  type:
    | "DRAWING_ADDED"
    | "DRAWING_UPDATED"
    | "DRAWING_DELETED"
    | "CANVAS_CLEARED"
    | "CHAT_MESSAGE"
    | "USER_REACTION"
    | "DRAWING_START"
    | "DRAWING_END"
    | "CLEAR_CANVAS";
  data: any;
};

// Create typed hooks for Liveblocks
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export { client };

// Helper function to generate consistent room IDs
export function generateRoomId(
  classroomSlug: string,
  type: string,
  sessionId?: string
): string {
  const parts = [classroomSlug, type];
  if (sessionId) {
    parts.push(sessionId);
  }
  return parts.join(":");
}

// Whiteboard tool types
export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'select';

// Color palette for whiteboard
export const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
];

// Initial storage for Liveblocks rooms
export const initialStorage = {
  drawings: [],
  messages: [],
  shapes: {},
  whiteboardTextBoxes: {},
};
