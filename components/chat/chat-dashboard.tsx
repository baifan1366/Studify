'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConversations, useMarkAsRead, useCreateConversation } from '@/hooks/chat/use-chat';
import { 
  Search, 
  MessageCircle, 
  Users, 
  Plus,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChatPanel } from './chat-panel';
import { MultipleTypingIndicator } from './typing-indicator';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useChatNotifications, useRealtimeChatNotifications } from '@/hooks/chat/use-chat-notifications';

// Mock data - replace with real API calls
interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    isFromMe: boolean;
  };
  unreadCount: number;
  type: 'direct' | 'group';
}

export function ChatDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  
  // Use chat hooks
  const { data: conversationsData, isLoading, error } = useConversations();
  const markAsReadMutation = useMarkAsRead();
  const createConversationMutation = useCreateConversation();
  
  // Use notification hooks
  const { notifyNewMessage, requestNotificationPermission } = useChatNotifications();
  useRealtimeChatNotifications();
  
  // Use database data instead of mock data
  const conversations = conversationsData?.conversations || [];
  
  // Debug: Log conversations to see if new ones are added (remove in production)
  useEffect(() => {
    if (conversations.length > 0) {
      console.log('Current conversations count:', conversations.length);
    }
    if (selectedConversation) {
      console.log('Selected conversation:', selectedConversation);
    }
  }, [conversations, selectedConversation]);

  // Request notification permission on component mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Listen for navigation events from notifications
  useEffect(() => {
    const handleNavigateToConversation = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      setSelectedConversation(conversationId);
    };

    window.addEventListener('navigate-to-conversation', handleNavigateToConversation as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-conversation', handleNavigateToConversation as EventListener);
    };
  }, []);

  // Mock typing indicator simulation (for demo purposes)
  useEffect(() => {
    if (!selectedConversation) return;

    // Simulate random typing activity
    const interval = setInterval(() => {
      const shouldShowTyping = Math.random() > 0.8; // 20% chance
      
      if (shouldShowTyping) {
        // Find current conversation participant
        const currentConv = conversations.find(c => c.id === selectedConversation);
        if (currentConv) {
          setTypingUsers([{
            id: currentConv.participant.id,
            name: currentConv.participant.name,
            avatar: currentConv.participant.avatar
          }]);
          
          // Hide typing after 2-4 seconds
          setTimeout(() => {
            setTypingUsers([]);
          }, Math.random() * 2000 + 2000);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [selectedConversation, conversations]);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Mark as read
    markAsReadMutation.mutate({ conversationId });
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Real API call to search users
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateChat = async (userId: string) => {
    try {
      console.log('Creating chat with user ID:', userId);
      
      const result = await createConversationMutation.mutateAsync({
        participant_id: userId,
      }) as { conversation?: { id: string } };
      
      console.log('Conversation created:', result);
      
      setShowNewChatDialog(false);
      setUserSearchQuery('');
      setSearchResults([]);
      
      // Wait a moment for cache to update, then navigate
      setTimeout(() => {
        if (result.conversation?.id) {
          setSelectedConversation(result.conversation.id);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      return;
    }

    setIsCreatingGroup(true);
    try {
      console.log('Creating group:', {
        name: groupName,
        description: groupDescription,
        members: selectedMembers.map(m => m.id),
        memberData: selectedMembers.map(m => ({ id: m.id, name: m.name, type: typeof m.id }))
      });

      // First test the system
      console.log('Testing group system...');
      const testResponse = await fetch('/api/chat/groups/test');
      const testData = await testResponse.json();
      console.log('Group system test:', testData);
      
      if (!testData.success) {
        throw new Error(`System test failed: ${testData.error}`);
      }
      
      // Check if required tables exist
      if (!testData.tableTests.group_conversations || !testData.tableTests.group_members) {
        throw new Error('Group chat tables not found. Please run the database migration: 007_create_group_conversations.sql');
      }

      // API call to create group
      const response = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          member_ids: selectedMembers.map(m => m.id), // These are profile IDs as strings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Group creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to create group: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Group created:', result);

      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowCreateGroupDialog(false);
      setUserSearchQuery('');
      setSearchResults([]);

      // Navigate to new group
      setTimeout(() => {
        if (result.conversation?.id) {
          setSelectedConversation(result.conversation.id);
        }
      }, 500);

    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddMember = (user: any) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  
  // Debug: Log selectedConv to see if it's found (remove in production)
  useEffect(() => {
    if (selectedConversation && !selectedConv) {
      console.log('⚠️ Could not find conversation:', selectedConversation);
      console.log('Available IDs:', conversations.map(c => c.id));
    }
  }, [selectedConversation, conversations, selectedConv]);


  return (
    <div className="h-screen flex bg-transparent">
      {/* Sidebar - Conversations List */}
      <div className="w-1/3 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Messages
            </h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setShowNewChatDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCreateGroupDialog(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Create Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
              style={{ paddingLeft: '3rem' }}
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Failed to load conversations</p>
                <Button variant="ghost" size="sm" className="mt-2">
                  Try again
                </Button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a conversation to begin chatting</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`mb-2 cursor-pointer transition-colors bg-gray-100/5 hover:bg-muted/50 ${
                  selectedConversation === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => handleConversationSelect(conversation.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.participant.avatar} />
                        <AvatarFallback>
                          {conversation.type === 'group' ? (
                            <Users className="h-6 w-6" />
                          ) : (
                            conversation.participant.name.split(' ').map((n: string) => n[0]).join('')
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.participant.isOnline && conversation.type === 'direct' && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {conversation.participant.name}
                          </h3>
                          {conversation.type === 'group' && conversation.memberCount && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {conversation.memberCount} members
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {conversation.type === 'group' && (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {conversation.lastMessage ? formatTimestamp(conversation.lastMessage.timestamp) : 'No messages'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessage ? (
                          <>
                            {conversation.lastMessage.isFromMe && 'You: '}
                            {conversation.lastMessage.content}
                          </>
                        ) : conversation.type === 'group' && conversation.description ? (
                          conversation.description
                        ) : (
                          conversation.type === 'group' ? 'No messages yet...' : 'Start a conversation...'
                        )}
                      </p>

                      {!conversation.participant.isOnline && conversation.type === 'direct' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last seen {formatTimestamp(conversation.participant.lastSeen || '')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConv.participant.avatar} />
                  <AvatarFallback>
                    {selectedConv.type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      selectedConv.participant.name.split(' ').map((n: string) => n[0]).join('')
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedConv.participant.name}</h2>
                  {selectedConv.type === 'direct' && (
                    <p className="text-sm text-muted-foreground">
                      {selectedConv.participant.isOnline ? 'Online' : 'Offline'}
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
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Block User</DropdownMenuItem>
                    <DropdownMenuItem>Delete Chat</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Typing Indicator */}
            <MultipleTypingIndicator typingUsers={typingUsers} className="px-4 py-2" />

            {/* Chat Panel */}
            <ChatPanel conversationId={selectedConversation} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Chat</DialogTitle>
            <DialogDescription>
              Search for users to start a conversation with
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        console.log('Selected user for chat:', user);
                        handleCreateChat(user.id);
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery && userSearchQuery.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Type at least 2 characters to search</p>
                </div>
              ) : userSearchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No users found for "{userSearchQuery}"</p>
                  <p className="text-xs mt-1">Try searching by name or email</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Start typing to search for users</p>
                  <p className="text-xs mt-1">Search by name or email</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a new group conversation with multiple members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Group Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Group Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                placeholder="Enter group description..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Members ({selectedMembers.length})</label>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {selectedMembers.map((member) => (
                    <Badge key={member.id} variant="secondary" className="flex items-center gap-1">
                      {member.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveMember(member.id)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Members */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Members</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users to add..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* User Search Results */}
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 p-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`p-2 rounded cursor-pointer hover:bg-muted ${
                        selectedMembers.find(m => m.id === user.id) ? 'bg-muted opacity-50' : ''
                      }`}
                      onClick={() => handleAddMember(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.role}</p>
                        </div>
                        {selectedMembers.find(m => m.id === user.id) && (
                          <Badge variant="secondary" className="ml-auto">Added</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery && userSearchQuery.length >= 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Search to add members</p>
                </div>
              )}
            </div>

            {/* Create Button */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateGroupDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
                className="flex-1"
              >
                {isCreatingGroup ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Group'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
