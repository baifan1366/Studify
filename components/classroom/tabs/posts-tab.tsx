'use client';

import React, { useState } from 'react';
import { useUser } from '@/hooks/profile/use-user';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

// 导入帖子相关hooks
import { useClassroomPosts } from '@/hooks/classroom/use-classroom-posts';
import { useCreatePost } from '@/hooks/community/use-create-post';
import { useCreateComment } from '@/hooks/community/use-create-comment';
import { useRealtimePosts } from '@/hooks/use-realtime-posts';
import { useRealtimeComments } from '@/hooks/realtime/use-realtime-comments';

// 帖子接口
interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'student';
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  comments?: Comment[];
}

// 评论接口
interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'student';
  createdAt: string;
}

// 实时评论组件
interface RealtimeCommentsSectionProps {
  post: Post;
  t: any; // 国际化翻译函数
  formatDate: (date: string) => string;
}

function RealtimeCommentsSection({ post, t, formatDate }: RealtimeCommentsSectionProps) {
  // 使用实时评论hook
  const { comments } = useRealtimeComments(post.id, post.comments || []);
  
  return (
    <>
      {comments?.length > 0 && (
        <div className="space-y-3 pl-4 border-l-2 border-white/10">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`https://avatar.vercel.sh/${comment.authorId}?size=24`} />
                  <AvatarFallback className="text-xs">{comment.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/90">{comment.authorName}</span>
                  {comment.authorRole === 'tutor' && (
                    <Badge variant="secondary" className="text-xs">
                      {t('tutor_badge')}
                    </Badge>
                  )}
                  <span className="text-xs text-white/60">{formatDate(comment.createdAt)}</span>
                </div>
              </div>
              <p className="text-sm text-white/80 pl-8">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function PostsTab({ classroomId }: { classroomId: string }) {
  const { data: user } = useUser();
  const t = useTranslations('ClassroomDetailPage.posts');
  const { toast } = useToast();
  
  // 获取帖子列表
  const { data: initialPosts, isLoading, refetch } = useClassroomPosts(classroomId);
  
  // 使用实时帖子
  const { posts } = useRealtimePosts(classroomId, initialPosts || []);
  
  // 创建帖子mutation
  const createPostMutation = useCreatePost();
  
  // 创建评论mutation
  const createCommentMutation = useCreateComment();
  
  // 新帖子内容
  const [newPostContent, setNewPostContent] = useState('');
  
  // 评论内容
  const [commentContents, setCommentContents] = useState<Record<string, string>>({});
  
  // 展开的评论区
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // 处理创建帖子
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast({
        title: t('post_empty_error_title'),
        description: t('post_empty_error_description'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await createPostMutation.mutateAsync({
        classroomId,
        content: newPostContent,
        // 附件功能将在后续实现
        attachments: [],
      });
      
      // 清空输入框并刷新帖子列表
      setNewPostContent('');
      refetch();
      
      toast({
        title: t('post_success_title'),
        description: t('post_success_description'),
      });
    } catch (error) {
      toast({
        title: t('post_error_title'),
        description: t('post_error_description'),
        variant: 'destructive',
      });
    }
  };
  
  // 处理创建评论
  const handleCreateComment = async (postId: string) => {
    const content = commentContents[postId];
    
    if (!content?.trim()) {
      toast({
        title: t('comment_empty_error_title'),
        description: t('comment_empty_error_description'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await createCommentMutation.mutateAsync({
        classroomId,
        postId,
        content,
      });
      
      // 清空输入框并刷新帖子列表
      setCommentContents(prev => ({ ...prev, [postId]: '' }));
      refetch();
      
      toast({
        title: t('comment_success_title'),
        description: t('comment_success_description'),
      });
    } catch (error) {
      toast({
        title: t('comment_error_title'),
        description: t('comment_error_description'),
        variant: 'destructive',
      });
    }
  };
  
  // 切换评论区展开状态
  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="space-y-6">
      {/* 创建帖子区域 */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-medium text-white/90">{t('create_post_title')}</h3>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t('create_post_placeholder')}
            className="min-h-24 bg-white/5 border-white/10 text-white/80"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            {/* 附件上传功能将在后续实现 */}
            <Button variant="outline" size="sm" className="text-white/70">
              {t('attach_file')}
            </Button>
          </div>
          <Button 
            onClick={handleCreatePost}
            disabled={createPostMutation.isLoading}
          >
            {createPostMutation.isLoading ? t('posting') : t('post')}
          </Button>
        </CardFooter>
      </Card>
      
      {/* 帖子列表 */}
      {isLoading ? (
        // 加载状态
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : posts?.length ? (
        // 帖子列表
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${post.authorId}?size=32`} />
                        <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white/90">{post.authorName}</span>
                          {post.authorRole === 'tutor' && (
                            <Badge variant="secondary" className="text-xs">
                              {t('tutor_badge')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/60">{formatDate(post.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 whitespace-pre-wrap">{post.content}</p>
                  
                  {/* 附件预览将在后续实现 */}
                  {post.attachments?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="p-2 bg-white/5 rounded border border-white/10 text-sm flex items-center gap-2"
                        >
                          <span>{attachment.name}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <span className="sr-only">{t('download')}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleComments(post.id)}
                    className="text-white/70"
                  >
                    {expandedComments[post.id] ? t('hide_comments') : t('show_comments')}
                    <span className="ml-1">({post.comments?.length || 0})</span>
                  </Button>
                  
                  {/* 评论区 */}
                  {expandedComments[post.id] && (
                    <div className="w-full space-y-4">
                      {/* 评论列表 */}
                      <RealtimeCommentsSection post={post} t={t} formatDate={formatDate} />
                      
                      {/* 评论输入框 */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder={t('comment_placeholder')}
                          className="min-h-12 bg-white/5 border-white/10 text-white/80 text-sm"
                          value={commentContents[post.id] || ''}
                          onChange={(e) => setCommentContents(prev => ({ ...prev, [post.id]: e.target.value }))}
                        />
                        <Button 
                          size="sm"
                          onClick={() => handleCreateComment(post.id)}
                          disabled={createCommentMutation.isLoading}
                        >
                          {createCommentMutation.isLoading ? t('commenting') : t('comment')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        // 无帖子状态
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-xl text-center p-8">
          <p className="text-white/70">{t('no_posts')}</p>
        </Card>
      )}
    </div>
  );
}