"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  ThumbsUp,
  Heart,
  Users,
  Clock,
  Paperclip,
  Send,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Post } from "@/interface/community/post-interface";
import Link from "next/link";
import ZoomImage from "@/components/image-zoom/ZoomImage";
import MegaImage from "@/components/attachment/mega-blob-image";
import { useToggleReaction } from "@/hooks/community/use-reactions";
import { useCreateComment } from "@/hooks/community/use-comments";
import SharePostDialog from "./share-post-dialog";
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { useUser } from "@/hooks/profile/use-user";

export default function PostCard({ post }: { post: Post }) {
  const t = useTranslations("CommunityPostCard");
  const toggleReactionMutation = useToggleReaction(post.group?.slug || '', post.slug || '');
  const createCommentMutation = useCreateComment(post.group?.slug || '', post.slug || '');
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [showCommentComposer, setShowCommentComposer] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState("");
  const { toast: toastHook } = useToast();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';
  
  // Handle posts without a group - they should not have a "Read More" link or should use a different route
  const hasGroup = post.group && post.group.slug;
  const groupPath = hasGroup && post.group ? (isTutor ? `/tutor/community/${post.group.slug}` : `/community/${post.group.slug}`) : null;
  const postPath = hasGroup && post.group ? (isTutor ? `/tutor/community/${post.group.slug}/posts/${post.slug}` : `/community/${post.group.slug}/posts/${post.slug}`) : null;

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!post.group?.slug || !post.slug || !commentBody.trim()) return;

    await createCommentMutation.mutateAsync({
      groupSlug: post.group.slug,
      postSlug: post.slug,
      body: commentBody.trim(),
    });
    setCommentBody("");
  };

  const handleReaction = (emoji: string) => {
    if (!post.group?.slug || !post.slug) {
      toast.error("Cannot react to this post");
      return;
    }
    
    toggleReactionMutation.mutate({
      groupSlug: post.group.slug,
      postSlug: post.slug,
      emoji,
      target_type: "post",
      target_id: post.id.toString(),
    }, {
      onSuccess: (result) => {
        const reactionName = emoji === "👍" ? "Like" : emoji === "❤️" ? "Love" : "Reaction";
        toast.success(
          result.action === "added"
            ? `${reactionName} added`
            : `${reactionName} removed`
        );
      },
      onError: () => {
        toast.error("Failed to add reaction");
      }
    });
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return t('just_now');
    if (diffInHours < 24) return t('hours_ago', { hours: diffInHours });
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('days_ago', { days: diffInDays });
    return postDate.toLocaleDateString();
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {post.author?.avatar_url?.includes("mega.nz") ? (
                <MegaImage
                  megaUrl={post.author.avatar_url}
                  alt={post.author.display_name || ""}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <AvatarImage
                  src={post.author?.avatar_url}
                  alt={post.author?.display_name}
                />
              )}
              <AvatarFallback>
                {post.author?.display_name?.slice(0, 1).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.group && groupPath && (
                <Link href={groupPath}>
                  <Badge
                    variant="outline"
                    className="border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {post.group.name}
                  </Badge>
                </Link>
              )}
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimeAgo(post.created_at || new Date().toISOString())}
              </div>
            </div>
            <CardTitle className="text-lg leading-tight text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
              {postPath ? (
                <Link href={postPath}>
                  {post.title}
                </Link>
              ) : (
                <span>{post.title}</span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('by_prefix')}{post.author?.display_name || t('unknown_user')}
              {post.author?.community_title && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {post.author.community_title}
                </Badge>
              )}
            </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-gray-900 dark:text-white line-clamp-3">{post.body}</p>

        {post.files && post.files.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {post.files.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden group hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all"
                >
                  {file.mime_type.startsWith("image/") ? (
                    <ZoomImage
                      src={file.url}
                      alt={file.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.mime_type.startsWith("video/") ? (
                    <video
                      src={file.url}
                      controls
                      muted={false}
                      style={{ width: "100%", height: "auto" }}
                    />
                  ) : (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-full flex flex-col items-center justify-center p-2"
                    >
                      <Paperclip className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 text-center truncate w-full mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {file.file_name}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {(post.preview_comments?.length || showCommentComposer) && (
        <CardContent className="space-y-3 border-t border-border/60 pt-3">
          {post.preview_comments?.map((comment) => {
            const commentAuthor = Array.isArray(comment.author)
              ? comment.author[0]
              : comment.author;

            return (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage
                  src={commentAuthor?.avatar_url}
                  alt={commentAuthor?.display_name}
                />
                <AvatarFallback className="text-[10px]">
                  {commentAuthor?.display_name?.slice(0, 1).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 rounded-xl bg-muted/60 px-3 py-2">
                <p className="text-xs font-semibold text-foreground">
                  {commentAuthor?.display_name || t("unknown_user")}
                </p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{comment.body}</p>
              </div>
            </div>
            );
          })}

          {showCommentComposer && (
            <form onSubmit={handleCommentSubmit} className="flex items-end gap-2">
              <Textarea
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Write a comment…"
                className="min-h-10 flex-1 resize-none"
                rows={1}
                disabled={createCommentMutation.isPending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!commentBody.trim() || createCommentMutation.isPending}
                aria-label="Post comment"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-2 pt-3">
        <div className="flex justify-between w-full text-gray-600 dark:text-gray-400">
          <div className="flex space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => handleReaction("👍")}
              disabled={toggleReactionMutation.isPending}
            >
              <ThumbsUp className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.reactions?.["👍"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => handleReaction("❤️")}
              disabled={toggleReactionMutation.isPending}
            >
              <Heart className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.reactions?.["❤️"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => handleReaction("😂")}
              disabled={toggleReactionMutation.isPending}
              aria-label="React with laugh"
            >
              <span className="mr-1">😂</span>
              <span className="text-xs">{post.reactions?.["😂"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => handleReaction("😡")}
              disabled={toggleReactionMutation.isPending}
              aria-label="React with angry"
            >
              <span className="mr-1">😡</span>
              <span className="text-xs">{post.reactions?.["😡"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => setShowCommentComposer((visible) => !visible)}
              aria-expanded={showCommentComposer}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.comments_count || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-gray-50 dark:hover:bg-gray-700 px-2"
              onClick={() => setShowShareDialog(true)}
            >
              <Send className="mr-1 h-4 w-4" />
            </Button>
          </div>
          {postPath && (
            <Link href={postPath}>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('read_more')}
              </Button>
            </Link>
          )}
        </div>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start w-full">
            {post.hashtags.map((tag) => {
              const searchPath = isTutor ? `/tutor/community?search=${encodeURIComponent('#' + tag.name)}` : `/community?search=${encodeURIComponent('#' + tag.name)}`;
              return (
                <Link
                  key={tag.id || tag.name}
                  href={searchPath}
                  className="hover:underline"
                >
                  <Badge
                    variant="outline"
                    className="border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer"
                  >
                    #{tag.name}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardFooter>
      
      <SharePostDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        post={post}
      />
    </Card>
  );
}
