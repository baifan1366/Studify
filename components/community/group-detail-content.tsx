"use client";

import React from "react";
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
import { useTranslations } from "next-intl";
import {
  Users,
  Lock,
  Globe,
  Settings,
  UserPlus,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
                    <AvatarImage
                      src={member.user?.avatar_url}
                      alt={member.user?.display_name}
                    />
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
