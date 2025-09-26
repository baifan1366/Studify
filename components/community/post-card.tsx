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
import {
  MessageSquare,
  ThumbsUp,
  Heart,
  Users,
  Clock,
  Paperclip,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Post } from "@/interface/community/post-interface";
import Link from "next/link";
import ZoomImage from "@/components/image-zoom/ZoomImage";
import { useToggleReaction } from "@/hooks/community/use-reactions";
import SharePostDialog from "./share-post-dialog";

export default function PostCard({ post }: { post: Post }) {
  const t = useTranslations("CommunityPostCard");
  const toggleReactionMutation = useToggleReaction(post.group?.slug || '', post.slug || '');
  const [showShareDialog, setShowShareDialog] = React.useState(false);

  const handleReaction = (emoji: string) => {
    if (!post.group?.slug || !post.slug) return;
    
    toggleReactionMutation.mutate({
      groupSlug: post.group.slug,
      postSlug: post.slug,
      emoji,
      target_type: "post",
      target_id: post.id.toString(),
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
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg hover:bg-white/10 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.group && (
                <Link href={`/community/${post.group.slug}`}>
                  <Badge
                    variant="outline"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400/10 cursor-pointer"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {post.group.name}
                  </Badge>
                </Link>
              )}
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimeAgo(post.created_at || new Date().toISOString())}
              </div>
            </div>
            <CardTitle className="text-lg leading-tight hover:text-blue-300 cursor-pointer">
              <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
                {post.title}
              </Link>
            </CardTitle>
            <p className="text-sm text-gray-300 mt-1">
              by {post.author?.display_name || t('unknown_user')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-gray-200 line-clamp-3">{post.body}</p>

        {post.files && post.files.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {post.files.map((file) => (
                <div
                  key={file.id}
                  className="bg-black/30 rounded-lg overflow-hidden group hover:ring-2 hover:ring-blue-400 transition-all"
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
                      <Paperclip className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 text-center truncate w-full mt-1 group-hover:text-blue-300">
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
      <CardFooter className="flex flex-col gap-2 pt-3">
        <div className="flex justify-between w-full text-gray-300">
          <div className="flex space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-white/10 hover:text-white px-2"
              onClick={() => handleReaction("👍")}
              disabled={toggleReactionMutation.isPending}
            >
              <ThumbsUp className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.reactions?.["👍"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-white/10 hover:text-white px-2"
              onClick={() => handleReaction("❤️")}
              disabled={toggleReactionMutation.isPending}
            >
              <Heart className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.reactions?.["❤️"] || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-white/10 hover:text-white px-2"
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.comments_count || 0}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-white/10 hover:text-white px-2"
              onClick={() => setShowShareDialog(true)}
            >
              <Send className="mr-1 h-4 w-4" />
            </Button>
          </div>
          <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Read More
            </Button>
          </Link>
        </div>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start w-full">
            {post.hashtags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="border-green-400 text-green-400 hover:bg-green-400/10 cursor-pointer"
              >
                #{tag.name}
              </Badge>
            ))}
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
