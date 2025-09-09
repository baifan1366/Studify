// lib/livekit/token-service.ts
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export interface LiveKitTokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  role: 'host' | 'participant';
  metadata?: string;
  ttl?: number; // Token 有效期（秒），默认 1 小时
}

export interface LiveKitRoomOptions {
  roomName: string;
  maxParticipants?: number;
  emptyTimeout?: number; // 房间空闲超时（秒）
  metadata?: string;
}

class LiveKitTokenService {
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;
  private roomService: RoomServiceClient;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY!;
    this.apiSecret = process.env.LIVEKIT_API_SECRET!;
    this.wsUrl = process.env.LIVEKIT_URL!;

    if (!this.apiKey || !this.apiSecret || !this.wsUrl) {
      throw new Error('LiveKit credentials not configured');
    }

    this.roomService = new RoomServiceClient(this.wsUrl, this.apiKey, this.apiSecret);
  }

  /**
   * 生成 LiveKit 访问令牌
   */
  async generateAccessToken(options: LiveKitTokenOptions): Promise<string> {
    const {
      roomName,
      participantName,
      participantIdentity,
      role,
      metadata,
      ttl = 3600 // 默认 1 小时
    } = options;

    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantIdentity,
      name: participantName,
      metadata,
      ttl
    });

    // 根据角色设置权限
    if (role === 'host') {
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
        roomAdmin: true, // 主持人可以管理房间
        roomRecord: true, // 主持人可以录制
      });
    } else {
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      });
    }

    return await token.toJwt();
  }

  /**
   * 创建或获取房间
   */
  async createRoom(options: LiveKitRoomOptions): Promise<any> {
    const {
      roomName,
      maxParticipants = 50,
      emptyTimeout = 300, // 5 分钟
      metadata
    } = options;

    try {
      // 检查房间是否已存在
      const existingRoom = await this.roomService.listRooms([roomName]);
      if (existingRoom.length > 0) {
        return existingRoom[0];
      }

      // 创建新房间
      const room = await this.roomService.createRoom({
        name: roomName,
        maxParticipants,
        emptyTimeout,
        metadata
      });

      return room;
    } catch (error) {
      console.error('Failed to create/get room:', error);
      throw error;
    }
  }

  /**
   * 删除房间
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
    } catch (error) {
      console.error('Failed to delete room:', error);
      throw error;
    }
  }

  /**
   * 获取房间信息
   */
  async getRoomInfo(roomName: string): Promise<any> {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      console.error('Failed to get room info:', error);
      throw error;
    }
  }

  /**
   * 获取房间参与者列表
   */
  async getRoomParticipants(roomName: string): Promise<any[]> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Failed to get room participants:', error);
      throw error;
    }
  }

  /**
   * 移除参与者
   */
  async removeParticipant(roomName: string, participantIdentity: string): Promise<void> {
    try {
      await this.roomService.removeParticipant(roomName, participantIdentity);
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw error;
    }
  }
}

// 单例模式
export const liveKitTokenService = new LiveKitTokenService();
