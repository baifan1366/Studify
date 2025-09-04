'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  MessageSquare, 
  Settings, 
  Share2,
  Monitor,
  Phone,
  PhoneOff,
  Hand,
  MoreHorizontal
} from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { useLiveSessions } from '@/hooks/classroom/use-create-live-session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface LiveSessionRoomProps {
  classroomSlug: string;
  sessionSlug: string;
}

interface Participant {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'owner' | 'tutor' | 'student';
  isVideoOn: boolean;
  isAudioOn: boolean;
  isHandRaised: boolean;
}

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  timestamp: Date;
  user_role: 'owner' | 'tutor' | 'student';
}

export function LiveSessionRoom({ classroomSlug, sessionSlug }: LiveSessionRoomProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: '1',
      name: 'John Doe',
      role: 'owner',
      isVideoOn: true,
      isAudioOn: true,
      isHandRaised: false
    },
    {
      id: '2',
      name: 'Jane Smith',
      role: 'tutor',
      isVideoOn: false,
      isAudioOn: true,
      isHandRaised: false
    },
    {
      id: '3',
      name: 'Bob Johnson',
      role: 'student',
      isVideoOn: true,
      isAudioOn: false,
      isHandRaised: true
    }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user_name: 'John Doe',
      message: 'Welcome everyone to today\'s session!',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      user_role: 'owner'
    },
    {
      id: '2',
      user_name: 'Jane Smith',
      message: 'Thanks for joining. Let\'s start with the agenda.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      user_role: 'tutor'
    },
    {
      id: '3',
      user_name: 'Bob Johnson',
      message: 'Can you hear me clearly?',
      timestamp: new Date(Date.now() - 1 * 60 * 1000),
      user_role: 'student'
    }
  ]);

  const { data: classroomsData } = useClassrooms();
  const { data: sessionsData } = useLiveSessions(classroom?.id);

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

  useEffect(() => {
    if (sessionsData?.sessions) {
      const foundSession = sessionsData.sessions.find(s => s.slug === sessionSlug);
      setSession(foundSession);
    }
  }, [sessionsData, sessionSlug]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}/live`);
  };

  const handleLeaveSession = () => {
    router.push(`/classroom/${classroomSlug}/live`);
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    toast({
      title: isVideoOn ? "Camera turned off" : "Camera turned on",
      description: `Your camera is now ${isVideoOn ? 'off' : 'on'}`,
    });
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    toast({
      title: isAudioOn ? "Microphone muted" : "Microphone unmuted",
      description: `Your microphone is now ${isAudioOn ? 'muted' : 'unmuted'}`,
    });
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    toast({
      title: isHandRaised ? "Hand lowered" : "Hand raised",
      description: isHandRaised ? "Your hand has been lowered" : "Your hand is raised",
    });
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    toast({
      title: isScreenSharing ? "Screen sharing stopped" : "Screen sharing started",
      description: `Screen sharing is now ${isScreenSharing ? 'off' : 'on'}`,
    });
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user_name: 'You',
      message: chatMessage,
      timestamp: new Date(),
      user_role: 'student' // This would come from user context
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-600';
      case 'tutor':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'tutor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!classroom || !session) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{session.title}</h1>
            <p className="text-sm text-muted-foreground">{classroom.name}</p>
          </div>
          <Badge variant="default" className="bg-red-600">
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowParticipants(!showParticipants)}>
            <Users className="h-4 w-4 mr-2" />
            {participants.length}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleLeaveSession}>
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Main Video */}
          <div className="h-full bg-gray-800 flex items-center justify-center relative">
            <div className="w-full h-full max-w-4xl max-h-3xl bg-gray-700 rounded-lg flex items-center justify-center">
              {isScreenSharing ? (
                <div className="text-white text-center">
                  <Monitor className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg">Screen Sharing Active</p>
                </div>
              ) : (
                <div className="text-white text-center">
                  <Video className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg">Main Video Feed</p>
                  <p className="text-sm text-gray-300">Camera: {isVideoOn ? 'On' : 'Off'}</p>
                </div>
              )}
            </div>

            {/* Participant Videos Grid */}
            <div className="absolute bottom-4 right-4 grid grid-cols-2 gap-2">
              {participants.slice(0, 4).map((participant) => (
                <div
                  key={participant.id}
                  className="w-32 h-24 bg-gray-600 rounded-lg flex items-center justify-center relative"
                >
                  {participant.isVideoOn ? (
                    <div className="text-white text-xs text-center">
                      <Video className="h-6 w-6 mx-auto mb-1" />
                      {participant.name}
                    </div>
                  ) : (
                    <div className="text-white text-xs text-center">
                      <Avatar className="h-8 w-8 mx-auto mb-1">
                        <AvatarImage src={participant.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {participant.name}
                    </div>
                  )}
                  
                  {/* Status indicators */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    {!participant.isAudioOn && (
                      <div className="bg-red-600 rounded-full p-1">
                        <MicOff className="h-2 w-2 text-white" />
                      </div>
                    )}
                    {participant.isHandRaised && (
                      <div className="bg-yellow-600 rounded-full p-1">
                        <Hand className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
              <Button
                variant={isAudioOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleAudio}
              >
                {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={isVideoOn ? "default" : "destructive"}
                size="sm"
                onClick={toggleVideo}
              >
                {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="sm"
                onClick={toggleScreenShare}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={isHandRaised ? "default" : "outline"}
                size="sm"
                onClick={toggleHandRaise}
              >
                <Hand className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l flex flex-col">
          {/* Participants Panel */}
          {showParticipants && (
            <Card className="rounded-none border-0 border-b">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Participants ({participants.length})</span>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={participant.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{participant.name}</span>
                          <Badge variant={getRoleBadgeVariant(participant.role)} className="text-xs">
                            {participant.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {participant.isHandRaised && (
                            <Hand className="h-3 w-3 text-yellow-600" />
                          )}
                          {!participant.isAudioOn && (
                            <MicOff className="h-3 w-3 text-red-600" />
                          )}
                          {!participant.isVideoOn && (
                            <VideoOff className="h-3 w-3 text-gray-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Chat Panel */}
          {showChat && (
            <Card className="rounded-none border-0 flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <ScrollArea className="flex-1 mb-4">
                  <div className="space-y-3">
                    {chatMessages.map((message) => (
                      <div key={message.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${getRoleColor(message.user_role)}`}>
                            {message.user_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{message.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={sendChatMessage}>
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
