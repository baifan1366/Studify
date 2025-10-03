'use client';

import { useTranslations } from 'next-intl';
import { useCommunityRecommendations } from '@/hooks/community/use-community-recommendations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Star, 
  Users, 
  Hash,
  User,
  MessageCircle,
  Heart,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RecommendedPost } from '@/interface/community/recommendation-interface';

interface CompactRecommendationsProps {
  limit?: number;
  q?: string;
  hashtags?: string[];
}

export default function CompactRecommendations({ 
  limit = 3,
  q,
  hashtags
}: CompactRecommendationsProps) {
  const t = useTranslations('CompactRecommendations');
  const { 
    data: recommendations, 
    isLoading, 
    error 
  } = useCommunityRecommendations({
    limit,
    q,
    hashtags,
    enabled: true
  });

  if (isLoading) {
    return <RecommendationsLoading />;
  }

  if (error || !recommendations?.recommendations?.length) {
    return null; // Don't show anything if there's an error or no recommendations
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-semibold text-white">
          {t('recommend_for_you')}
        </h2>
        <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">
          {recommendations.recommendations.length} {t('items_count')}
        </Badge>
      </div>

      {(q || (hashtags && hashtags.length > 0)) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {q && (
            <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-300">
              {t('keywords')}: {q}
            </Badge>
          )}
          {hashtags && hashtags.length > 0 && hashtags.map((tag, i) => (
            <Badge key={`${tag}-${i}`} variant="outline" className="text-xs border-blue-400/30 text-blue-300">
              # {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.recommendations.slice(0, limit).map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CompactRecommendationCard post={post} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CompactRecommendationCard({ post }: { post: RecommendedPost }) {
  const t = useTranslations('CompactRecommendations');
  
  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200 group">
      <CardContent className="p-4">
        {/* Score Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Star className="w-3 h-3 mr-1" />
            {post.recommendation_score}%
          </Badge>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <TrendingUp className="w-3 h-3" />
            {t('recommended')}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-3">
          {post.title && (
            <h3 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
              {post.title}
            </h3>
          )}
          
          {post.body && (
            <p className="text-sm text-gray-400 mb-2 line-clamp-2">
              {post.body}
            </p>
          )}
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.hashtags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                <Hash className="w-2 h-2 mr-1" />
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Recommendation Reason */}
        {post.recommendation_reasons && post.recommendation_reasons.length > 0 && (
          <div className="mb-3 space-y-1">
            {post.recommendation_reasons.slice(0, 2).map((reason, idx) => (
              <p key={idx} className="text-xs text-blue-400 line-clamp-1">
                💡 {reason}
              </p>
            ))}
          </div>
        )}

        {/* Post Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-2">
            {post.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {post.author.display_name}
              </span>
            )}
            {post.group && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {post.group.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {post.comments_count !== undefined && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {post.comments_count}
              </span>
            )}
            {post.total_reactions !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {post.total_reactions}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/community/${post.group?.slug}/posts/${post.slug}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              {t('read_more')}
            </Button>
          </Link>
      </CardContent>
    </Card>
  );
}

function RecommendationsLoading() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
