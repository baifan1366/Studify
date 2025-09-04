'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MessageSquare, ThumbsUp, Heart, Users, Loader2, Reply, Trash2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/interface/community/post-interface';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Comment } from '@/interface/community/comment-interface';
import { usePostDetail } from '@/hooks/community/use-post-detail';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/community/use-comments';
import { useToggleReaction } from '@/hooks/community/use-reactions';
import { useFormat } from '@/hooks/use-format';
import { useTranslations } from 'next-intl';

// Reaction button component
const ReactionButton = ({ emoji, count, isActive, onClick, disabled }: {
  emoji: string;
  count: number;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button 
    variant="ghost" 
    size="sm" 
    className={`hover:bg-white/10 hover:text-white px-2 ${
      isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    <span className="mr-1">{emoji}</span>
    <span className="text-xs">{count}</span>
  </Button>
);

// Comment form component
const CommentForm = ({ groupSlug, postSlug, parentId, onCancel, placeholder }: {
  groupSlug: string;
  postSlug: string;
  parentId?: number;
  onCancel?: () => void;
  placeholder?: string;
}) => {
  const [body, setBody] = useState('');
  const t = useTranslations('CommunityPostDetail');
  const createCommentMutation = useCreateComment(groupSlug, postSlug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        groupSlug,
        postSlug,
        body: body.trim(),
        parent_id: parentId?.toString()
      });
      setBody('');
      onCancel?.();
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder || t('comment_form.placeholder')}
        className="min-h-[80px] bg-black/20 border-white/10 text-white resize-none"
        disabled={createCommentMutation.isPending}
      />
      <div className="flex gap-2">
        <Button 
          type="submit" 
          size="sm"
          disabled={!body.trim() || createCommentMutation.isPending}
        >
          {createCommentMutation.isPending ? t('comment_form.submitting') : t('comment_form.submit')}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={onCancel}
            disabled={createCommentMutation.isPending}
          >
            {t('comment_form.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
};

// Individual comment component
const CommentItem = ({ comment, groupSlug, postSlug, depth = 0 }: {
  comment: Comment;
  groupSlug: string;
  postSlug: string;
  depth?: number;
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const { formatRelativeTime } = useFormat();
  const t = useTranslations('CommunityPostDetail');
  const deleteCommentMutation = useDeleteComment(groupSlug, postSlug);
  const toggleReactionMutation = useToggleReaction(groupSlug, postSlug);

  const handleReaction = (emoji: string) => {
    toggleReactionMutation.mutate({
      groupSlug,
      postSlug,
      emoji,
      target_type: 'comment',
      target_id: comment.id.toString()
    });
  };

  const handleDelete = () => {
    if (confirm(t('comment_actions.confirm_delete'))) {
      deleteCommentMutation.mutate({
        groupSlug,
        postSlug,
        commentId: comment.id.toString()
      });
    }
  };

  const replies = comment.replies || [];
  const marginLeft = depth > 0 ? `${Math.min(depth * 24, 96)}px` : '0px';

  return (
    <div style={{ marginLeft }} className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author?.avatar_url} alt={comment.author?.display_name} />
          <AvatarFallback>{comment.author?.display_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-black/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-white">{comment.author?.display_name}</p>
              <p className="text-xs text-gray-400">{formatRelativeTime(comment.created_at)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowReplyForm(!showReplyForm)}>
                  <Reply className="h-4 w-4 mr-2" />
                  {t('comment_actions.reply')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('comment_actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm text-gray-300 mb-3">{comment.body}</p>
          
          {/* Reaction buttons */}
          <div className="flex gap-1">
            <ReactionButton
              emoji="👍"
              count={comment.reactions?.['👍'] || 0}
              onClick={() => handleReaction('👍')}
              disabled={toggleReactionMutation.isPending}
            />
            <ReactionButton
              emoji="❤️"
              count={comment.reactions?.['❤️'] || 0}
              onClick={() => handleReaction('❤️')}
              disabled={toggleReactionMutation.isPending}
            />
            <ReactionButton
              emoji="😂"
              count={comment.reactions?.['😂'] || 0}
              onClick={() => handleReaction('😂')}
              disabled={toggleReactionMutation.isPending}
            />
            <ReactionButton
              emoji="😡"
              count={comment.reactions?.['😡'] || 0}
              onClick={() => handleReaction('😡')}
              disabled={toggleReactionMutation.isPending}
            />
          </div>
        </div>
      </div>
      
      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-11">
          <CommentForm
            groupSlug={groupSlug}
            postSlug={postSlug}
            parentId={comment.id}
            onCancel={() => setShowReplyForm(false)}
            placeholder={t('comment_form.reply_placeholder')}
          />
        </div>
      )}
      
      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
          >
            {showReplies ? t('comment_actions.hide_replies') : t('comment_actions.show_replies')} ({replies.length})
          </Button>
          {showReplies && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  groupSlug={groupSlug}
                  postSlug={postSlug}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Build tree structure from flat comments
const buildCommentTree = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<number, Comment>();
  const rootComments: Comment[] = [];
  
  // First pass: create map and initialize replies array
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  
  // Second pass: build tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });
  
  return rootComments;
};

const PostDetailContent = ({ post, groupSlug, postSlug }: { post: Post; groupSlug: string; postSlug: string }) => {
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('tree');
  const { formatRelativeTime } = useFormat();
  const t = useTranslations('CommunityPostDetail');
  const toggleReactionMutation = useToggleReaction(groupSlug, postSlug);
  const { data: comments = [], isLoading: commentsLoading } = useComments(groupSlug, postSlug);

  const handlePostReaction = (emoji: string) => {
    toggleReactionMutation.mutate({
      groupSlug,
      postSlug,
      emoji,
      target_type: 'post',
      target_id: post.id.toString()
    });
  };

  const displayComments = viewMode === 'tree' ? buildCommentTree(comments) : comments;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.group && (
                <Link href={`/community/${post.group.slug}`}>
                  <Badge variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10 cursor-pointer">
                    <Users className="w-3 h-3 mr-1" />
                    {post.group.name}
                  </Badge>
                </Link>
              )}
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeTime(post.created_at || new Date().toISOString())}
              </div>
            </div>
            <CardTitle className="text-2xl leading-tight">
              {post.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author?.avatar_url} alt={post.author?.display_name} />
                <AvatarFallback>{post.author?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-300">
                {post.author?.display_name || t('unknown_author')}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="prose prose-invert max-w-none text-gray-200">
            {post.body}
        </div>
      </CardContent>
      <CardContent className="flex justify-between pt-3">
        <div className="flex space-x-2">
          <ReactionButton
            emoji="👍"
            count={post.reactions?.['👍'] || 0}
            onClick={() => handlePostReaction('👍')}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="❤️"
            count={post.reactions?.['❤️'] || 0}
            onClick={() => handlePostReaction('❤️')}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="😂"
            count={post.reactions?.['😂'] || 0}
            onClick={() => handlePostReaction('😂')}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="😡"
            count={post.reactions?.['😡'] || 0}
            onClick={() => handlePostReaction('😡')}
            disabled={toggleReactionMutation.isPending}
          />
          <Button variant="ghost" size="sm" className="text-gray-300 px-2">
            <MessageSquare className="mr-1 h-4 w-4" /> 
            <span className="text-xs">{comments.length}</span>
          </Button>
        </div>
      </CardContent>
      
      {/* Comments Section */}
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{t('comments_title')} ({comments.length})</h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'flat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('flat')}
            >
              {t('view_modes.flat')}
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              {t('view_modes.tree')}
            </Button>
          </div>
        </div>
        
        {/* Comment Form */}
        <div className="mb-6">
          <CommentForm groupSlug={groupSlug} postSlug={postSlug} />
        </div>
        
        {/* Comments List */}
        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {t('empty_comments')}
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'tree' ? (
              displayComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  groupSlug={groupSlug}
                  postSlug={postSlug}
                />
              ))
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  groupSlug={groupSlug}
                  postSlug={postSlug}
                  depth={0}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSpinner = () => {
  const t = useTranslations('CommunityPostDetail');
  
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      <span className="ml-2 text-gray-400">{t('loading')}</span>
    </div>
  );
};

const ErrorMessage = ({ message }: { message: string }) => (
  <Card className="bg-red-500/10 backdrop-blur-lg border border-red-500/20 text-white rounded-xl shadow-lg">
    <CardContent className="p-6 text-center">
      <p className="text-red-400">{message}</p>
    </CardContent>
  </Card>
);

/**
 * Client component wrapper for post detail with React Query
 */
export default function PostDetailClient({ groupSlug, postSlug }: { groupSlug: string, postSlug: string }) {
    const { data: post, isLoading, error } = usePostDetail(groupSlug, postSlug);
    const t = useTranslations('CommunityPostDetail');

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorMessage message={t('error_loading')} />;
    }

    if (!post) {
        return <ErrorMessage message={t('post_not_found')} />;
    }

    return <PostDetailContent post={post} groupSlug={groupSlug} postSlug={postSlug} />;
}
