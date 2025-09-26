'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  User, 
  Mail, 
  Clock, 
  Trophy,
  Shield,
  ShieldCheck,
  ShieldX,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileData, ProfileModalProps } from '@/interface/profile-interface';

export function ProfileModal({
  profile,
  isOpen,
  onOpenChange,
  onSendMessage,
  className
}: ProfileModalProps) {
  if (!profile) return null;

  // Format last login time
  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never logged in';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Format timezone display
  const formatTimezone = (timezone: string) => {
    try {
      // Get current time in the user's timezone
      const now = new Date();
      const timeInTimezone = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      // Get timezone abbreviation
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(now);
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
      
      return `${timeInTimezone} (${timeZoneName})`;
    } catch (error) {
      // Fallback if timezone is invalid
      return timezone;
    }
  };

  // Get role badge variant and icon
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          variant: 'destructive' as const,
          icon: <Shield className="h-3 w-3" />,
          label: 'Admin'
        };
      case 'tutor':
        return {
          variant: 'default' as const,
          icon: <ShieldCheck className="h-3 w-3" />,
          label: 'Tutor'
        };
      case 'student':
        return {
          variant: 'secondary' as const,
          icon: <User className="h-3 w-3" />,
          label: 'Student'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: <User className="h-3 w-3" />,
          label: role
        };
    }
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          label: 'Active'
        };
      case 'banned':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          icon: <ShieldX className="h-3 w-3" />,
          label: 'Banned'
        };
      default:
        return {
          variant: 'outline' as const,
          className: '',
          label: status
        };
    }
  };

  const roleInfo = getRoleInfo(profile.role);
  const statusInfo = getStatusInfo(profile.status);
  const shouldShowEmail = profile.privacy_settings?.show_email && profile.email;

  // Generate initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="sr-only">User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(profile.display_name || profile.full_name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Name and Role */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {profile.display_name || profile.full_name || 'Unknown User'}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Badge variant={roleInfo.variant} className="flex items-center gap-1">
                  {roleInfo.icon}
                  {roleInfo.label}
                </Badge>
                <Badge 
                  variant={statusInfo.variant}
                  className={cn("flex items-center gap-1", statusInfo.className)}
                >
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Profile Information */}
          <div className="space-y-4">
            {/* Full Name (if different from display name) */}
            {profile.full_name && profile.full_name !== profile.display_name && (
              <div className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                </div>
              </div>
            )}

            {/* Bio */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">About</h3>
                <p className="text-sm leading-relaxed">{profile.bio || <i>This user has not added a bio.</i> }</p>
              </div>

            {/* Email */}
            {shouldShowEmail && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
            )}

            {/* Timezone */}
            {profile.timezone && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimezone(profile.timezone)}
                  </p>
                </div>
              </div>
            )}

            {/* Last Login */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">
                  {formatLastLogin(profile.last_login)}
                </p>
              </div>
            </div>

            {/* Points */}
            <div className="flex items-center gap-3">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Points</p>
                <p className="text-sm text-muted-foreground">
                  {profile.points.toLocaleString()} points
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onSendMessage && (
              <Button 
                onClick={() => onSendMessage(profile.id)}
                className="flex-1"
                disabled={profile.status === 'banned'}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            )}
            
          </div>

          {/* Additional Info for Banned Users */}
          {profile.status === 'banned' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <ShieldX className="h-4 w-4" />
                <p className="text-sm font-medium">This user is currently banned</p>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Some features may be limited or unavailable.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
