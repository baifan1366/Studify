'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Shield, Users, Mic, MicOff, Video, VideoOff, Share, Crown } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 扩展的权限接口 - 支持分别控制音频和视频
 */
interface ParticipantPermission {
  participantId: string;
  participantName: string;
  role: 'host' | 'participant';
  canPublishAudio: boolean;  // ✅ 分离：音频发布权限
  canPublishVideo: boolean;  // ✅ 分离：视频发布权限
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateMetadata: boolean;
  canRecord: boolean;
  hidden: boolean;
}

/**
 * 批量更新接口
 */
interface BatchPermissionUpdate {
  participantIds: string[];
  permissions: Partial<Omit<ParticipantPermission, 'participantId' | 'participantName'>>;
}

interface PermissionManagerProps {
  sessionId: string;
  userRole: 'student' | 'tutor';
  participants: any[];
  onPermissionUpdate: (participantId: string, permissions: Partial<ParticipantPermission>) => void;
  onBatchPermissionUpdate?: (update: BatchPermissionUpdate) => void;  // ✅ 新增：批量更新
}

/**
 * ✅ 完全重构的权限管理器 - 单一数据源，无本地状态
 * 
 * 改进：
 * 1. 移除本地 state - 使用 useMemo 从 props 派生数据
 * 2. 所有操作只通过 props 回调触发，等待父组件更新
 * 3. 实现真正的批量更新
 * 4. 分离音频和视频权限控制
 * 5. 改进 UI 反馈，清晰显示状态和操作
 */
export default function PermissionManager({
  sessionId,
  userRole,
  participants,
  onPermissionUpdate,
  onBatchPermissionUpdate
}: PermissionManagerProps) {
  
  // ✅ 使用 useMemo 从 props 派生权限数据 - 单一数据源
  const permissionsMap = useMemo(() => {
    const map: Record<string, ParticipantPermission> = {};
    
    participants.forEach(participant => {
      const isHost = participant.metadata?.role === 'tutor' || participant.permissions?.roomAdmin;
      
      map[participant.identity] = {
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        role: isHost ? 'host' : 'participant',
        // ✅ 分离音频和视频权限
        canPublishAudio: participant.permissions?.canPublishAudio ?? true,
        canPublishVideo: participant.permissions?.canPublishVideo ?? true,
        canSubscribe: participant.permissions?.canSubscribe ?? true,
        canPublishData: participant.permissions?.canPublishData ?? true,
        canUpdateMetadata: participant.permissions?.canUpdateMetadata ?? true,
        canRecord: participant.permissions?.canRecord ?? isHost,
        hidden: participant.permissions?.hidden ?? false,
      };
    });

    return map;
  }, [participants]);

  // ✅ 权限更新 - 只调用 prop 回调，不修改本地状态
  const updatePermission = (participantId: string, updates: Partial<ParticipantPermission>) => {
    if (userRole !== 'tutor') {
      toast.error('只有导师可以修改权限');
      return;
    }

    // 💡 显示正在处理的反馈
    toast.info('正在更新权限...');
    
    // ✅ 只通过 prop 通知父组件，等待 props 更新来刷新 UI
    onPermissionUpdate(participantId, updates);
  };

  // ✅ 批量更新 - 使用专门的批量更新函数
  const batchUpdatePermissions = (participantIds: string[], updates: Partial<ParticipantPermission>) => {
    if (userRole !== 'tutor') {
      toast.error('只有导师可以修改权限');
      return;
    }

    toast.info(`正在更新 ${participantIds.length} 位参与者的权限...`);

    if (onBatchPermissionUpdate) {
      // ✅ 使用批量更新 API - 只发送一次请求
      onBatchPermissionUpdate({
        participantIds,
        permissions: updates
      });
    } else {
      // ⚠️ 降级方案：如果没有批量更新 API，逐个更新
      console.warn('⚠️ No batch update API available, falling back to individual updates');
      participantIds.forEach(id => onPermissionUpdate(id, updates));
    }
  };

  const togglePermission = (participantId: string, permission: keyof ParticipantPermission) => {
    const currentValue = permissionsMap[participantId]?.[permission];
    if (typeof currentValue === 'boolean') {
      updatePermission(participantId, { [permission]: !currentValue });
    }
  };

  const setParticipantRole = (participantId: string, role: 'host' | 'participant') => {
    const rolePermissions = role === 'host' ? {
      role,
      canPublishAudio: true,
      canPublishVideo: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateMetadata: true,
      canRecord: true,
      hidden: false,
    } : {
      role,
      canPublishAudio: true,
      canPublishVideo: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateMetadata: true,
      canRecord: false,
      hidden: false,
    };

    updatePermission(participantId, rolePermissions);
  };

  // ✅ 改进：静音/解除静音（仅音频）
  const muteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublishAudio: false });
  };

  const unmuteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublishAudio: true });
  };

  // ✅ 新增：关闭/开启摄像头（仅视频）
  const disableVideo = (participantId: string) => {
    updatePermission(participantId, { canPublishVideo: false });
  };

  const enableVideo = (participantId: string) => {
    updatePermission(participantId, { canPublishVideo: true });
  };

  // ✅ 批量操作 - 使用批量更新 API
  const muteAllStudents = () => {
    const studentIds = Object.values(permissionsMap)
      .filter(p => p.role !== 'host')
      .map(p => p.participantId);
    
    if (studentIds.length === 0) {
      toast.info('没有可静音的学生');
      return;
    }

    batchUpdatePermissions(studentIds, { canPublishAudio: false });
  };

  const unmuteAll = () => {
    const allIds = Object.keys(permissionsMap);
    batchUpdatePermissions(allIds, { canPublishAudio: true });
  };

  const disableAllStudentVideos = () => {
    const studentIds = Object.values(permissionsMap)
      .filter(p => p.role !== 'host')
      .map(p => p.participantId);
    
    if (studentIds.length === 0) {
      toast.info('没有可关闭的学生摄像头');
      return;
    }

    batchUpdatePermissions(studentIds, { canPublishVideo: false });
  };

  if (userRole !== 'tutor') {
    return null; // 学生不显示权限管理界面
  }

  return (
    <div className="space-y-4">
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>权限管理</span>
            <Badge variant="outline" className="ml-2">
              {Object.keys(permissionsMap).length} 位参与者
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 快速操作 */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={muteAllStudents}
                className="gap-2"
              >
                <MicOff className="h-4 w-4" />
                全体静音
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={unmuteAll}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                解除静音
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={disableAllStudentVideos}
                className="gap-2"
              >
                <VideoOff className="h-4 w-4" />
                关闭学生摄像头
              </Button>
            </div>

            {/* 参与者列表 */}
            <div className="space-y-2">
              {Object.values(permissionsMap).map((participant) => (
                <ParticipantPermissionCard
                  key={participant.participantId}
                  participant={participant}
                  onPermissionToggle={(permission) => 
                    togglePermission(participant.participantId, permission)
                  }
                  onRoleChange={(role) => 
                    setParticipantRole(participant.participantId, role)
                  }
                  onMute={() => muteParticipant(participant.participantId)}
                  onUnmute={() => unmuteParticipant(participant.participantId)}
                  onDisableVideo={() => disableVideo(participant.participantId)}
                  onEnableVideo={() => enableVideo(participant.participantId)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ParticipantPermissionCardProps {
  participant: ParticipantPermission;
  onPermissionToggle: (permission: keyof ParticipantPermission) => void;
  onRoleChange: (role: 'host' | 'participant') => void;
  onMute: () => void;
  onUnmute: () => void;
  onDisableVideo: () => void;
  onEnableVideo: () => void;
}

/**
 * ✅ 改进的参与者权限卡片 - 清晰的状态显示和操作
 */
function ParticipantPermissionCard({
  participant,
  onPermissionToggle,
  onRoleChange,
  onMute,
  onUnmute,
  onDisableVideo,
  onEnableVideo
}: ParticipantPermissionCardProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {participant.participantName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{participant.participantName}</span>
              {participant.role === 'host' && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant={participant.role === 'host' ? 'default' : 'secondary'}>
                {participant.role === 'host' ? '主持人' : '参与者'}
              </Badge>
              {/* ✅ 音频状态 */}
              {participant.canPublishAudio ? (
                <Badge variant="outline" className="text-green-600">
                  <Mic className="h-3 w-3 mr-1" />
                  可发言
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <MicOff className="h-3 w-3 mr-1" />
                  已静音
                </Badge>
              )}
              {/* ✅ 视频状态 */}
              {participant.canPublishVideo ? (
                <Badge variant="outline" className="text-green-600">
                  <Video className="h-3 w-3 mr-1" />
                  摄像头开启
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <VideoOff className="h-3 w-3 mr-1" />
                  摄像头关闭
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* ✅ 改进：清晰显示当前状态和将要执行的操作 */}
          {participant.canPublishAudio ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onMute}
              title="静音"
              className="gap-1"
            >
              <MicOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onUnmute}
              title="解除静音"
              className="gap-1"
            >
              <Mic className="h-4 w-4 text-green-600" />
            </Button>
          )}

          {/* ✅ 新增：视频控制按钮 */}
          {participant.canPublishVideo ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDisableVideo}
              title="关闭摄像头"
              className="gap-1"
            >
              <VideoOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onEnableVideo}
              title="开启摄像头"
              className="gap-1"
            >
              <Video className="h-4 w-4 text-green-600" />
            </Button>
          )}

          {/* 角色选择 */}
          <Select
            value={participant.role}
            onValueChange={(value: 'host' | 'participant') => onRoleChange(value)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">主持人</SelectItem>
              <SelectItem value="participant">参与者</SelectItem>
            </SelectContent>
          </Select>

          {/* 详细设置 */}
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {participant.participantName} 的权限设置
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <PermissionToggle
                  label="发布音频"
                  description="允许开启麦克风"
                  icon={<Mic className="h-4 w-4" />}
                  checked={participant.canPublishAudio}
                  onToggle={() => onPermissionToggle('canPublishAudio')}
                />
                <PermissionToggle
                  label="发布视频"
                  description="允许开启摄像头"
                  icon={<Video className="h-4 w-4" />}
                  checked={participant.canPublishVideo}
                  onToggle={() => onPermissionToggle('canPublishVideo')}
                />
                <PermissionToggle
                  label="订阅内容"
                  description="允许观看其他人的音视频"
                  icon={<Users className="h-4 w-4" />}
                  checked={participant.canSubscribe}
                  onToggle={() => onPermissionToggle('canSubscribe')}
                />
                <PermissionToggle
                  label="发送数据"
                  description="允许发送聊天消息和数据"
                  icon={<Share className="h-4 w-4" />}
                  checked={participant.canPublishData}
                  onToggle={() => onPermissionToggle('canPublishData')}
                />
                <PermissionToggle
                  label="录制权限"
                  description="允许录制课堂内容"
                  icon={<Video className="h-4 w-4" />}
                  checked={participant.canRecord}
                  onToggle={() => onPermissionToggle('canRecord')}
                />
                <PermissionToggle
                  label="隐藏参与者"
                  description="在参与者列表中隐藏"
                  icon={<Users className="h-4 w-4" />}
                  checked={participant.hidden}
                  onToggle={() => onPermissionToggle('hidden')}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}

interface PermissionToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
}

function PermissionToggle({
  label,
  description,
  icon,
  checked,
  onToggle
}: PermissionToggleProps) {
  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}

// 为了避免编译错误，需要导入 React
import React from 'react';
