import { SearchResult } from '@/hooks/search/use-universal-search';

/**
 * 根据搜索结果生成跳转URL
 */
export function generateSearchResultUrl(result: SearchResult): string {
  const { table_name, record_id, content_type, additional_data } = result;

  // Debug logging to help identify missing data
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Generating URL for:', {
      content_type,
      record_id,
      table_name,
      additional_data
    });
  }

  switch (content_type) {
    case 'course':
      // 课程详情页: /courses/[slug]
      if (additional_data?.slug) {
        return `/courses/${additional_data.slug}`;
      }
      // Fallback: use ID if slug is missing
      console.warn('⚠️ Course missing slug, using ID:', record_id);
      return `/courses/${record_id}`;

    case 'lesson':
      // 课程学习页: /courses/[courseSlug]/learn?lesson=[lessonSlug]
      if (additional_data?.course_slug && additional_data?.public_id) {
        return `/courses/${additional_data.course_slug}/learn?lesson=${additional_data.public_id}`;
      } else if (additional_data?.course_slug && additional_data?.lesson_slug) {
        return `/courses/${additional_data.course_slug}/learn?lesson=${additional_data.lesson_slug}`;
      } else if (additional_data?.course_id) {
        console.warn('⚠️ Lesson missing course_slug, using course_id:', additional_data.course_id);
        return `/courses/${additional_data.course_id}/learn?lesson=${record_id}`;
      }
      console.warn('⚠️ Lesson missing course data:', result);
      return `/courses/learn?lesson=${record_id}`;

    case 'post':
      // 社区帖子: /community/posts/[id]
      return `/community/posts/${record_id}`;

    case 'comment':
      // 社区评论 (跳转到对应帖子): /community/posts/[postId]#comment-[commentId]
      if (additional_data?.post_id) {
        return `/community/posts/${additional_data.post_id}#comment-${record_id}`;
      }
      console.warn('⚠️ Comment missing post_id:', record_id);
      return `/community/posts?comment=${record_id}`;

    case 'user':
      // 用户资料: /profile/[username] 或 /users/[id]
      if (additional_data?.username) {
        return `/profile/${additional_data.username}`;
      } else if (additional_data?.email) {
        return `/users/${additional_data.email}`;
      }
      console.warn('⚠️ User missing username/email, using ID:', record_id);
      return `/users/${record_id}`;

    case 'classroom':
      // 教室: /classroom/[slug]
      if (additional_data?.slug) {
        return `/classroom/${additional_data.slug}`;
      } else if (additional_data?.class_code) {
        return `/classroom/${additional_data.class_code}`;
      }
      console.warn('⚠️ Classroom missing slug/class_code, using ID:', record_id);
      return `/classroom/${record_id}`;

    case 'group':
      // 社区群组: /community/groups/[slug]
      if (additional_data?.slug) {
        return `/community/groups/${additional_data.slug}`;
      }
      console.warn('⚠️ Group missing slug, using ID:', record_id);
      return `/community/groups/${record_id}`;

    case 'note':
      // 笔记: /courses/[courseSlug]/notes/[noteId]
      if (additional_data?.course_slug) {
        return `/courses/${additional_data.course_slug}/notes/${record_id}`;
      } else if (additional_data?.course_id) {
        console.warn('⚠️ Note missing course_slug, using course_id:', additional_data.course_id);
        return `/courses/${additional_data.course_id}/notes/${record_id}`;
      }
      console.warn('⚠️ Note missing course data, using standalone URL:', record_id);
      return `/notes/${record_id}`;

    case 'quiz':
      // 测验: /quiz/[id] 或 /classroom/[classroomSlug]/quiz/[quizId]
      if (additional_data?.classroom_slug) {
        return `/classroom/${additional_data.classroom_slug}/quiz/${record_id}`;
      } else if (additional_data?.classroom_id) {
        console.warn('⚠️ Quiz missing classroom_slug, using classroom_id:', additional_data.classroom_id);
        return `/classroom/${additional_data.classroom_id}/quiz/${record_id}`;
      } else if (additional_data?.course_slug) {
        return `/courses/${additional_data.course_slug}/quiz/${record_id}`;
      } else if (additional_data?.course_id) {
        console.warn('⚠️ Quiz missing course_slug, using course_id:', additional_data.course_id);
        return `/courses/${additional_data.course_id}/quiz/${record_id}`;
      }
      console.warn('⚠️ Quiz missing context data, using standalone URL:', record_id);
      return `/quiz/${record_id}`;

    case 'tutor':
      // 导师资料: /tutors/[userId]
      if (additional_data?.user_id) {
        return `/tutors/${additional_data.user_id}`;
      }
      console.warn('⚠️ Tutor missing user_id, using record_id:', record_id);
      return `/tutors/${record_id}`;

    case 'announcement':
      // 公告: /announcements/[id]
      return `/announcements/${record_id}`;

    default:
      // 默认跳转到搜索结果页
      console.warn('⚠️ Unknown content type, using search fallback:', content_type);
      return `/search?type=${content_type}&id=${record_id}`;
  }
}

/**
 * 根据内容类型获取更多信息的方法
 */
export function getContentTypeInfo(contentType: string) {
  const typeInfo: Record<string, {
    label: string;
    description: string;
    color: string;
    icon: string;
    category: 'learning' | 'community' | 'teaching' | 'system';
  }> = {
    course: {
      label: 'Course',
      description: 'Online course content',
      color: 'blue',
      icon: '📚',
      category: 'learning'
    },
    lesson: {
      label: 'Lesson',
      description: 'Individual lesson within a course',
      color: 'green',
      icon: '🎯',
      category: 'learning'
    },
    post: {
      label: 'Post',
      description: 'Community discussion post',
      color: 'purple',
      icon: '💬',
      category: 'community'
    },
    comment: {
      label: 'Comment',
      description: 'Comment on a post',
      color: 'indigo',
      icon: '💭',
      category: 'community'
    },
    user: {
      label: 'User',
      description: 'User profile',
      color: 'yellow',
      icon: '👤',
      category: 'community'
    },
    classroom: {
      label: 'Classroom',
      description: 'Virtual classroom',
      color: 'red',
      icon: '🏫',
      category: 'teaching'
    },
    group: {
      label: 'Group',
      description: 'Study group or community',
      color: 'pink',
      icon: '👥',
      category: 'community'
    },
    note: {
      label: 'Note',
      description: 'Study notes',
      color: 'gray',
      icon: '📝',
      category: 'learning'
    },
    quiz: {
      label: 'Quiz',
      description: 'Interactive quiz or assessment',
      color: 'orange',
      icon: '❓',
      category: 'learning'
    },
    tutor: {
      label: 'Tutor',
      description: 'Tutor profile',
      color: 'cyan',
      icon: '👨‍🏫',
      category: 'teaching'
    },
    announcement: {
      label: 'Announcement',
      description: 'System or course announcement',
      color: 'emerald',
      icon: '📢',
      category: 'system'
    }
  };

  return typeInfo[contentType] || {
    label: 'Unknown',
    description: 'Unknown content type',
    color: 'gray',
    icon: '❓',
    category: 'system' as const
  };
}

/**
 * 处理搜索结果点击事件
 */
export function handleSearchResultClick(
  result: SearchResult, 
  router: { push: (url: string) => void },
  analytics?: {
    track: (event: string, properties: Record<string, any>) => void
  }
) {
  const url = generateSearchResultUrl(result);
  
  // 记录点击分析
  if (analytics) {
    analytics.track('search_result_clicked', {
      content_type: result.content_type,
      table_name: result.table_name,
      record_id: result.record_id,
      title: result.title,
      rank: result.rank,
      url: url
    });
  }

  // 导航到目标页面
  router.push(url);
}

/**
 * 预加载搜索结果页面
 */
export function preloadSearchResult(
  result: SearchResult,
  router: { prefetch: (url: string) => void }
) {
  const url = generateSearchResultUrl(result);
  
  try {
    router.prefetch(url);
  } catch (error) {
    console.warn('Failed to prefetch search result:', error);
  }
}

/**
 * 获取结果的预览信息
 */
export function getResultPreviewInfo(result: SearchResult) {
  const { additional_data, content_type } = result;
  
  const previewInfo: {
    primaryInfo?: string;
    secondaryInfo?: string;
    tertiaryInfo?: string;
    metadata: Record<string, any>;
  } = {
    metadata: {}
  };

  switch (content_type) {
    case 'course':
      previewInfo.primaryInfo = additional_data?.instructor_name || 'Unknown Instructor';
      previewInfo.secondaryInfo = additional_data?.level || 'All Levels';
      previewInfo.tertiaryInfo = additional_data?.total_lessons ? `${additional_data.total_lessons} lessons` : undefined;
      previewInfo.metadata = {
        price: additional_data?.price_cents ? `$${(additional_data.price_cents / 100).toFixed(2)}` : 'Free',
        duration: additional_data?.total_duration_minutes ? `${Math.round(additional_data.total_duration_minutes / 60)}h` : undefined,
        students: additional_data?.total_students || 0,
        rating: additional_data?.average_rating || 0
      };
      break;

    case 'lesson':
      previewInfo.primaryInfo = additional_data?.course_title || 'Unknown Course';
      previewInfo.secondaryInfo = additional_data?.module_title || 'Module';
      previewInfo.tertiaryInfo = additional_data?.duration ? `${Math.round(additional_data.duration / 60)} min` : undefined;
      previewInfo.metadata = {
        lessonType: additional_data?.kind || 'video',
        position: additional_data?.position,
        completed: additional_data?.completed || false
      };
      break;

    case 'post':
      previewInfo.primaryInfo = additional_data?.author_name || 'Anonymous';
      previewInfo.secondaryInfo = additional_data?.group_name || 'General Discussion';
      previewInfo.tertiaryInfo = additional_data?.comment_count ? `${additional_data.comment_count} comments` : '0 comments';
      previewInfo.metadata = {
        likes: additional_data?.like_count || 0,
        views: additional_data?.view_count || 0,
        tags: additional_data?.hashtags || []
      };
      break;

    case 'user':
      previewInfo.primaryInfo = additional_data?.role || 'Student';
      previewInfo.secondaryInfo = additional_data?.display_name || additional_data?.full_name;
      previewInfo.tertiaryInfo = additional_data?.bio ? additional_data.bio.substring(0, 50) + '...' : undefined;
      previewInfo.metadata = {
        joinedDate: additional_data?.created_at,
        totalPoints: additional_data?.total_points || 0,
        coursesCompleted: additional_data?.courses_completed || 0
      };
      break;

    case 'classroom':
      previewInfo.primaryInfo = additional_data?.owner_name || 'Unknown Teacher';
      previewInfo.secondaryInfo = additional_data?.member_count ? `${additional_data.member_count} members` : '0 members';
      previewInfo.tertiaryInfo = additional_data?.visibility || 'Private';
      previewInfo.metadata = {
        classCode: additional_data?.class_code,
        createdAt: additional_data?.created_at,
        isActive: additional_data?.is_active || false
      };
      break;

    default:
      previewInfo.primaryInfo = additional_data?.author || additional_data?.creator;
      previewInfo.secondaryInfo = additional_data?.category || additional_data?.type;
      previewInfo.metadata = additional_data || {};
      break;
  }

  return previewInfo;
}
