'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Settings, Hash } from 'lucide-react';
import { ChatPanel } from '../chat-panel';
import { useClassroomChat } from '@/hooks/classroom/use-classroom-chat';
import { HookChatMessage } from '@/interface/classroom/chat-message-interface';

// Tab types
type ChatTabType = 'general' | 'participants' | 'announcements' | 'settings';

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
}

// Individual chat tab content components
function GeneralChatTab({ 
  classroomSlug, 
  sessionId, 
  currentUserId, 
  currentUserName 
}: {
  classroomSlug: string;
  sessionId?: number;
  currentUserId: string;
  currentUserName: string;
}) {
  const {
    messages,
    sendMessage,
    addSystemMessage,
    clearMessages,
  } = useClassroomChat(classroomSlug, sessionId);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Convert hook messages to ChatPanel format
  const convertedMessages = messages.map((msg: HookChatMessage) => ({
    ...msg,
    userAvatar: msg.userAvatar || undefined
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
        />
      </div>
    </div>
  );
}

function ParticipantsTab({ participants }: { participants: any[] }) {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Participants ({participants.length})
      </h3>
      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
              <span className="text-white text-sm font-medium">
                {participant.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {participant.name || 'Unknown User'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {participant.role || 'Student'}
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
  const announcements = [
    {
      id: 1,
      title: 'Welcome to the session',
      content: 'Please keep your microphones muted when not speaking.',
      timestamp: new Date(),
      type: 'info'
    },
    {
      id: 2,
      title: 'Assignment reminder',
      content: 'Don\'t forget to submit your homework by Friday.',
      timestamp: new Date(Date.now() - 3600000),
      type: 'warning'
    }
  ];

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Announcements
      </h3>
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`p-3 rounded-lg border-l-4 ${
              announcement.type === 'warning'
                ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20'
                : 'bg-blue-50 border-blue-400 dark:bg-blue-900/20'
            }`}
          >
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {announcement.title}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {announcement.content}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {announcement.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Chat Settings
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Notifications
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Get notified of new messages
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sound Effects
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Play sounds for new messages
            </div>
          </div>
          <button
            onClick={() => setSounds(!sounds)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              sounds ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                sounds ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Scroll
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Automatically scroll to new messages
            </div>
          </div>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoScroll ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
  className = ''
}: ChatTabsProps) {
  const [activeTab, setActiveTab] = useState<ChatTabType>('general');

  // Mock participants data - replace with real data
  const participants = [
    { name: 'John Doe', role: 'Student' },
    { name: 'Jane Smith', role: 'Student' },
    { name: 'Dr. Wilson', role: 'Tutor' },
  ];

  const tabs: ChatTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: <MessageCircle className="w-4 h-4" />,
    },
    {
      id: 'participants',
      label: 'People',
      icon: <Users className="w-4 h-4" />,
      count: participants.length,
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <Hash className="w-4 h-4" />,
      count: 2,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors"
      >
        <MessageCircle className="w-6 h-6 mx-auto" />
      </button>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralChatTab
            classroomSlug={classroomSlug}
            sessionId={sessionId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        );
      case 'participants':
        return <ParticipantsTab participants={participants} />;
      case 'announcements':
        return <AnnouncementsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3 }}
      className={`fixed right-4 bottom-4 z-50 w-96 h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col ${className}`}
    >
      {/* Header with tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Classroom Chat
          </h3>
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            ×
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center space-x-1">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                    {tab.count}
                  </span>
                )}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
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
    </motion.div>
  );
}
