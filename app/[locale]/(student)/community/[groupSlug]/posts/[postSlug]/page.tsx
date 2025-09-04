import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MessageSquare, ThumbsUp, Heart, Users } from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/interface/community/post-interface';
import { Button } from '@/components/ui/button';
import { Comment } from '@/interface/community/comment-interface';
import { notFound } from 'next/navigation';
import { getPostDetailsForPage } from '@/app/actions';

const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '刚刚';
  if (diffInHours < 24) return `${diffInHours}小时前`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}天前`;
  return postDate.toLocaleDateString();
};

const PostDetailContent = ({ post }: { post: Post }) => {
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
                {formatTimeAgo(post.created_at || new Date().toISOString())}
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
                {post.author?.display_name || '未知作者'}
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
        <div className="flex space-x-2 text-gray-300">
          <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-white px-2">
            <ThumbsUp className="mr-1 h-4 w-4" /> 
            <span className="text-xs">{post.reactions?.['👍'] || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-white px-2">
            <Heart className="mr-1 h-4 w-4" /> 
            <span className="text-xs">{post.reactions?.['❤️'] || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-white px-2">
            <MessageSquare className="mr-1 h-4 w-4" /> 
            <span className="text-xs">{post.comments_count || 0}</span>
          </Button>
        </div>
      </CardContent>
      <CardContent>
        <h3 className="text-xl font-semibold mb-4">评论 ({post.comments?.length || 0})</h3>
        <div className="space-y-4">
          {post.comments?.map((comment: Comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author?.avatar_url} alt={comment.author?.display_name} />
                <AvatarFallback>{comment.author?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-black/20 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-white">{comment.author?.display_name}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(comment.created_at)}</p>
                </div>
                <p className="text-sm text-gray-300 mt-1">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * @description 文章详情页面 - 直接调用 Server Action 获取数据
 * @param params - 包含 groupSlug 和 postSlug 的路由参数
 */
export default async function PostDetailPage({ params }: { params: { groupSlug: string, postSlug: string } }) {
    const { groupSlug, postSlug } = params;

    if (!groupSlug || !postSlug) {
        notFound();
    }

    const post = await getPostDetailsForPage(groupSlug, postSlug);

    if (!post) {
        notFound();
    }

    return <PostDetailContent post={post} />;
}