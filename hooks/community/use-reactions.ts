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

// Helper function to update post reactions in any post list
const updatePostReactionsInList = (posts: Post[] | undefined, targetId: string, emoji: string): Post[] | undefined => {
  if (!posts) return posts;
  
  return posts.map(post => {
    if (post.id.toString() === targetId) {
      const newReactions = { ...post.reactions };
      const currentCount = newReactions[emoji] || 0;
      
      // Toggle: if count > 0, decrease by 1, otherwise increase by 1
      if (currentCount > 0) {
        newReactions[emoji] = currentCount - 1;
        if (newReactions[emoji] === 0) {
          delete newReactions[emoji];
        }
      } else {
        newReactions[emoji] = 1;
      }
      
      return { ...post, reactions: newReactions };
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

      // Snapshot the previous values
      const previousPost = queryClient.getQueryData(['post', groupSlug, postSlug]);
      const previousComments = queryClient.getQueryData(['comments', groupSlug, postSlug]);
      const previousPopularPosts = queryClient.getQueryData(['popularPosts']);
      const previousSearchPosts = queryClient.getQueryData(['searchPosts']);

      // Optimistically update the cache
      if (variables.target_type === 'post') {
        // Update individual post data
        queryClient.setQueryData(['post', groupSlug, postSlug], (old: Post | undefined) => {
          if (!old) return old;
          
          const newReactions = { ...old.reactions };
          const currentCount = newReactions[variables.emoji] || 0;
          
          // Toggle: if count > 0, decrease by 1, otherwise increase by 1
          if (currentCount > 0) {
            newReactions[variables.emoji] = currentCount - 1;
            if (newReactions[variables.emoji] === 0) {
              delete newReactions[variables.emoji];
            }
          } else {
            newReactions[variables.emoji] = 1;
          }
          
          return { ...old, reactions: newReactions };
        });

        // Update popular posts list
        queryClient.setQueryData(['popularPosts'], (old: Post[] | undefined) => 
          updatePostReactionsInList(old, variables.target_id, variables.emoji)
        );

        // Update search posts list (if exists)
        queryClient.setQueryData(['searchPosts'], (old: Post[] | undefined) => 
          updatePostReactionsInList(old, variables.target_id, variables.emoji)
        );

      } else if (variables.target_type === 'comment') {
        queryClient.setQueryData(['comments', groupSlug, postSlug], (old: Comment[] | undefined) => {
          if (!old) return old;
          
          return old.map(comment => {
            if (comment.id.toString() === variables.target_id) {
              const newReactions = { ...comment.reactions };
              const currentCount = newReactions[variables.emoji] || 0;
              
              // Toggle: if count > 0, decrease by 1, otherwise increase by 1
              if (currentCount > 0) {
                newReactions[variables.emoji] = currentCount - 1;
                if (newReactions[variables.emoji] === 0) {
                  delete newReactions[variables.emoji];
                }
              } else {
                newReactions[variables.emoji] = 1;
              }
              
              return { ...comment, reactions: newReactions };
            }
            return comment;
          });
        });
      }

      // Return a context object with the snapshotted values
      return { previousPost, previousComments, previousPopularPosts, previousSearchPosts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPost) {
        queryClient.setQueryData(['post', groupSlug, postSlug], context.previousPost);
      }
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', groupSlug, postSlug], context.previousComments);
      }
      if (context?.previousPopularPosts) {
        queryClient.setQueryData(['popularPosts'], context.previousPopularPosts);
      }
      if (context?.previousSearchPosts) {
        queryClient.setQueryData(['searchPosts'], context.previousSearchPosts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ['post', groupSlug, postSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ['comments', groupSlug, postSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ['popularPosts'],
      });
      queryClient.invalidateQueries({
        queryKey: ['searchPosts'],
      });
    },
  });
};
