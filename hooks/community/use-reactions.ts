import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Post } from '@/interface/community/post-interface';
import { Comment } from '@/interface/community/comment-interface';

// Toggle reaction (add/remove)
const toggleReaction = async (params: {
  groupSlug: string;
  postSlug: string;
  emoji: string;
  target_type: 'post' | 'comment';
  target_id: string;
}): Promise<{ action: 'added' | 'removed'; message: string }> => {
  const { groupSlug, postSlug, ...data } = params;
  const response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      sendNotification: true, // Notify post/comment author about reactions
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle reaction: ${response.statusText}`);
  }
  
  return response.json();
};

type ReactionAction = 'added' | 'removed';

const updateReactionCount = (
  reactions: Record<string, number> | undefined,
  emoji: string,
  action: ReactionAction
) => {
  const next = { ...(reactions || {}) };
  const currentCount = next[emoji] || 0;
  const nextCount = action === 'added' ? currentCount + 1 : Math.max(0, currentCount - 1);

  if (nextCount === 0) {
    delete next[emoji];
  } else {
    next[emoji] = nextCount;
  }

  return next;
};

// Helper function to update post reactions in any post list
const updatePostReactionsInList = (
  posts: Post[] | undefined,
  targetId: string,
  emoji: string,
  action: ReactionAction
): Post[] | undefined => {
  if (!posts) return posts;
  
  return posts.map(post => {
    if (post.id.toString() === targetId) {
      return { ...post, reactions: updateReactionCount(post.reactions, emoji, action) };
    }
    return post;
  });
};

export const useToggleReaction = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleReaction,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['post', groupSlug, postSlug] });
      await queryClient.cancelQueries({ queryKey: ['comments', groupSlug, postSlug] });
      await queryClient.cancelQueries({ queryKey: ['popularPosts'] });
      await queryClient.cancelQueries({ queryKey: ['searchPosts'] });

      await queryClient.cancelQueries({ queryKey: ['groupPosts', groupSlug] });
    },
    onSuccess: (result, variables) => {
      if (variables.target_type === 'post') {
        queryClient.setQueryData(['post', groupSlug, postSlug], (old: Post | undefined) =>
          old
            ? { ...old, reactions: updateReactionCount(old.reactions, variables.emoji, result.action) }
            : old
        );
        queryClient.setQueryData(['groupPosts', groupSlug], (old: Post[] | undefined) =>
          updatePostReactionsInList(old, variables.target_id, variables.emoji, result.action)
        );
        queryClient.setQueryData(['popularPosts'], (old: Post[] | undefined) =>
          updatePostReactionsInList(old, variables.target_id, variables.emoji, result.action)
        );
        queryClient.setQueriesData<Post[]>({ queryKey: ['searchPosts'] }, (old) =>
          updatePostReactionsInList(old, variables.target_id, variables.emoji, result.action)
        );
      } else {
        queryClient.setQueryData(['comments', groupSlug, postSlug], (old: Comment[] | undefined) =>
          old?.map((comment) =>
            comment.id.toString() === variables.target_id
              ? {
                  ...comment,
                  reactions: updateReactionCount(comment.reactions, variables.emoji, result.action),
                }
              : comment
          )
        );
      }
    },
    onSettled: () => {
      // The write is persisted asynchronously. Keep the confirmed local result
      // instead of immediately replacing it with a potentially stale database read.
    },
  });
};
