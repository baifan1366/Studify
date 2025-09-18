'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Shield, Users, Mic, Video, Share, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface ParticipantPermission {
  participantId: string;
  participantName: string;
  role: 'host' | 'participant';
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateMetadata: boolean;
  canRecord: boolean;
  hidden: boolean;
}

interface PermissionManagerProps {
  sessionId: string;
  userRole: 'student' | 'tutor';
  participants: any[];
  onPermissionUpdate: (participantId: string, permissions: Partial<ParticipantPermission>) => void;
}

export default function PermissionManager({
  sessionId,
  userRole,
  participants,
  onPermissionUpdate
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<Record<string, ParticipantPermission>>({});
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  // 初始化权限设置
  useEffect(() => {
    const initialPermissions: Record<string, ParticipantPermission> = {};
    
    participants.forEach(participant => {
      const isHost = participant.metadata?.role === 'tutor' || participant.permissions?.roomAdmin;
      
      initialPermissions[participant.identity] = {
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        role: isHost ? 'host' : 'participant',
        canPublish: participant.permissions?.canPublish ?? true,
        canSubscribe: participant.permissions?.canSubscribe ?? true,
        canPublishData: participant.permissions?.canPublishData ?? true,
        canUpdateMetadata: participant.permissions?.canUpdateMetadata ?? true,
        canRecord: participant.permissions?.canRecord ?? isHost,
        hidden: participant.permissions?.hidden ?? false,
      };
    });

    setPermissions(initialPermissions);
  }, [participants]);

  const updatePermission = async (participantId: string, updates: Partial<ParticipantPermission>) => {
    if (userRole !== 'tutor') {
      toast.error('只有导师可以修改权限');
      return;
    }

    try {
      const updatedPermissions = {
        ...permissions[participantId],
        ...updates
      };

      setPermissions(prev => ({
        ...prev,
        [participantId]: updatedPermissions
      }));

      // 调用父组件的权限更新函数
      onPermissionUpdate(participantId, updates);
      
      toast.success('权限已更新');
    } catch (error) {
      toast.error('权限更新失败');
    }
  };

  const togglePermission = (participantId: string, permission: keyof ParticipantPermission) => {
    const currentValue = permissions[participantId]?.[permission];
    if (typeof currentValue === 'boolean') {
      updatePermission(participantId, { [permission]: !currentValue });
    }
  };

  const setParticipantRole = (participantId: string, role: 'host' | 'participant') => {
    const rolePermissions = role === 'host' ? {
      role,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateMetadata: true,
      canRecord: true,
      hidden: false,
    } : {
      role,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateMetadata: true,
      canRecord: false,
      hidden: false,
    };

    updatePermission(participantId, rolePermissions);
  };

  const muteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublish: false });
  };

  const unmuteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublish: true });
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 快速操作 */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  Object.keys(permissions).forEach(participantId => {
                    if (permissions[participantId].role !== 'host') {
                      updatePermission(participantId, { canPublish: false });
                    }
                  });
                }}
              >
                全体静音
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  Object.keys(permissions).forEach(participantId => {
                    updatePermission(participantId, { canPublish: true });
                  });
                }}
              >
                解除静音
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  Object.keys(permissions).forEach(participantId => {
                    if (permissions[participantId].role !== 'host') {
                      updatePermission(participantId, { canPublish: false });
                    }
                  });
                }}
              >
                关闭学生摄像头
              </Button>
            </div>

            {/* 参与者列表 */}
            <div className="space-y-2">
              {Object.values(permissions).map((participant) => (
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
}

function ParticipantPermissionCard({
  participant,
  onPermissionToggle,
  onRoleChange,
  onMute,
  onUnmute
}: ParticipantPermissionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

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
              {participant.canPublish ? (
                <Badge variant="outline" className="text-green-600">
                  <Mic className="h-3 w-3 mr-1" />
                  可发言
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <Mic className="h-3 w-3 mr-1" />
                  已静音
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 快速操作按钮 */}
          {participant.canPublish ? (
            <Button size="sm" variant="outline" onClick={onMute}>
              <Mic className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onUnmute}>
              <Mic className="h-4 w-4" />
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
                  label="发布音视频"
                  description="允许开启麦克风和摄像头"
                  icon={<Video className="h-4 w-4" />}
                  checked={participant.canPublish}
                  onToggle={() => onPermissionToggle('canPublish')}
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
