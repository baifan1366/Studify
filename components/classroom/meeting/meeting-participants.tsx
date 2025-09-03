'use client';

import { useState, useEffect } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Participant, Track } from 'livekit-client';

interface MeetingParticipantsProps {
  meetingId: string;
}

export default function MeetingParticipants({ meetingId }: MeetingParticipantsProps) {
  const participants = useParticipants();
  const [sessionParticipants, setSessionParticipants] = useState<any[]>([]);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/meeting/${meetingId}`);
        if (!response.ok) {
          throw new Error('获取会议信息失败');
        }
        const data = await response.json();
        if (data.session && data.session.participants) {
          setSessionParticipants(data.session.participants);
        }
      } catch (error) {
        console.error('获取会议参与者失败:', error);
      }
    };

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 60000);
    return () => clearInterval(interval);
  }, [meetingId]);

  const getParticipantRole = (identity: string) => {
    const participant = sessionParticipants.find(p => p.user_id === identity);
    return participant?.role || 'student';
  };

  const isAudioEnabled = (participant: Participant) => {
    return participant.audioTracks.size > 0 && 
           !participant.isMicrophoneMuted;
  };

  const isVideoEnabled = (participant: Participant) => {
    return participant.videoTracks.size > 0 && 
           participant.trackPublications.some(pub => 
             pub.kind === Track.Kind.Video && 
             pub.track && 
             !pub.isMuted && 
             pub.trackName !== 'screen'
           );
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-4">参与者 ({participants.length})</h3>
      <div className="space-y-2">
        {participants.map((participant) => {
          const role = getParticipantRole(participant.identity);
          return (
            <div 
              key={participant.identity} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={participant.metadata} />
                  <AvatarFallback>
                    {participant.name?.substring(0, 2) || participant.identity.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {participant.name || participant.identity}
                    {participant.isLocal && <span className="text-xs ml-2">(你)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={role === 'teacher' ? 'default' : 'outline'} className="text-xs">
                      {role === 'teacher' ? '教师' : '学生'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAudioEnabled(participant) ? (
                  <Mic className="h-4 w-4 text-green-500" />
                ) : (
                  <MicOff className="h-4 w-4 text-gray-400" />
                )}
                {isVideoEnabled(participant) ? (
                  <Video className="h-4 w-4 text-green-500" />
                ) : (
                  <VideoOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}