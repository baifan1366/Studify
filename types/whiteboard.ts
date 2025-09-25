export interface WhiteboardSession {
  id: number;
  public_id: string;
  session_id: number;
  title: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface WhiteboardEvent {
  id: number;
  public_id: string;
  wb_id: number;
  actor_id: number;
  kind: WhiteboardEventKind;
  payload: WhiteboardEventPayload;
  created_at: string;
}

export type WhiteboardEventKind = 
  | 'draw_start'
  | 'draw_move' 
  | 'draw_end'
  | 'shape_create'
  | 'shape_update'
  | 'shape_delete'
  | 'text_create'
  | 'text_update'
  | 'text_delete'
  | 'clear_canvas'
  | 'undo'
  | 'redo'
  | 'cursor_move'
  | 'user_join'
  | 'user_leave';

export interface WhiteboardEventPayload {
  // Drawing events
  id?: string;
  point?: { x: number; y: number };
  points?: { x: number; y: number }[];
  color?: string;
  width?: number;
  tool?: 'pen' | 'eraser';
  
  // Shape events
  shape?: {
    type: 'rectangle' | 'circle' | 'line' | 'arrow';
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: {
      color: string;
      fillColor?: string;
      strokeWidth: number;
    };
  };
  
  // Text events
  text?: {
    content: string;
    position: { x: number; y: number };
    style: {
      fontSize: number;
      fontFamily: string;
      color: string;
      bold?: boolean;
      italic?: boolean;
    };
  };
  
  // Cursor events
  cursor?: {
    position: { x: number; y: number };
    user_id: number;
    user_name: string;
  };
  
  // User events
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
  
  // Generic data
  [key: string]: any;
}

export interface WhiteboardState {
  paths: DrawingPath[];
  shapes: WhiteboardShape[];
  texts: WhiteboardText[];
  cursors: Map<number, CursorPosition>;
  users: Map<number, WhiteboardUser>;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
  userId: number;
  timestamp: string;
}

export interface WhiteboardShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    color: string;
    fillColor?: string;
    strokeWidth: number;
  };
  userId: number;
  timestamp: string;
}

export interface WhiteboardText {
  id: string;
  content: string;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    bold?: boolean;
    italic?: boolean;
  };
  userId: number;
  timestamp: string;
}

export interface CursorPosition {
  position: { x: number; y: number };
  userId: number;
  userName: string;
  color: string;
  lastUpdate: string;
}

export interface WhiteboardUser {
  id: number;
  name: string;
  avatar?: string;
  color: string;
  isActive: boolean;
  lastSeen: string;
}

export interface WhiteboardTool {
  type: 'pen' | 'eraser' | 'text' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'select';
  color: string;
  width: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface WhiteboardPermissions {
  canDraw: boolean;
  canErase: boolean;
  canAddText: boolean;
  canAddShapes: boolean;
  canClear: boolean;
  canManage: boolean;
}

// API Request/Response types
export interface CreateWhiteboardRequest {
  session_id: string;
  title?: string;
}

export interface UpdateWhiteboardRequest {
  title?: string;
}

export interface CreateWhiteboardEventRequest {
  kind: WhiteboardEventKind;
  payload: WhiteboardEventPayload;
}

export interface WhiteboardEventResponse extends WhiteboardEvent {
  profiles?: {
    id: number;
    display_name: string;
    avatar_url?: string;
  };
}

export interface WhiteboardSessionResponse extends WhiteboardSession {
  classroom_live_session?: {
    id: number;
    session_name: string;
    status: string;
    classroom_id: number;
  };
}
