"use client";

import React, { useState } from "react";
import { useUser } from "@/hooks/profile/use-user";
import {
  useGroup,
  useGroupPosts,
  useGroupMembers,
  useHashtags,
} from "@/hooks/community/use-community";
import PostCard from "@/components/community/post-card";
import { NewPostForm } from "@/components/community/new-post-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import {
  Users,
  Lock,
  Globe,
  Settings,
  UserPlus,
  UserMinus,
  Save,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import MegaImage from "@/components/attachment/mega-blob-image";

// Group Settings Modal Component
const GroupSettingsModal = ({
  group,
  isOpen,
  onOpenChange,
}: {
  group: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const t = useTranslations("CommunityContent");
  const queryClient = useQueryClient();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [visibility, setVisibility] = useState<"public" | "private">(group.visibility);
  const { members } = useGroupMembers(group.slug);

  // Tab state
  const [activeTab, setActiveTab] = useState("general");

  // Member management states
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Remove member confirmation dialog
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; visibility: string }) => {
      const response = await fetch(`/api/community/groups/${group.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update group");
      }
      return response.json();
    },
    onSuccess: (updatedGroup) => {
      toast.success("Group settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["group", group.slug] });

      // If slug changed, redirect to new slug
      if (updatedGroup.slug !== group.slug) {
        window.location.href = `/community/${updatedGroup.slug}`;
      } else {
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update group settings");
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    updateGroupMutation.mutate({ name, description, visibility });
  };

  // Search users
  const searchUsers = React.useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      // Filter out users who are already members
      const memberIds = members?.map(m => m.user_id.toString()) || [];
      const filteredUsers = (data.users || []).filter((user: any) => !memberIds.includes(user.id));
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [members]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await fetch(`/api/community/groups/${group.slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add member");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Member added successfully!");
      queryClient.invalidateQueries({ queryKey: ["groupMembers", group.slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroup", group.slug] });
      setUserSearchQuery("");
      setSearchResults([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add member");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/community/groups/${group.slug}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Member removed successfully!");
      queryClient.invalidateQueries({ queryKey: ["groupMembers", group.slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroup", group.slug] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Group Settings
          </DialogTitle>
          <DialogDescription>
            Manage your group settings and members
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="general" className="data-[state=active]:bg-white/10">
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-white/10">
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={updateGroupMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Changing the name will update the group URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                rows={4}
                disabled={updateGroupMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value: "public" | "private") => setVisibility(value)}
                disabled={updateGroupMutation.isPending}
              >
                <SelectTrigger id="group-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-green-500" />
                      <span>Public - Anyone can view and join</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-yellow-500" />
                      <span>Private - Members only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4 mt-4">
            {/* Add Member Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {isSearching ? (
                <div className="text-center py-4">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto border border-white/10 rounded-md p-2 bg-white/5">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {user.avatar && user.avatar.includes('mega.nz') ? (
                            <MegaImage
                              megaUrl={user.avatar}
                              alt={user.name || ''}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          )}
                          <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addMemberMutation.mutate(user.id);
                        }}
                        disabled={addMemberMutation.isPending}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery && userSearchQuery.length >= 2 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              ) : null}
            </div>

            {/* Current Members List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base">Current Members</Label>
                <Badge variant="outline">{members?.length || 0} members</Badge>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {members && members.length > 0 ? (
                  members.map((member) => (
                    <Card key={member.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {member.user?.avatar_url && member.user.avatar_url.includes('mega.nz') ? (
                              <MegaImage
                                megaUrl={member.user.avatar_url}
                                alt={member.user.display_name || ''}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <AvatarImage
                                src={member.user?.avatar_url}
                                alt={member.user?.display_name}
                              />
                            )}
                            <AvatarFallback className="bg-blue-500/20 text-blue-300">
                              {member.user?.display_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {member.user?.display_name || `User #${member.user_id}`}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${member.role === "owner"
                                  ? "border-yellow-400 text-yellow-400"
                                  : member.role === "admin"
                                    ? "border-purple-400 text-purple-400"
                                    : "border-gray-400 text-gray-400"
                                }`}
                            >
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        {member.role !== "owner" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setMemberToRemove(member);
                              setIsRemoveDialogOpen(true);
                            }}
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No members found
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                <strong>{memberToRemove?.user?.display_name || "this member"}</strong>{" "}
                from the group? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (memberToRemove) {
                    removeMemberMutation.mutate(memberToRemove.id);
                    setIsRemoveDialogOpen(false);
                    setMemberToRemove(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {activeTab === "general" && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateGroupMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateGroupMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateGroupMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

const GroupMemberList = ({ groupSlug, currentUserId }: { groupSlug: string; currentUserId?: number | null }) => {
  const { members, isLoading } = useGroupMembers(groupSlug);
  const t = useTranslations("CommunityPostDetail");

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">
            <Users className="w-5 h-5 inline mr-2" />
            Group Members
          </CardTitle>
          <Badge variant="outline" className="border-blue-400 text-blue-400">
            {members?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/10 rounded-lg" />
          ))
        ) : members && members.length > 0 ? (
          members.slice(0, 10).map((member) => {
            const isCurrentUser = currentUserId && member.user_id === currentUserId;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {member.user?.avatar_url && member.user.avatar_url.includes('mega.nz') ? (
                      <MegaImage
                        megaUrl={member.user.avatar_url}
                        alt={member.user.display_name || ''}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarImage
                        src={member.user?.avatar_url}
                        alt={member.user?.display_name}
                      />
                    )}
                    <AvatarFallback className="bg-blue-500/20 text-blue-300">
                      {member.user?.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm truncate">
                      {member.user?.display_name || `User #${member.user_id}`}
                      {isCurrentUser && <span className="text-green-400 ml-2">({t('you_badge')})</span>}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 ${member.role === "owner"
                          ? "border-yellow-400 text-yellow-400"
                          : member.role === "admin"
                            ? "border-purple-400 text-purple-400"
                            : "border-gray-400 text-gray-400"
                          }`}
                      >
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">No members found</p>
          </div>
        )}
        {members && members.length > 10 && (
          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              +{members.length - 10} more members
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function GroupDetailContent({
  groupSlug,
}: {
  groupSlug: string;
}) {
  const t = useTranslations("CommunityContent");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ✅ Use the centralized useUser hook instead of direct Supabase calls
  const { data: user } = useUser();
  const profileId = user?.profile?.id ? parseInt(user.profile.id) : null;

  const {
    group,
    isLoading: groupLoading,
    isError: groupError,
    error: groupErrorMessage,
  } = useGroup(groupSlug);
  const {
    posts,
    createPost,
    isCreatingPost,
  } = useGroupPosts(groupSlug);
  const { joinGroup, isJoining, leaveGroup, isLeaving } =
    useGroupMembers(groupSlug);
  const { searchHashtags } = useHashtags();

  const handleCreatePost = ({
    title,
    body,
    files,
    hashtags,
  }: {
    title: string;
    body: string;
    files: File[];
    hashtags: string[];
  }) => {
    createPost(
      { title, body, files, hashtags },
      {
        onSuccess: () => toast.success("Post created successfully! 🎉"),
        onError: (error: any) =>
          toast.error(error?.message || "Failed to create post"),
      }
    );
  };

  const handleJoinGroup = () => {
    joinGroup(undefined, {
      onSuccess: () => toast.success("Successfully joined the group! 🎉"),
      onError: (error: any) =>
        toast.error(error?.message || "Failed to join group"),
    });
  };

  const handleLeaveGroup = () => {
    leaveGroup(undefined, {
      onSuccess: () => toast.success("You have left the group"),
      onError: (error: any) =>
        toast.error(error?.message || "Failed to leave group"),
    });
  };

  // Private group access denied
  if (groupError && groupErrorMessage?.message.includes("Access denied")) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-4">Private Group</h1>
        <p className="text-gray-400 mb-6">
          This is a private group. You need to join to view its content.
        </p>
        {group && (
          <Card className="bg-white/5 border-white/10 max-w-md mx-auto mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 justify-center">
                <Lock className="w-5 h-5 text-yellow-400" />
                {group.name}
              </CardTitle>
              <CardDescription className="text-gray-300 text-center">
                {group.description || "No description available"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.member_count || 0} members
                </div>
              </div>
              <Button
                onClick={handleJoinGroup}
                disabled={isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isJoining ? t("joining") : t("request_to_join")}
              </Button>
            </CardContent>
          </Card>
        )}
        <Link href="/community">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Back to Community
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 主内容 */}
      <div className="lg:col-span-2 space-y-6">
        {groupLoading && (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg bg-white/10" />
            <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
            <Skeleton className="h-48 w-full rounded-lg bg-white/10" />
          </div>
        )}

        {group && (
          <>
            {/* Settings Modal */}
            <GroupSettingsModal
              group={group}
              isOpen={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
            />

            {/* Header */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <CardTitle className="text-white flex items-center gap-2 text-2xl">
                      {group.visibility === "private" ? (
                        <Lock className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <Globe className="w-6 h-6 text-green-400" />
                      )}
                      {group.name}
                    </CardTitle>
                    <CardDescription className="text-gray-300 mt-2 text-base">
                      {group.description || t("no_description_available")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        group.visibility === "private" ? "secondary" : "default"
                      }
                    >
                      {group.visibility === "private"
                        ? t("visibility_private")
                        : t("visibility_public")}
                    </Badge>
                    {group.user_membership?.role === "owner" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => setIsSettingsOpen(true)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Join/Leave Group Buttons - Bottom Right */}
                <div className="flex justify-end">
                  {!group.user_membership ? (
                    <Button
                      onClick={handleJoinGroup}
                      disabled={isJoining}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isJoining ? t("joining") : t("join_group")}
                    </Button>
                  ) : group.user_membership.role !== "owner" ? (
                    <Button
                      variant="outline"
                      onClick={handleLeaveGroup}
                      disabled={isLeaving}
                      className="border-red-400/50 text-red-400 hover:bg-red-500/10"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      {isLeaving ? t("leaving") : t("leave")}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
            </Card>

            {/* 新帖子 */}
            {group.user_membership && (
              <div>
                <NewPostForm
                  onSubmit={handleCreatePost}
                  isLoading={isCreatingPost}
                  searchHashtags={async (query: string) => {
                    const results = await searchHashtags(query);
                    return results
                      .map((tag: any) =>
                        typeof tag === "string" ? tag : tag?.name ?? ""
                      )
                      .filter(Boolean);
                  }}
                />
              </div>
            )}

            {/* 帖子列表 */}
            <div className="space-y-4">
              {posts && posts.length > 0 ? (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">{t("no_posts_yet")}</p>
                  {group.user_membership && (
                    <p className="text-gray-500">{t("start_discussion_prompt")}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ✅ 右侧边栏：GroupMemberList */}
      <div className="space-y-6">
        <GroupMemberList groupSlug={groupSlug} currentUserId={profileId} />
      </div>
    </div>
  );
}
