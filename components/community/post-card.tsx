import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Post {
  id: number;
  title: string;
  body: string;
  author: {
    display_name: string;
  };
  commentsCount: number;
  reactions: Record<string, number>;
}

export default function PostCard({ post }: { post: Post }) {
  const t = useTranslations('CommunityPostCard');
  return (
    <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle>{post.title}</CardTitle>
        <p className="text-sm text-gray-300">{t('by_prefix')}{post.author.display_name}</p>
      </CardHeader>
      <CardContent>
        <p>{post.body}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-4 text-gray-300">
          <Button variant="ghost" className="hover:bg-white/10 hover:text-white">
            <ThumbsUp className="mr-2 h-4 w-4" /> {post.reactions['👍'] || 0}
          </Button>
          <Button variant="ghost" className="hover:bg-white/10 hover:text-white">
            <Heart className="mr-2 h-4 w-4" /> {post.reactions['❤️'] || 0}
          </Button>
          <Button variant="ghost" className="hover:bg-white/10 hover:text-white">
            <MessageSquare className="mr-2 h-4 w-4" /> {post.commentsCount}
          </Button>
        </div>
        <Button className="bg-white/10 hover:bg-white/20 border border-white/20">{t('view_post_button')}</Button>
      </CardFooter>
    </Card>
  );
}
