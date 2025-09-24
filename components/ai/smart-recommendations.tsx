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
  Sparkles,
  User,
  Star,
  Calendar
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SmartRecommendationsProps {
  type: 'courses' | 'posts' | 'groups';
  userId?: number;
  context?: string;
  maxResults?: number;
  className?: string;
}

interface RecommendationDisplayProps {
  title: string;
  items: any[];
  type: 'courses' | 'posts' | 'groups';
  loading: boolean;
}

function RecommendationDisplay({ title, items, type, loading }: RecommendationDisplayProps) {
  const t = useTranslations('AIAssistant');

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('smart_recommendations.loading')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'courses': return BookOpen;
      case 'posts': return MessageCircle;
      case 'groups': return Users;
    }
  };

  const Icon = getIcon();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="group border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                    {type === 'courses' ? item.title : 
                     type === 'posts' ? (item.title || item.content?.substring(0, 50) + '...') :
                     item.name}
                  </h4>
                  
                  {type === 'courses' && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {item.level}
                      </Badge>
                      <Badge variant={item.isFree ? 'secondary' : 'outline'} className="text-xs px-1.5 py-0.5">
                        {item.price}
                      </Badge>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {type === 'posts' && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <User className="h-3 w-3" />
                      <span>Author: {item.authorId}</span>
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {type === 'groups' && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Users className="h-3 w-3" />
                      <span>{item.memberCount} members</span>
                      <MessageCircle className="h-3 w-3" />
                      <span>{item.postCount} posts</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {item.visibility}
                      </Badge>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {item.description?.substring(0, 100) + (item.description?.length > 100 ? '...' : '') ||
                     item.content?.substring(0, 100) + (item.content?.length > 100 ? '...' : '')}
                  </div>

                  {item.reasons && item.reasons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.reasons.slice(0, 2).map((reason: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t('smart_recommendations.relevance')}
                  </div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {Math.round((item.score || 0.5) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {items.length >= 5 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3 text-xs"
          >
            {t('smart_recommendations.view_more')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SmartRecommendations({ 
  type, 
  userId, 
  context, 
  maxResults = 5,
  className 
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('AIAssistant');
  
  const actualUserId = userId;

  useEffect(() => {
    if (!actualUserId) return;
    
    const fetchRecommendations = async () => {
      setLoading(true);
      
      try {
        let apiUrl = '';
        let params = new URLSearchParams({
          userId: actualUserId.toString(),
          maxResults: maxResults.toString()
        });
        
        switch (type) {
          case 'courses':
            apiUrl = '/api/recommendations/courses';
            params.append('includeEnrolled', 'false');
            params.append('freeOnly', 'false');
            break;
            
          case 'posts':
            apiUrl = '/api/recommendations/posts';
            params.append('excludeOwnPosts', 'true');
            params.append('includePrivateGroups', 'false');
            break;
            
          case 'groups':
            apiUrl = '/api/recommendations/groups';
            params.append('excludeJoinedGroups', 'true');
            params.append('visibility', 'public');
            break;
        }
        
        const response = await fetch(`${apiUrl}?${params.toString()}`);
        const data = await response.json();
        
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        } else {
          console.error('Recommendations API error:', data.error);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [type, actualUserId, maxResults]);

  const getTitle = () => {
    switch (type) {
      case 'courses': return t('smart_recommendations.courses_title');
      case 'posts': return t('smart_recommendations.posts_title');
      case 'groups': return t('smart_recommendations.groups_title');
      default: return 'Recommendations';
    }
  };

  return (
    <div className={className}>
      <RecommendationDisplay
        title={getTitle()}
        items={recommendations}
        type={type}
        loading={loading}
      />
    </div>
  );
}
