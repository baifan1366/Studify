"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  ArrowRight, 
  Plus,
  UserPlus,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePopularPosts, useSuggestedGroups } from '@/hooks/community/use-community';

interface CommunityHighlightsProps {
  onCreatePost?: () => void;
  onJoinGroup?: () => void;
}

export default function CommunityHighlights({ onCreatePost, onJoinGroup }: CommunityHighlightsProps) {
  const t = useTranslations('CommunityHighlights');
  
  // 获取真实数据
  const { posts: popularPosts, isLoading: postsLoading, isError: postsError } = usePopularPosts();
  const { groups: suggestedGroups, isLoading: groupsLoading, isError: groupsError } = useSuggestedGroups();
  
  // 格式化时间
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };
  
  // 获取组活跃度文本
  const getActivityLevel = (memberCount: number) => {
    if (memberCount > 100) return 'Very Active';
    if (memberCount > 50) return 'Active';
    return 'Growing';
  };
  
  // 获取组颜色
  const getGroupColor = (index: number) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500', 
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-blue-500'
    ];
    return colors[index % colors.length];
  };
  
  // 处理数据显示（最多3个）
  const latestPosts = popularPosts?.slice(0, 3) || [];
  const studyGroups = suggestedGroups?.slice(0, 3) || [];

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
            <p className="text-white/70">{t('subtitle')}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            onClick={onCreatePost}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              {t('create_post_button')}
            </div>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Posts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">{t('latest_posts_heading')}</h3>
          
          {postsLoading ? (
            // 加载状态
            [...Array(3)].map((_, index) => (
              <div key={`loading-post-${index}`} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-white/20 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-white/20 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-3/4 mb-3"></div>
                <div className="flex gap-4">
                  <div className="h-3 bg-white/20 rounded w-8"></div>
                  <div className="h-3 bg-white/20 rounded w-8"></div>
                </div>
              </div>
            ))
          ) : postsError || latestPosts.length === 0 ? (
            // 错误或无数据状态
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
              <p className="text-white/60 text-sm">
                {postsError ? t('posts_error') || 'Failed to load posts' : t('no_posts') || 'No recent posts available'}
              </p>
            </div>
          ) : (
            // 真实数据
            latestPosts.map((post, index) => (
              <motion.div
                key={post.public_id || post.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/8 transition-colors cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={post.author?.avatar_url || '/api/placeholder/32/32'} 
                    alt={post.author?.display_name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {post.author?.display_name || 'Anonymous'}
                      </span>
                      {post.hashtags && post.hashtags[0] && (
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                          #{post.hashtags[0].name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Clock size={12} />
                      {formatTimeAgo(post.created_at.toString())}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-white/80 text-sm mb-3 line-clamp-2">
                  {post.body && post.body.length > 150 ? `${post.body.substring(0, 150)}...` : post.body || ''}
                </p>

                {/* Post Stats */}
                <div className="flex items-center gap-4 text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <Heart size={12} />
                    {(post.reactions && Object.values(post.reactions).reduce((acc, count) => acc + count, 0)) || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {post.comments_count || 0}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Study Groups */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">{t('recommended_groups_heading')}</h3>
          
          {groupsLoading ? (
            // 加载状态
            [...Array(3)].map((_, index) => (
              <div key={`loading-group-${index}`} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-white/20 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-white/20 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-white/20 rounded w-16"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-6 bg-white/20 rounded w-16"></div>
                  <div className="h-3 bg-white/20 rounded w-20"></div>
                </div>
              </div>
            ))
          ) : groupsError || studyGroups.length === 0 ? (
            // 错误或无数据状态
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
              <p className="text-white/60 text-sm">
                {groupsError ? t('groups_error') || 'Failed to load groups' : t('no_groups') || 'No study groups available'}
              </p>
            </div>
          ) : (
            // 真实数据
            studyGroups.map((group, index) => (
              <motion.div
                key={group.public_id || group.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/8 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-r ${getGroupColor(index)} rounded-lg flex items-center justify-center`}>
                      <Users size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{group.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <span>{group.member_count || 0} {t('members_suffix')}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={10} />
                          {getActivityLevel(group.member_count || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={onJoinGroup}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex items-center gap-1">
                      <UserPlus size={12} />
                      {t('join_button')}
                    </div>
                  </motion.button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                    {group.visibility === 'public' ? t('visibility_public') : t('visibility_private')}
                  </span>
                  <span className="text-xs text-white/50">
                    {Math.floor(Math.random() * 5) + 1} {t('new_posts_today_suffix')}
                  </span>
                </div>
              </motion.div>
            ))
          )}

          {/* Join Group CTA */}
          <motion.button
            onClick={onJoinGroup}
            className="group w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Users size={20} />
              {t('explore_groups_button')}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
