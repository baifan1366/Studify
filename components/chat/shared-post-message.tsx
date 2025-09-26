"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Users, 
  Clock, 
  Loader2,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  Heart
} from "lucide-react";
import Link from "next/link";
import { Post } from "@/interface/community/post-interface";

interface SharedPostMessageProps {
  postId: string;
  className?: string;
}

export default function SharedPostMessage({ 
  postId, 
  className = "" 
}: SharedPostMessageProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取帖子详情
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        let response: Response;
        // 如果 content 是 "groupSlug|postSlug" 格式，优先走基于 slug 的接口
        if (postId.includes('|')) {
          const [groupSlug, postSlug] = postId.split('|');
          response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}`);
        } else {
          // 兼容旧数据：使用基于 id/public_id 的接口
          response = await fetch(`/api/community/posts/${postId}`);
        }
        
        if (response.ok) {
          const data = await response.json();
          // 兼容两种返回结构：{ post } 或直接返回对象
          setPost(data.post ?? data);
        } else {
          if (response.status === 403) {
            setError("This post is in a private group. Join the group to view it.");
          } else if (response.status === 404) {
            setError("Post not found or it may have been deleted.");
          } else {
            setError("Post not available at the moment.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch shared post:", err);
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  // 格式化时间
  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading post...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !post) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center text-gray-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error || "Post unavailable"}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors ${className}`}>
      <CardContent className="p-4">
        {/* 分享标识 */}
        <div className="flex items-center gap-2 mb-3 text-blue-400">
          <ExternalLink className="h-4 w-4" />
          <span className="text-xs font-medium">Shared Post</span>
        </div>

        {/* 帖子内容 */}
        <div className="space-y-3">
          {/* 作者信息和群组 */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.group && (
                  <Badge
                    variant="outline"
                    className="border-blue-400 text-blue-400 text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {post.group.name}
                  </Badge>
                )}
                <div className="flex items-center text-xs text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(post.created_at || new Date().toISOString())}
                </div>
              </div>
              
              {/* 标题 */}
              <h4 className="text-sm font-semibold text-white line-clamp-2 mb-1">
                {post.title}
              </h4>
              
              {/* 作者 */}
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {post.author?.display_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-300">
                  {post.author?.display_name || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* 帖子内容预览 */}
          <p className="text-sm text-gray-300 line-clamp-3">
            {post.body}
          </p>

          {/* 图片预览 (如果有) */}
          {post.files && post.files.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {post.files.slice(0, 4).map((file, index) => (
                <div key={file.id} className="relative">
                  {file.mime_type.startsWith("image/") ? (
                    <img
                      src={file.url}
                      alt={file.file_name}
                      className="w-full h-20 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-20 bg-gray-700 rounded-md flex items-center justify-center">
                      <span className="text-xs text-gray-400 truncate px-2">
                        {file.file_name}
                      </span>
                    </div>
                  )}
                  {index === 3 && post.files && post.files.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        +{post.files.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{post.reactions?.["👍"] || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{post.reactions?.["❤️"] || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{post.comments_count || 0}</span>
            </div>
          </div>

          {/* 查看原帖按钮 */}
          <div className="pt-2 border-t border-gray-700">
            <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original Post
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
