import { queueContentForEmbedding, CONTENT_TYPES } from './vectorstore';
import { smartQueue } from './qstash-integration';

// Integration helpers for embedding system

/**
 * Queue user profile for embedding after registration or profile update
 */
export async function queueUserProfileEmbedding(
  userId: number, 
  priority: number = 3,
  useQStash: boolean = false
): Promise<boolean> {
  try {
    if (process.env.QSTASH_TOKEN && (useQStash || priority <= 2)) {
      const result = await smartQueue(CONTENT_TYPES.PROFILE, userId, { 
        priority, 
        useQStash: true,
        fallbackToDb: true 
      });
      return result.success;
    }
    
    return await queueContentForEmbedding(CONTENT_TYPES.PROFILE, userId, priority);
  } catch (error) {
    console.error('Error queuing user profile for embedding:', error);
    return false;
  }
}

/**
 * Queue course for embedding after creation or update
 */
export async function queueCourseEmbedding(
  courseId: number, 
  priority: number = 2,
  useQStash: boolean = false
): Promise<boolean> {
  try {
    if (process.env.QSTASH_TOKEN && (useQStash || priority <= 2)) {
      const result = await smartQueue(CONTENT_TYPES.COURSE, courseId, { 
        priority, 
        useQStash: true,
        fallbackToDb: true 
      });
      return result.success;
    }
    
    return await queueContentForEmbedding(CONTENT_TYPES.COURSE, courseId, priority);
  } catch (error) {
    console.error('Error queuing course for embedding:', error);
    return false;
  }
}

/**
 * Queue course lesson for embedding after creation or update
 */
export async function queueLessonEmbedding(lessonId: number, priority: number = 3): Promise<boolean> {
  try {
    return await queueContentForEmbedding(CONTENT_TYPES.LESSON, lessonId, priority);
  } catch (error) {
    console.error('Error queuing lesson for embedding:', error);
    return false;
  }
}

/**
 * Queue community post for embedding after creation or update
 */
export async function queuePostEmbedding(postId: number, priority: number = 4): Promise<boolean> {
  try {
    return await queueContentForEmbedding(CONTENT_TYPES.POST, postId, priority);
  } catch (error) {
    console.error('Error queuing post for embedding:', error);
    return false;
  }
}

/**
 * Queue community comment for embedding after creation or update
 */
export async function queueCommentEmbedding(commentId: number, priority: number = 5): Promise<boolean> {
  try {
    return await queueContentForEmbedding(CONTENT_TYPES.COMMENT, commentId, priority);
  } catch (error) {
    console.error('Error queuing comment for embedding:', error);
    return false;
  }
}

/**
 * Queue multiple content items for embedding
 */
export async function queueMultipleForEmbedding(items: {
  contentType: keyof typeof CONTENT_TYPES;
  contentId: number;
  priority?: number;
}[]): Promise<{ success: number; failed: number; results: boolean[] }> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const contentType = CONTENT_TYPES[item.contentType];
        return await queueContentForEmbedding(contentType, item.contentId, item.priority || 5);
      } catch (error) {
        console.error(`Error queuing ${item.contentType}:${item.contentId} for embedding:`, error);
        return false;
      }
    })
  );

  const success = results.filter(result => result).length;
  const failed = results.length - success;

  return { success, failed, results };
}

/**
 * Helper for course creation - queue course and its lessons
 */
export async function queueCourseWithLessons(
  courseId: number, 
  lessonIds: number[] = [],
  coursePriority: number = 2,
  lessonPriority: number = 3
): Promise<{ courseQueued: boolean; lessonsQueued: number; lessonsFailed: number }> {
  // Queue course first
  const courseQueued = await queueCourseEmbedding(courseId, coursePriority);

  // Queue lessons
  const lessonResults = await Promise.all(
    lessonIds.map(lessonId => queueLessonEmbedding(lessonId, lessonPriority))
  );

  const lessonsQueued = lessonResults.filter(result => result).length;
  const lessonsFailed = lessonResults.length - lessonsQueued;

  return {
    courseQueued,
    lessonsQueued,
    lessonsFailed
  };
}

/**
 * Helper for user onboarding - queue user profile and related content
 */
export async function queueUserOnboardingContent(
  userId: number,
  options: {
    profile?: boolean;
    courses?: number[];
    posts?: number[];
    priority?: number;
  } = {}
): Promise<{
  profileQueued: boolean;
  coursesQueued: number;
  postsQueued: number;
  totalFailed: number;
}> {
  const priority = options.priority || 3;
  const items: { contentType: keyof typeof CONTENT_TYPES; contentId: number; priority: number }[] = [];

  // Add profile if requested
  if (options.profile !== false) {
    items.push({ contentType: 'PROFILE', contentId: userId, priority });
  }

  // Add courses
  if (options.courses && options.courses.length > 0) {
    items.push(...options.courses.map(courseId => ({
      contentType: 'COURSE' as keyof typeof CONTENT_TYPES,
      contentId: courseId,
      priority: priority - 1 // Higher priority for courses
    })));
  }

  // Add posts
  if (options.posts && options.posts.length > 0) {
    items.push(...options.posts.map(postId => ({
      contentType: 'POST' as keyof typeof CONTENT_TYPES,
      contentId: postId,
      priority: priority + 1 // Lower priority for posts
    })));
  }

  const { success, failed } = await queueMultipleForEmbedding(items);

  return {
    profileQueued: options.profile !== false ? items.length > 0 : false,
    coursesQueued: options.courses?.length || 0,
    postsQueued: options.posts?.length || 0,
    totalFailed: failed
  };
}

/**
 * Batch queue content by type with pagination
 */
export async function batchQueueContentByType(
  contentType: keyof typeof CONTENT_TYPES,
  contentIds: number[],
  batchSize: number = 50,
  priority: number = 5,
  delayMs: number = 100
): Promise<{ queued: number; failed: number; batches: number }> {
  let queued = 0;
  let failed = 0;
  let batches = 0;

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < contentIds.length; i += batchSize) {
    const batch = contentIds.slice(i, i + batchSize);
    batches++;

    const batchItems = batch.map(contentId => ({
      contentType,
      contentId,
      priority
    }));

    const result = await queueMultipleForEmbedding(batchItems);
    queued += result.success;
    failed += result.failed;

    console.log(`Batch ${batches}: Queued ${result.success}/${batch.length} ${contentType} items`);

    // Add delay between batches
    if (i + batchSize < contentIds.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { queued, failed, batches };
}

/**
 * Smart queue content - only queue if content has changed
 */
export async function smartQueueContent(
  contentType: keyof typeof CONTENT_TYPES,
  contentId: number,
  contentHash: string,
  priority: number = 5
): Promise<{ queued: boolean; reason: string }> {
  try {
    // This would require checking the existing embedding hash
    // For now, we'll always queue since the database function handles deduplication
    const queued = await queueContentForEmbedding(CONTENT_TYPES[contentType], contentId, priority);
    
    return {
      queued,
      reason: queued ? 'Content queued successfully' : 'Failed to queue content'
    };
  } catch (error) {
    console.error('Error in smart queue content:', error);
    return {
      queued: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Priority mapping for different content types and scenarios
 */
export const EMBEDDING_PRIORITIES = {
  // Highest priority - immediate user actions
  USER_CREATED_COURSE: 1,
  USER_PROFILE_UPDATE: 2,
  
  // High priority - important content
  COURSE_CREATION: 2,
  COURSE_UPDATE: 3,
  LESSON_CREATION: 3,
  
  // Medium priority - community content
  POST_CREATION: 4,
  POST_UPDATE: 4,
  
  // Lower priority - comments and bulk operations
  COMMENT_CREATION: 5,
  COMMENT_UPDATE: 5,
  BULK_OPERATION: 6,
  
  // Lowest priority - background processing
  MAINTENANCE: 7,
  REPROCESSING: 8
} as const;

/**
 * Get recommended priority for content type and action
 */
export function getRecommendedPriority(
  contentType: keyof typeof CONTENT_TYPES,
  action: 'create' | 'update' | 'bulk' = 'create'
): number {
  const baseKey = `${contentType}_${action.toUpperCase()}` as keyof typeof EMBEDDING_PRIORITIES;
  
  // Try specific action first
  if (baseKey in EMBEDDING_PRIORITIES) {
    return EMBEDDING_PRIORITIES[baseKey];
  }
  
  // Fall back to creation priority
  const createKey = `${contentType}_CREATION` as keyof typeof EMBEDDING_PRIORITIES;
  if (createKey in EMBEDDING_PRIORITIES) {
    return EMBEDDING_PRIORITIES[createKey];
  }
  
  // Default priorities by content type
  switch (contentType) {
    case 'COURSE':
      return EMBEDDING_PRIORITIES.COURSE_CREATION;
    case 'PROFILE':
      return EMBEDDING_PRIORITIES.USER_PROFILE_UPDATE;
    case 'LESSON':
      return EMBEDDING_PRIORITIES.LESSON_CREATION;
    case 'POST':
      return EMBEDDING_PRIORITIES.POST_CREATION;
    case 'COMMENT':
      return EMBEDDING_PRIORITIES.COMMENT_CREATION;
    default:
      return 5; // Default medium priority
  }
}
