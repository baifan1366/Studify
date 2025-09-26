'use client';

import React, { useState } from 'react';
import { ProfileModal } from './profile-modal';
import { ProfileData } from '@/interface/profile-interface';
import { useProfile } from '@/hooks/profiles/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Users 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderWithProfileProps {
  participant: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  type: 'direct' | 'group';
  onProfileClick?: (participantId: string) => void;
  onSendMessage?: (profileId: number) => void;
}

export function ChatHeaderWithProfile({
  participant,
  type,
  onProfileClick,
  onSendMessage
}: ChatHeaderWithProfileProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Fetch profile data using the hook
  const { data: selectedProfile, isLoading: isProfileLoading, error: profileError } = useProfile(selectedUserId);

  const handleAvatarClick = () => {
    setSelectedUserId(participant.id);
    setIsProfileModalOpen(true);
    onProfileClick?.(participant.id);
  };

  const handleNameClick = () => {
    handleAvatarClick();
  };

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar 
            className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={handleAvatarClick}
          >
            <AvatarImage src={participant.avatar} />
            <AvatarFallback>
              {type === 'group' ? (
                <Users className="h-5 w-5" />
              ) : (
                participant.name.split(' ').map((n: string) => n[0]).join('')
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 
              className="font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={handleNameClick}
            >
              {participant.name}
            </h2>
            {type === 'direct' && (
              <p className="text-sm text-muted-foreground">
                {participant.isOnline ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAvatarClick}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>Block User</DropdownMenuItem>
              <DropdownMenuItem>Delete Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile || null}
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onSendMessage={onSendMessage}
      />
    </>
  );
}
