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
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RecommendedPost } from '@/interface/community/recommendation-interface';
import { useRef, useState, useEffect } from 'react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allRecommendations, setAllRecommendations] = useState<RecommendedPost[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const {
    data: recommendations,
    isLoading,
    error,
    refetch
  } = useCommunityRecommendations({
    limit,
    offset: currentOffset,
    q,
    hashtags,
    enabled: true
  });

  // Update all recommendations when new data arrives
  useEffect(() => {
    if (recommendations?.recommendations) {
      if (currentOffset === 0) {
        // Initial load
        setAllRecommendations(recommendations.recommendations);
      } else {
        // Append new recommendations
        setAllRecommendations(prev => [...prev, ...recommendations.recommendations]);
      }
      setIsLoadingMore(false);
    }
  }, [recommendations, currentOffset]);

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);

      // Check if we can scroll right or need to load more
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10;
      const hasMore = recommendations?.has_more || false;
      setCanScrollRight(!isAtEnd || hasMore);
    }
  };

  // Initialize scroll state
  useEffect(() => {
    if (allRecommendations.length > 0) {
      setTimeout(checkScroll, 100);
    }
  }, [allRecommendations, recommendations]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const scrollRight = async () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const isNearEnd = scrollLeft >= scrollWidth - clientWidth - 400;

      // If near the end and has more data, load more
      if (isNearEnd && recommendations?.has_more && !isLoadingMore) {
        setIsLoadingMore(true);
        setCurrentOffset(prev => prev + limit);
        // refetch will be triggered by the offset change
      }

      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  if (isLoading && currentOffset === 0) {
    return <RecommendationsLoading />;
  }

  if (error || (!isLoading && allRecommendations.length === 0)) {
    return null; // Don't show anything if there's an error or no recommendations
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('recommend_for_you')}
        </h2>
        <Badge variant="outline" className="text-xs">
          {allRecommendations.length} {t('items_count')}
          {recommendations?.has_more && ' +'}
        </Badge>
      </div>

      {(q || (hashtags && hashtags.length > 0)) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {q && (
            <Badge variant="outline" className="text-xs">
              {t('keywords')}: {q}
            </Badge>
          )}
          {hashtags && hashtags.length > 0 && hashtags.map((tag, i) => (
            <Badge key={`${tag}-${i}`} variant="outline" className="text-xs">
              # {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Recommendations Carousel with Arrows */}
      <div className="relative group">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background/90 transition-all"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onLoad={checkScroll}
          className="flex gap-4 overflow-x-auto px-12"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {allRecommendations.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-80"
            >
              <CompactRecommendationCard post={post} />
            </motion.div>
          ))}

          {/* Loading indicator */}
          {isLoadingMore && (
            <div className="flex-shrink-0 w-80">
              <Card className="bg-card border-border h-full">
                <CardContent className="p-4 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading more...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-background/90 transition-all"
          onClick={scrollRight}
          disabled={!canScrollRight && !recommendations?.has_more}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function CompactRecommendationCard({ post }: { post: RecommendedPost }) {
  const t = useTranslations('CompactRecommendations');

  // Debug: 打印 post 数据
  console.log('🔍 [CompactRecommendationCard] Post data:', {
    id: post.id,
    title: post.title,
    has_details: !!post.recommendation_details,
    details: post.recommendation_details,
    ai_keywords: post.recommendation_details?.ai_keywords
  });

  return (
    <Card className="bg-card border-border hover:bg-muted/50 transition-all duration-200 group h-full w-full max-w-full overflow-hidden">

      <CardContent className="p-4 flex flex-col justify-between h-full">
        {/* Score Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
            <Star className="w-3 h-3 mr-1" />
            {post.recommendation_score}%
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            {t('recommended')}
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-3">
          {post.title && (
            <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
          )}

          {post.body && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {post.body}
            </p>
          )}
        </div>

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.hashtags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                <Hash className="w-2 h-2 mr-1" />
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Recommendation Reason */}
        {post.recommendation_reasons && post.recommendation_reasons.length > 0 && (
          <div className="mb-3">
            {/* 简要理由 */}
            <div className="space-y-1">
              {post.recommendation_reasons.slice(0, 3).map((reason, idx) => (
                <p key={idx} className="text-xs text-primary">
                  💡 {reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 详细信息按钮 - 始终显示 */}
        <div className="mb-3">
          <details className="group">
            <summary className="text-xs font-medium text-primary cursor-pointer hover:text-primary/80 transition-colors list-none flex items-center gap-1 py-1 px-2 bg-primary/10 rounded-md hover:bg-primary/20">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              <span>查看详细匹配分数</span>
            </summary>
            {post.recommendation_details ? (
              <div className="mt-2 p-3 bg-muted/30 rounded-md space-y-2 text-xs">
                <div className="font-medium text-foreground mb-2">匹配准确度：</div>

                {/* AI Keywords Section - 显示在最前面 */}
                {post.recommendation_details.ai_keywords && post.recommendation_details.ai_keywords.length > 0 && (
                  <div className="mb-3 p-2 bg-primary/5 rounded border border-primary/20">
                    <div className="flex items-start gap-2">
                      <span className="text-primary font-medium">🤖</span>
                      <div className="flex-1">
                        <div className="text-muted-foreground mb-1">你曾问过关于：</div>
                        <div className="flex flex-wrap gap-1">
                          {post.recommendation_details.ai_keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {post.recommendation_details.ai_similarity !== undefined && post.recommendation_details.ai_similarity > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">AI学习匹配：</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${post.recommendation_details.ai_similarity * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-primary w-12 text-right">
                        {Math.round(post.recommendation_details.ai_similarity * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {post.recommendation_details.interest_overlap !== undefined && post.recommendation_details.interest_overlap > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">兴趣匹配：</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${post.recommendation_details.interest_overlap * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-12 text-right">
                        {Math.round(post.recommendation_details.interest_overlap * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {post.recommendation_details.hashtag_relevance !== undefined && post.recommendation_details.hashtag_relevance > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">标签匹配：</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${post.recommendation_details.hashtag_relevance * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-12 text-right">
                        {Math.round(post.recommendation_details.hashtag_relevance * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {post.recommendation_details.semantic_similarity !== undefined && post.recommendation_details.semantic_similarity > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">内容相似度：</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${post.recommendation_details.semantic_similarity * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-12 text-right">
                        {Math.round(post.recommendation_details.semantic_similarity * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {post.recommendation_details.freshness !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">新鲜度：</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all"
                          style={{ width: `${post.recommendation_details.freshness * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-12 text-right">
                        {Math.round(post.recommendation_details.freshness * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-border">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-foreground">总分：</span>
                    <span className="text-primary text-sm">{post.recommendation_score}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                暂无详细匹配数据
              </div>
            )}
          </details>
        </div>

        {/* Post Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
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
        <Link href={`/community/${post.group?.slug || 'undefined'}/posts/${post.slug}`}>
          <Button
            size="sm"
            variant="outline"
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
          <Card key={i} className="bg-card border-border">
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
