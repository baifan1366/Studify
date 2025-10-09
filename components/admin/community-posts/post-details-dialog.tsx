"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  MessageSquare, 
  Heart, 
  Flag, 
  Eye,
  Ban,
  User,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAdminCommunityPost, useAdminPostComments } from "@/hooks/admin/use-admin-community-post";
import { useFormat } from "@/hooks/use-format";

interface PostDetailsDialogProps {
  postId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBanPost: (postId: number) => void;
  onBanComment: (commentId: number) => void;
  onBanUser: (userId: string, sourceType?: 'post' | 'comment', sourceId?: number) => void;
}

export function PostDetailsDialog({ 
  postId, 
  open, 
  onOpenChange, 
  onBanPost, 
  onBanComment, 
  onBanUser 
}: PostDetailsDialogProps) {
  const t = useTranslations('AdminCommunityPosts');
  const { formatRelativeTime } = useFormat();
  
  const [activeTab, setActiveTab] = useState('details');
  const [showAllComments, setShowAllComments] = useState(false);

  // Fetch post details
  const { 
    data: post, 
    isLoading: postLoading, 
    error: postError 
  } = useAdminCommunityPost(postId || undefined);

  // Fetch comments
  const { 
    data: commentsData, 
    isLoading: commentsLoading, 
    error: commentsError 
  } = useAdminPostComments(postId || undefined, {
    limit: showAllComments ? 100 : 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const comments = commentsData?.comments || [];
  const totalComments = commentsData?.total || 0;

  if (!open || !postId) return null;

  if (postError || !post) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {t('error_loading_post')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t('post_not_found')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('post_details')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('post_details_tab')}</TabsTrigger>
            <TabsTrigger value="comments">
              {t('comments_tab')} ({totalComments})
            </TabsTrigger>
            <TabsTrigger value="actions">{t('admin_actions_tab')}</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Post Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              {postLoading ? (
                <div className="space-y-4">
                  <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Post Header */}
                  <Card className="bg-transparent p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={post.author.avatar_url} alt={post.author.full_name} />
                        <AvatarFallback>
                          {post.author.full_name?.[0]?.toUpperCase() || 
                           post.author.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {post.title || t('untitled_post')}
                          </h2>
                          {post.group && (
                            <Badge variant="secondary">{post.group.name}</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{post.author.full_name || post.author.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatRelativeTime(post.created_at)}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="h-4 w-4 text-gray-500" />
                            <span>{post.comment_count || 0} {t('comments')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Heart className="h-4 w-4 text-gray-500" />
                            <span>{post.reaction_count || 0} {t('reactions')}</span>
                          </div>
                          {(post.total_reports || 0) > 0 && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                              <Flag className="h-4 w-4" />
                              <span>{post.total_reports} {t('reports')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Post Content */}
                  {post.body && (
                    <Card className="bg-transparent p-6">
                      <h3 className="font-semibold mb-4">{t('post_content')}</h3>
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{post.body}</p>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-6">
              {commentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="bg-transparent p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <Card className="bg-transparent p-8">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('no_comments')}
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {comments.map((comment) => (
                    <Card key={comment.id} className="bg-transparent p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={comment.author.avatar_url} alt={comment.author.full_name} />
                            <AvatarFallback>
                              {comment.author.full_name?.[0]?.toUpperCase() || 
                               comment.author.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm">
                                {comment.author.full_name || comment.author.email}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              {comment.body}
                            </p>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Heart className="h-3 w-3" />
                                <span>{comment.reaction_count || 0}</span>
                              </div>
                              {(comment.total_reports || 0) > 0 && (
                                <div className="flex items-center gap-1 text-xs text-red-500">
                                  <Flag className="h-3 w-3" />
                                  <span>{comment.total_reports}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBanUser(comment.author.user_id, 'comment', comment.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
                          >
                            <User className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onBanComment(comment.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Show More Comments */}
                  {!showAllComments && totalComments > 10 && (
                    <div className="text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllComments(true)}
                      >
                        <ChevronDown className="h-4 w-4 mr-2" />
                        {t('show_more_comments', { count: totalComments - 10 })}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Admin Actions Tab */}
            <TabsContent value="actions" className="space-y-6 mt-6">
              <Card className="bg-transparent p-6">
                <h3 className="font-semibold mb-4">{t('admin_actions')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium">{t('ban_post_action')}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('ban_post_description')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => onBanPost(post.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      {t('ban_post')}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium">{t('ban_author_action')}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('ban_author_description')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => onBanUser(post.author.user_id, 'post', post.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('ban_user')}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
