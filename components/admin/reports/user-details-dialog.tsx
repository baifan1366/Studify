"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  ShoppingCart, 
  TrendingUp,
  Users as UsersIcon,
  MessageCircle,
  Heart,
  GraduationCap,
  DollarSign,
  Clock,
  ExternalLink,
  Award,
  Activity
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  useAdminUserProfile,
  useUserCommunityActivity,
  useUserChatActivity,
  useUserCourseActivity,
  useUserPurchaseData,
} from "@/hooks/admin/use-admin-user-data";
import { useFormat } from "@/hooks/use-format";

interface UserDetailsDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsDialog({ userId, open, onOpenChange }: UserDetailsDialogProps) {
  const t = useTranslations('UserDetailsDialog');
  const { formatCurrency, formatDate, formatRelativeTime } = useFormat();
  
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch user data
  const { data: profile, isLoading: profileLoading } = useAdminUserProfile(userId);
  const { data: communityActivity, isLoading: communityLoading } = useUserCommunityActivity(userId);
  const { data: chatActivity, isLoading: chatLoading } = useUserChatActivity(userId);
  const { data: courseActivity, isLoading: courseLoading } = useUserCourseActivity(userId);
  const { data: purchaseData, isLoading: purchaseLoading } = useUserPurchaseData(userId);

  if (!open) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'banned':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'tutor':
        return 'default';
      case 'student':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            {profileLoading ? (
              <Skeleton className="w-48 h-6" />
            ) : (
              <>
                {profile?.full_name || t('user_details')}
                {profile && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {t(`role_${profile.role}`)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(profile.status)}>
                      {t(`status_${profile.status}`)}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">{t('tab_profile')}</TabsTrigger>
                <TabsTrigger value="community">{t('tab_community')}</TabsTrigger>
                <TabsTrigger value="chat">{t('tab_chat')}</TabsTrigger>
                <TabsTrigger value="courses">{t('tab_courses')}</TabsTrigger>
                <TabsTrigger value="purchases">{t('tab_purchases')}</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6">
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-4 space-y-6">
                {profileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="w-full h-32" />
                    <Skeleton className="w-full h-24" />
                    <Skeleton className="w-full h-24" />
                  </div>
                ) : profile ? (
                  <>
                    {/* Basic Info */}
                    <Card className="bg-transparent p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.display_name} />
                          <AvatarFallback className="text-lg">
                            {(profile.full_name || profile.display_name || profile.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {profile.full_name || profile.display_name || t('no_name_provided')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {profile.bio || t('no_bio_provided')}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Mail className="h-4 w-4" />
                              {profile.email}
                            </div>
                            {profile.phone && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4" />
                                {profile.phone}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              {t('joined_on', { date: formatDate(profile.created_at) })}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Clock className="h-4 w-4" />
                              {t('last_updated', { date: formatRelativeTime(profile.updated_at) })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-transparent p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_posts')}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {profile.total_posts || 0}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-transparent p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_comments')}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {profile.total_comments || 0}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-transparent p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('enrolled_courses')}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {profile.total_enrolled_courses || 0}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-transparent p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                            <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_spent')}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {profile.total_spent ? formatCurrency(profile.total_spent / 100) : formatCurrency(0)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('profile_not_found')}</p>
                  </div>
                )}
              </TabsContent>

              {/* Community Tab */}
              <TabsContent value="community" className="mt-4 space-y-6">
                {communityLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-20" />
                    ))}
                  </div>
                ) : communityActivity ? (
                  <>
                    {/* Posts */}
                    <Card className="bg-transparent p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        {t('recent_posts')} ({communityActivity.posts.length})
                      </h3>
                      {communityActivity.posts.length > 0 ? (
                        <div className="space-y-3">
                          {communityActivity.posts.slice(0, 5).map((post) => (
                            <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {post.title}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span>{post.group_name}</span>
                                  <span>{formatDate(post.created_at)}</span>
                                  <div className="flex items-center gap-2">
                                    <Heart className="h-3 w-3" />
                                    {post.reactions_count}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-3 w-3" />
                                    {post.comments_count}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {communityActivity.posts.length > 5 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                              {t('and_more_posts', { count: communityActivity.posts.length - 5 })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_posts')}</p>
                      )}
                    </Card>

                    {/* Comments */}
                    <Card className="bg-transparent p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        {t('recent_comments')} ({communityActivity.comments.length})
                      </h3>
                      {communityActivity.comments.length > 0 ? (
                        <div className="space-y-3">
                          {communityActivity.comments.slice(0, 5).map((comment) => (
                            <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                                {comment.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <span>{t('on_post')}: {comment.post_title}</span>
                                <span>{formatDate(comment.created_at)}</span>
                              </div>
                            </div>
                          ))}
                          {communityActivity.comments.length > 5 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                              {t('and_more_comments', { count: communityActivity.comments.length - 5 })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_comments')}</p>
                      )}
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('community_data_not_available')}</p>
                  </div>
                )}
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="mt-4 space-y-6">
                {chatLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-16" />
                    ))}
                  </div>
                ) : chatActivity ? (
                  <Card className="bg-transparent p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {t('recent_messages')} ({chatActivity.messages.length})
                    </h3>
                    {chatActivity.messages.length > 0 ? (
                      <div className="space-y-3">
                        {chatActivity.messages.slice(0, 10).map((message) => (
                          <div key={message.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                              {message.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>{message.classroom_name}</span>
                              <span>{message.course_title}</span>
                              <span>{formatRelativeTime(message.created_at)}</span>
                            </div>
                          </div>
                        ))}
                        {chatActivity.messages.length > 10 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            {t('and_more_messages', { count: chatActivity.messages.length - 10 })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_messages')}</p>
                    )}
                  </Card>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('chat_data_not_available')}</p>
                  </div>
                )}
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses" className="mt-4 space-y-6">
                {courseLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-20" />
                    ))}
                  </div>
                ) : courseActivity ? (
                  <>
                    {/* Enrollments */}
                    <Card className="bg-transparent p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {t('course_enrollments')} ({courseActivity.enrollments.length})
                      </h3>
                      {courseActivity.enrollments.length > 0 ? (
                        <div className="space-y-3">
                          {courseActivity.enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {enrollment.course_title}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'}>
                                    {t(`enrollment_${enrollment.status}`)}
                                  </Badge>
                                  <span>{t('enrolled_on', { date: formatDate(enrollment.enrolled_at) })}</span>
                                  {enrollment.completed_at && (
                                    <span>{t('completed_on', { date: formatDate(enrollment.completed_at) })}</span>
                                  )}
                                </div>
                              </div>
                              {enrollment.progress_percentage !== undefined && (
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {enrollment.progress_percentage}%
                                  </p>
                                  <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                                    <div
                                      className="h-full bg-blue-600 rounded-full"
                                      style={{ width: `${enrollment.progress_percentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_enrollments')}</p>
                      )}
                    </Card>

                    {/* Progress */}
                    <Card className="bg-transparent p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t('learning_progress')}
                      </h3>
                      {courseActivity.progress.length > 0 ? (
                        <div className="space-y-3">
                          {courseActivity.progress.map((progress) => (
                            <div key={progress.course_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {progress.course_title}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span>{progress.completed_lessons}/{progress.total_lessons} {t('lessons_completed')}</span>
                                  <span>{t('last_accessed', { date: formatDate(progress.last_accessed) })}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {progress.percentage}%
                                </p>
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                                  <div
                                    className="h-full bg-green-600 rounded-full"
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_progress_data')}</p>
                      )}
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('course_data_not_available')}</p>
                  </div>
                )}
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="mt-4 space-y-6">
                {purchaseLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-full h-16" />
                    ))}
                  </div>
                ) : purchaseData ? (
                  <>
                    {/* Summary */}
                    <Card className="bg-transparent p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_lifetime_spent')}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(purchaseData.total_spent_cents / 100)}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Orders */}
                    <Card className="bg-transparent p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {t('purchase_history')} ({purchaseData.orders.length})
                      </h3>
                      {purchaseData.orders.length > 0 ? (
                        <div className="space-y-3">
                          {purchaseData.orders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {order.course_title}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                    {t(`order_${order.status}`)}
                                  </Badge>
                                  <span>{formatRelativeTime(order.created_at)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(order.amount_cents / 100)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                  {order.currency}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('no_purchases')}</p>
                      )}
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('purchase_data_not_available')}</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
