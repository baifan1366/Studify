// interface/livekit/token-interface.ts

export interface LiveKitTokenRequest {
  participantName?: string;
  metadata?: string;
}

export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  role: 'host' | 'participant';
  wsUrl: string;
}

export interface LiveKitRoomInfo {
  name: string;
  numParticipants: number;
  maxParticipants: number;
  creationTime: number;
  turnPassword: string;
  enabledCodecs: any[];
  metadata: string;
  numPublishers: number;
  activeRecording: boolean;
}

export interface LiveKitParticipant {
  sid: string;
  identity: string;
  name: string;
  state: 'JOINING' | 'JOINED' | 'ACTIVE' | 'DISCONNECTED';
  tracks: LiveKitTrackInfo[];
  metadata: string;
  joinedAt: number;
  permission: {
    canSubscribe: boolean;
    canPublish: boolean;
    canPublishData: boolean;
    canUpdateMetadata: boolean;
    hidden: boolean;
    recorder: boolean;
  };
}

export interface LiveKitTrackInfo {
  sid: string;
  type: 'AUDIO' | 'VIDEO' | 'DATA';
  name: string;
  muted: boolean;
  width: number;
  height: number;
  simulcast: boolean;
  disableDtx: boolean;
  source: 'CAMERA' | 'MICROPHONE' | 'SCREEN_SHARE' | 'SCREEN_SHARE_AUDIO' | 'UNKNOWN';
}

export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  classroomId?: string;
  sessionId?: string;
  role?: 'host' | 'participant';
  error?: string;
}

export interface TokenSecurityOptions {
  maxTokensPerUser?: number;
  rateLimitWindow?: number;
  allowedOrigins?: string[];
  requireHttps?: boolean;
}

export interface TokenStats {
  totalTokensGenerated: number;
  activeTokens: number;
  revokedTokens: number;
  timeRange: number;
  timestamp: number;
}
