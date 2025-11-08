'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Settings, Hash, Bell, BellOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ChatPanel } from '../chat-panel';
import { useClassroomChat } from '@/hooks/classroom/use-classroom-chat';
import { HookChatMessage } from '@/interface/classroom/chat-message-interface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCardStyling, getClassroomColor, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';
import { useNotifications, useCreateNotification } from '@/hooks/notifications/use-notifications';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/notifications/use-notification-settings';

// Tab types
type ChatTabType = 'general' | 'settings';

interface ChatTab {
  id: ChatTabType;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface ChatTabsProps {
  classroomSlug: string;
  sessionId?: number;
  currentUserId: string;
  currentUserName: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  classroom?: any;
}

// Individual chat tab content components
function GeneralChatTab({ 
  classroomSlug, 
  sessionId, 
  currentUserId, 
  currentUserName,
  classroom
}: {
  classroomSlug: string;
  sessionId?: number;
  currentUserId: string;
  currentUserName: string;
  classroom?: any;
}) {
  const {
    messages,
    sendMessage,
    addSystemMessage,
    clearMessages,
    markAsRead,
  } = useClassroomChat(classroomSlug, sessionId);

  // Notification hooks
  const createNotification = useCreateNotification();
  const { data: notificationSettings } = useNotificationSettings();

  // Mark messages as read when viewing the chat tab
  useEffect(() => {
    if (messages.length > 0) {
      // Add a small delay to ensure proper state updates
      const timer = setTimeout(() => {
        markAsRead();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, markAsRead]);

  const handleSendMessage = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length === 0) {
      return; // Don't send empty messages
    }
    
    try {
      await sendMessage(trimmedContent);
      
      // Create notification for classroom members (if notifications are enabled)
      if (notificationSettings?.settings?.classroom_updates !== false) {
        try {
          // Get all classroom members except the sender
          const membersResponse = await fetch(`/api/classroom/${classroomSlug}/members`);
          if (membersResponse.ok) {
            const members = await membersResponse.json();
            const memberArray = Array.isArray(members) ? members : members?.members || [];
            
            // Get member IDs excluding current user
            const memberIds = memberArray
              .filter((member: any) => member.id !== currentUserId && member.user_id !== currentUserId)
              .map((member: any) => member.id);
            
            if (memberIds.length > 0) {
              await createNotification.mutateAsync({
                user_ids: memberIds,
                kind: 'classroom_message',
                title: `New message in ${classroom?.name || 'classroom'}`,
                message: `${currentUserName}: ${trimmedContent.substring(0, 100)}${trimmedContent.length > 100 ? '...' : ''}`,
                payload: {
                  classroom_slug: classroomSlug,
                  session_id: sessionId,
                  sender_name: currentUserName,
                  message_preview: trimmedContent.substring(0, 200)
                },
                deep_link: `/classroom/${classroomSlug}?tab=chat`,
                send_push: notificationSettings?.settings?.push_notifications === true
              });
            }
          }
        } catch (notificationError) {
          console.error('Failed to send chat notification:', notificationError);
          // Don't throw - message was sent successfully, notification is optional
        }
      }
    } catch (error) {
      console.error(`Failed to send message for ${currentUserName}:`, error);
      // Show user-friendly error with their name
      addSystemMessage(`Failed to send message from ${currentUserName}. Please try again.`);
    }
  };

  // Convert hook messages to ChatPanel format
  const convertedMessages = messages.map((msg: HookChatMessage) => ({
    id: msg.id,
    userId: msg.userId,
    userName: msg.userName,
    userAvatar: msg.userAvatar || undefined,
    content: msg.content,
    timestamp: msg.timestamp,
    type: msg.type,
    // Convert ChatAttachment to ClassroomAttachment format if exists
    attachment: msg.attachment ? {
      id: msg.attachment.id,
      public_id: msg.attachment.public_id,
      file_url: msg.attachment.file_url,
      file_name: msg.attachment.file_name,
      mime_type: msg.attachment.mime_type,
      size_bytes: msg.attachment.size_bytes,
      created_at: msg.attachment.created_at,
      visibility: msg.attachment.visibility,
      bucket: msg.attachment.bucket,
      path: msg.attachment.path,
      profiles: msg.attachment.profiles
    } : undefined
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          messages={convertedMessages}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onSendMessage={handleSendMessage}
          isOpen={true}
          onToggle={() => {}}
          className="relative w-full h-full border-0 shadow-none bg-transparent"
          classroomSlug={classroomSlug}
        />
      </div>
    </div>
  );
}

function ParticipantsTab({ participants }: { participants: any[] }) {
  const t = useTranslations('ChatTabs');
  return (
    <div className="h-full overflow-y-auto">
      <h3 className="font-semibold mb-4">
        {t('participants_count', { count: participants.length })}
      </h3>
      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="flex items-center p-2 rounded-lg hover:bg-muted/50"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3">
              <span className="text-primary-foreground text-sm font-medium">
                {participant.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {participant.name || t('unknown_user')}
              </div>
              <div className="text-xs text-muted-foreground">
                {participant.role || t('student')}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const t = useTranslations('ChatTabs');
  const announcements = [
    {
      id: 1,
      title: t('welcome_to_session'),
      content: t('keep_microphones_muted'),
      timestamp: new Date(),
      type: 'info'
    },
    {
      id: 2,
      title: t('assignment_reminder'),
      content: t('dont_forget_submit_homework'),
      timestamp: new Date(Date.now() - 3600000),
      type: 'warning'
    }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <h3 className="font-semibold mb-4">
        {t('announcements')}
      </h3>
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`p-3 rounded-lg border-l-4 ${
              announcement.type === 'warning'
                ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20'
                : 'bg-muted/50 border-primary'
            }`}
          >
            <div className="font-medium text-sm">
              {announcement.title}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {announcement.content}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {announcement.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const t = useTranslations('ChatTabs');
  const { data: notificationSettings, isLoading } = useNotificationSettings();
  const { mutate: updateSettings } = useUpdateNotificationSettings();

  // Local settings for chat-specific features
  const [sounds, setSounds] = useState(() => {
    const saved = localStorage.getItem('chat-sounds');
    return saved ? JSON.parse(saved) : false;
  });
  const [autoScroll, setAutoScroll] = useState(() => {
    const saved = localStorage.getItem('chat-autoscroll');
    return saved ? JSON.parse(saved) : true;
  });

  // Handle notification settings update
  const saveNotifications = (value: boolean) => {
    updateSettings({
      classroom_updates: value
    });
  };

  const saveSounds = (value: boolean) => {
    setSounds(value);
    localStorage.setItem('chat-sounds', JSON.stringify(value));
  };

  const saveAutoScroll = (value: boolean) => {
    setAutoScroll(value);
    localStorage.setItem('chat-autoscroll', JSON.stringify(value));
  };

  const notifications = notificationSettings?.settings?.classroom_updates ?? true;

  return (
    <div className="h-full overflow-y-auto">
      <h3 className="font-semibold mb-4">
        {t('chat_settings')}
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {t('chat_notifications')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('get_notified_new_messages')}
            </div>
          </div>
          <button
            onClick={() => saveNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifications ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {t('sound_effects')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('play_sounds_new_messages')}
            </div>
          </div>
          <button
            onClick={() => saveSounds(!sounds)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              sounds ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                sounds ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {t('auto_scroll')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('auto_scroll_new_messages')}
            </div>
          </div>
          <button
            onClick={() => saveAutoScroll(!autoScroll)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoScroll ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                autoScroll ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Main chat tabs component
export function ChatTabs({
  classroomSlug,
  sessionId,
  currentUserId,
  currentUserName,
  isOpen,
  onToggle,
  className = '',
  classroom
}: ChatTabsProps) {
  const t = useTranslations('ChatTabs');
  const [activeTab, setActiveTab] = useState<ChatTabType>('general');
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Get unread count from chat hook
  const { unreadCount, markAsRead } = useClassroomChat(classroomSlug, sessionId);
  
  // Force badge update when switching to general tab
  useEffect(() => {
    if (activeTab === 'general') {
      // Mark as read when viewing general tab
      const timer = setTimeout(() => {
        markAsRead();
        setForceUpdate(prev => prev + 1); // Force re-render
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, markAsRead, classroom]);
  
  // Get classroom color
  const classroomColor = getClassroomColor(classroom);
  const cardStyling = getCardStyling(classroomColor, 'light');


  const tabs: ChatTab[] = [
    {
      id: 'general',
      label: t('general'),
      icon: <MessageCircle className="w-4 h-4" />,
      count: (unreadCount > 0 && activeTab !== 'general') ? unreadCount : undefined,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralChatTab
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            classroom={classroom}
          />
        );
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  };

  // Return Card-based layout like other tabs instead of fixed positioning
  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
      className={className}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {t('classroom_chat')}
        </CardTitle>
        <CardDescription>{t('communicate_with_classmates')}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center space-x-1">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count && tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-red-500/80 text-white">
                    {tab.count}
                  </Badge>
                )}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="h-[400px] overflow-hidden">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
