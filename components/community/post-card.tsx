import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Heart, Users, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Post } from '@/interface/community/post-interface';
import Link from 'next/link';

export default function PostCard({ post }: { post: Post }) {
  const t = useTranslations('CommunityPostCard');
  
  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
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
            <CardTitle className="text-lg leading-tight hover:text-blue-300 cursor-pointer">
              <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
                {post.title}
              </Link>
            </CardTitle>
            <p className="text-sm text-gray-300 mt-1">
              by {post.author?.display_name || 'Unknown'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-gray-200 line-clamp-3">{post.body}</p>
      </CardContent>
      <CardFooter className="flex justify-between pt-3">
        <div className="flex space-x-4 text-gray-300">
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
        <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Read More
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
