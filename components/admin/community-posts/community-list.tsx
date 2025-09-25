"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  Flag,
  Crown
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAdminCommunityStats } from "@/hooks/admin/use-admin-community-post";
import { PostList } from "./post-list";
import { PostDetailsDialog } from "./post-details-dialog";
import { BanRequestDialog } from "./ban-request-dialog";

// Import existing BanUserDialog from reports
import { BanUserDialog } from "@/components/admin/reports/ban-user-dialog";

export function CommunityList() {
  const t = useTranslations('AdminCommunityPosts');

  // Dialog states
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [postDetailsOpen, setPostDetailsOpen] = useState(false);
  const [banRequestOpen, setBanRequestOpen] = useState(false);
  const [banUserOpen, setBanUserOpen] = useState(false);

  // Ban request states
  const [banType, setBanType] = useState<'post' | 'comment' | 'user' | null>(null);
  const [banTargetId, setBanTargetId] = useState<number | string | null>(null);
  const [banTargetTitle, setBanTargetTitle] = useState<string | undefined>(undefined);
  const [banSourceType, setBanSourceType] = useState<'post' | 'comment' | undefined>(undefined);
  const [banSourceId, setBanSourceId] = useState<number | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useAdminCommunityStats();

  // Handle view post
  const handleViewPost = (postId: number) => {
    setSelectedPostId(postId);
    setPostDetailsOpen(true);
  };

  // Handle ban post
  const handleBanPost = (postId: number, title?: string) => {
    setBanType('post');
    setBanTargetId(postId);
    setBanTargetTitle(title);
    setBanSourceType(undefined);
    setBanSourceId(undefined);
    setBanRequestOpen(true);
  };

  // Handle ban comment
  const handleBanComment = (commentId: number) => {
    setBanType('comment');
    setBanTargetId(commentId);
    setBanTargetTitle(undefined);
    setBanSourceType('comment');
    setBanSourceId(commentId);
    setBanRequestOpen(true);
  };

  // Handle ban user
  const handleBanUser = (userId: string, sourceType?: 'post' | 'comment', sourceId?: number) => {
    setSelectedUserId(userId);
    setBanUserOpen(true);
    
    // Also prepare ban request data for alternative ban creation
    setBanType('user');
    setBanTargetId(userId);
    setBanTargetTitle(undefined);
    setBanSourceType(sourceType);
    setBanSourceId(sourceId);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-transparent p-6">
              <div className="space-y-2">
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_posts')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.total_posts || 0}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_comments')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.total_comments || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_groups')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.total_groups || 0}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_reports')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.total_reports || 0}
                  </p>
                </div>
                <Flag className="h-8 w-8 text-red-500" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="posts">{t('posts_tab')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analytics_tab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <PostList
            onViewPost={handleViewPost}
            onBanPost={handleBanPost}
            onBanUser={handleBanUser}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Authors */}
            <Card className="bg-transparent p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('top_authors')}
              </h3>
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                        <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.top_authors?.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_authors.map((author, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">
                            {author.author.full_name || author.author.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {author.post_count} {t('posts')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('no_data_available')}
                </p>
              )}
            </Card>

            {/* Top Commented Posts */}
            <Card className="bg-transparent p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('top_commented_posts')}
              </h3>
              {statsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : stats?.top_commented_posts?.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_commented_posts.map((post, index) => (
                    <div key={post.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {post.comment_count} {t('comments')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-2">
                          {post.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('by')} {post.author.full_name || post.author.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('no_data_available')}
                </p>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PostDetailsDialog
        postId={selectedPostId}
        open={postDetailsOpen}
        onOpenChange={setPostDetailsOpen}
        onBanPost={handleBanPost}
        onBanComment={handleBanComment}
        onBanUser={handleBanUser}
      />

      <BanRequestDialog
        open={banRequestOpen}
        onOpenChange={setBanRequestOpen}
        banType={banType}
        targetId={banTargetId}
        targetTitle={banTargetTitle}
        sourceContentType={banSourceType}
        sourceContentId={banSourceId}
      />

      <BanUserDialog
        userId={selectedUserId || ''}
        open={banUserOpen}
        onOpenChange={setBanUserOpen}
      />
    </div>
  );
}