'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  MessageCircle, 
  Users, 
  ArrowRight, 
  Clock, 
  Eye,
  Heart,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'post' | 'community';
  author?: string;
  tags?: string[];
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
    members?: number;
  };
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  thumbnail?: string;
  slug?: string;
}

interface AIContentRecommendationsProps {
  aiResponse: string;
  userId?: number;
  questionContext?: string;
  className?: string;
}

export default function AIContentRecommendations({
  aiResponse,
  userId,
  questionContext,
  className = ''
}: AIContentRecommendationsProps) {
  const t = useTranslations('AIAssistant');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (aiResponse && aiResponse.length > 10) {
      fetchRecommendations();
    }
  }, [aiResponse, userId]);

  const fetchRecommendations = async () => {
    if (!aiResponse.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/content-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiResponse,
          questionContext,
          userId,
          maxRecommendations: 6
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'post': return MessageCircle;
      case 'community': return Users;
      default: return BookOpen;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'text-blue-500';
      case 'post': return 'text-green-500';
      case 'community': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };

  const handleItemClick = (item: RecommendationItem) => {
    const baseUrl = {
      course: '/course',
      post: '/community/post',
      community: '/community/group'
    }[item.type];
    
    if (item.slug && baseUrl) {
      window.open(`${baseUrl}/${item.slug}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className={`mt-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {t('recommendations.loading')}
          </h3>
        </div>
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !recommendations.length) {
    return null;
  }

  const courseRecommendations = recommendations.filter(r => r.type === 'course');
  const postRecommendations = recommendations.filter(r => r.type === 'post');
  const communityRecommendations = recommendations.filter(r => r.type === 'community');

  return (
    <div className={`mt-6 space-y-6 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {t('recommendations.title')}
        </h3>
      </div>

      {/* 相关课程 */}
      {courseRecommendations.length > 0 && (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-blue-200 dark:border-blue-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {t('recommendations.related_courses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {courseRecommendations.slice(0, 2).map((course) => (
                <div 
                  key={course.id} 
                  className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(course)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">
                      {course.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {course.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {course.difficulty}
                        </Badge>
                      )}
                      {course.estimatedTime && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {course.estimatedTime}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 相关帖子 */}
      {postRecommendations.length > 0 && (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-green-200 dark:border-green-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              {t('recommendations.related_posts')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {postRecommendations.slice(0, 3).map((post) => (
                <div 
                  key={post.id} 
                  className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(post)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {post.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {post.author && (
                        <span>by {post.author}</span>
                      )}
                      {post.stats?.views && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.stats.views}
                        </div>
                      )}
                      {post.stats?.likes && (
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.stats.likes}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 相关社区 */}
      {communityRecommendations.length > 0 && (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-purple-200 dark:border-purple-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              {t('recommendations.related_communities')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {communityRecommendations.slice(0, 2).map((community) => (
                <div 
                  key={community.id} 
                  className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(community)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">
                      {community.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      {community.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {community.stats?.members && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {community.stats.members} members
                        </div>
                      )}
                      {community.tags && community.tags.length > 0 && (
                        <div className="flex gap-1">
                          {community.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
