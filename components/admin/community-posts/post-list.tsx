"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  MessageSquare, 
  Heart, 
  Flag, 
  Search, 
  Filter, 
  Eye,
  Ban,
  User,
  Calendar,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useAdminCommunityPosts } from "@/hooks/admin/use-admin-community-post";
import { useFormat } from "@/hooks/use-format";

interface PostListProps {
  onViewPost: (postId: number) => void;
  onBanPost: (postId: number) => void;
  onBanUser: (userId: string) => void;
}

export function PostList({ onViewPost, onBanPost, onBanUser }: PostListProps) {
  const t = useTranslations('AdminCommunityPosts');
  const { formatRelativeTime } = useFormat();

  // Filters and pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'comment_count' | 'reaction_count' | 'total_reports'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hasReports, setHasReports] = useState<boolean | undefined>(undefined);

  // Fetch posts
  const { 
    data: postsData, 
    isLoading, 
    error 
  } = useAdminCommunityPosts({
    page,
    limit: 20,
    search,
    sortBy,
    sortOrder,
    hasReports,
  });

  const posts = postsData?.posts || [];
  const total = postsData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  if (error) {
    return (
      <Card className="bg-transparent p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('error_loading')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('error_loading_description')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-transparent p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">{t('sort_date')}</SelectItem>
                <SelectItem value="title">{t('sort_title')}</SelectItem>
                <SelectItem value="comment_count">{t('sort_comments')}</SelectItem>
                <SelectItem value="reaction_count">{t('sort_reactions')}</SelectItem>
                <SelectItem value="total_reports">{t('sort_reports')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{t('sort_desc')}</SelectItem>
                <SelectItem value="asc">{t('sort_asc')}</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={hasReports === undefined ? 'all' : hasReports ? 'reported' : 'clean'} 
              onValueChange={(value) => setHasReports(value === 'all' ? undefined : value === 'reported')}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter_all')}</SelectItem>
                <SelectItem value="reported">{t('filter_reported')}</SelectItem>
                <SelectItem value="clean">{t('filter_clean')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-transparent p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="bg-transparent p-12">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('no_posts_title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('no_posts_description')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Post Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Author Avatar */}
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={post.author.avatar_url} alt={post.author.full_name} />
                        <AvatarFallback>
                          {post.author.full_name?.[0]?.toUpperCase() || 
                           post.author.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        {/* Title and Group */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {post.title || t('untitled_post')}
                          </h3>
                          {post.group && (
                            <Badge variant="secondary" className="shrink-0">
                              {post.group.name}
                            </Badge>
                          )}
                        </div>

                        {/* Author Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {post.author.full_name || post.author.email}
                          </p>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            {formatRelativeTime(post.created_at)}
                          </p>
                        </div>

                        {/* Body Preview */}
                        {post.body && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {post.body}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.comment_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Heart className="h-4 w-4" />
                            <span>{post.reaction_count || 0}</span>
                          </div>
                          {(post.total_reports || 0) > 0 && (
                            <div className="flex items-center gap-1 text-sm text-red-500">
                              <Flag className="h-4 w-4" />
                              <span>{post.total_reports}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewPost(post.id)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('view_details')}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBanUser(post.author.user_id)}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('ban_user')}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBanPost(post.id)}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      {t('ban_post')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            {t('previous')}
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
            {t('page_info', { current: page, total: totalPages })}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            {t('next')}
          </Button>
        </div>
      )}
    </div>
  );
}