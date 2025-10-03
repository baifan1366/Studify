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
 * Extended permissions interface - supports separate audio and video control
 */
interface ParticipantPermission {
  participantId: string;
  participantName: string;
  role: 'host' | 'participant';
  canPublishAudio: boolean;  // ✅ Separate: audio publish permission
  canPublishVideo: boolean;  // ✅ Separate: video publish permission
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateMetadata: boolean;
  canRecord: boolean;
  hidden: boolean;
}

/**
 * Batch update interface
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
  onBatchPermissionUpdate?: (update: BatchPermissionUpdate) => void;  // ✅ New: batch update
}

/**
 * ✅ Completely refactored permission manager - single data source, no local state
 * 
 * Improvements:
 * 1. Remove local state - use useMemo to derive data from props
 * 2. All operations only triggered via props callbacks, waiting for parent component updates
 * 3. Implement true batch updates
 * 4. Separate audio and video permission control
 * 5. Improve UI feedback, clearly display status and operations
 */
export default function PermissionManager({
  sessionId,
  userRole,
  participants,
  onPermissionUpdate,
  onBatchPermissionUpdate
}: PermissionManagerProps) {
  
  // ✅ Use useMemo to derive permission data from props - single data source
  const permissionsMap = useMemo(() => {
    const map: Record<string, ParticipantPermission> = {};
    
    participants.forEach(participant => {
      const isHost = participant.metadata?.role === 'tutor' || participant.permissions?.roomAdmin;
      
      map[participant.identity] = {
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        role: isHost ? 'host' : 'participant',
        // ✅ Separate audio and video permissions
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

  // ✅ Permission update - only call prop callback, don't modify local state
  const updatePermission = (participantId: string, updates: Partial<ParticipantPermission>) => {
    if (userRole !== 'tutor') {
      toast.error('Only tutors can modify permissions');
      return;
    }

    // 💡 Show processing feedback
    toast.info('Updating permissions...');
    
    // ✅ Only notify parent component via prop, wait for props update to refresh UI
    onPermissionUpdate(participantId, updates);
  };

  // ✅ Batch update - use dedicated batch update function
  const batchUpdatePermissions = (participantIds: string[], updates: Partial<ParticipantPermission>) => {
    if (userRole !== 'tutor') {
      toast.error('Only tutors can modify permissions');
      return;
    }

    toast.info(`Updating permissions for ${participantIds.length} participants...`);

    if (onBatchPermissionUpdate) {
      // ✅ Use batch update API - only send one request
      onBatchPermissionUpdate({
        participantIds,
        permissions: updates
      });
    } else {
      // ⚠️ Fallback: if no batch update API, update individually
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

  // ✅ Improved: mute/unmute (audio only)
  const muteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublishAudio: false });
  };

  const unmuteParticipant = (participantId: string) => {
    updatePermission(participantId, { canPublishAudio: true });
  };

  // ✅ New: disable/enable camera (video only)
  const disableVideo = (participantId: string) => {
    updatePermission(participantId, { canPublishVideo: false });
  };

  const enableVideo = (participantId: string) => {
    updatePermission(participantId, { canPublishVideo: true });
  };

  // ✅ Batch operations - use batch update API
  const muteAllStudents = () => {
    const studentIds = Object.values(permissionsMap)
      .filter(p => p.role !== 'host')
      .map(p => p.participantId);
    
    if (studentIds.length === 0) {
      toast.info('No students to mute');
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
      toast.info('No student cameras to disable');
      return;
    }

    batchUpdatePermissions(studentIds, { canPublishVideo: false });
  };

  if (userRole !== 'tutor') {
    return null; // Students don't see permission management interface
  }

  return (
    <div className="space-y-4">
      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Permission Management</span>
            <Badge variant="outline" className="ml-2">
              {Object.keys(permissionsMap).length} Participants
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={muteAllStudents}
                className="gap-2"
              >
                <MicOff className="h-4 w-4" />
                Mute All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={unmuteAll}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                Unmute All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={disableAllStudentVideos}
                className="gap-2"
              >
                <VideoOff className="h-4 w-4" />
                Disable Student Cameras
              </Button>
            </div>

            {/* Participants List */}
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
 * ✅ Improved participant permission card - clear status display and operations
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
                {participant.role === 'host' ? 'Host' : 'Participant'}
              </Badge>
              {/* ✅ Audio status */}
              {participant.canPublishAudio ? (
                <Badge variant="outline" className="text-green-600">
                  <Mic className="h-3 w-3 mr-1" />
                  Can Speak
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <MicOff className="h-3 w-3 mr-1" />
                  Muted
                </Badge>
              )}
              {/* ✅ Video status */}
              {participant.canPublishVideo ? (
                <Badge variant="outline" className="text-green-600">
                  <Video className="h-3 w-3 mr-1" />
                  Camera On
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <VideoOff className="h-3 w-3 mr-1" />
                  Camera Off
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* ✅ Improved: clearly display current status and operations to be performed */}
          {participant.canPublishAudio ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onMute}
              title="Mute"
              className="gap-1"
            >
              <MicOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onUnmute}
              title="Unmute"
              className="gap-1"
            >
              <Mic className="h-4 w-4 text-green-600" />
            </Button>
          )}

          {/* ✅ New: video control buttons */}
          {participant.canPublishVideo ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDisableVideo}
              title="Disable Camera"
              className="gap-1"
            >
              <VideoOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onEnableVideo}
              title="Enable Camera"
              className="gap-1"
            >
              <Video className="h-4 w-4 text-green-600" />
            </Button>
          )}

          {/* Role Selection */}
          <Select
            value={participant.role}
            onValueChange={(value: 'host' | 'participant') => onRoleChange(value)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="participant">Participant</SelectItem>
            </SelectContent>
          </Select>

          {/* Detailed Settings */}
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {participant.participantName}'s Permission Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <PermissionToggle
                  label="Publish Audio"
                  description="Allow microphone access"
                  icon={<Mic className="h-4 w-4" />}
                  checked={participant.canPublishAudio}
                  onToggle={() => onPermissionToggle('canPublishAudio')}
                />
                <PermissionToggle
                  label="Publish Video"
                  description="Allow camera access"
                  icon={<Video className="h-4 w-4" />}
                  checked={participant.canPublishVideo}
                  onToggle={() => onPermissionToggle('canPublishVideo')}
                />
                <PermissionToggle
                  label="Subscribe Content"
                  description="Allow viewing others' audio and video"
                  icon={<Users className="h-4 w-4" />}
                  checked={participant.canSubscribe}
                  onToggle={() => onPermissionToggle('canSubscribe')}
                />
                <PermissionToggle
                  label="Send Data"
                  description="Allow sending chat messages and data"
                  icon={<Share className="h-4 w-4" />}
                  checked={participant.canPublishData}
                  onToggle={() => onPermissionToggle('canPublishData')}
                />
                <PermissionToggle
                  label="Recording Permission"
                  description="Allow recording classroom content"
                  icon={<Video className="h-4 w-4" />}
                  checked={participant.canRecord}
                  onToggle={() => onPermissionToggle('canRecord')}
                />
                <PermissionToggle
                  label="Hide Participant"
                  description="Hide in participants list"
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

// Import React to avoid compilation errors
import React from 'react';
