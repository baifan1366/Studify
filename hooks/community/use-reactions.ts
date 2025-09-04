import { useMutation, useQueryClient } from '@tanstack/react-query';

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
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle reaction: ${response.statusText}`);
  }
  
  return response.json();
};

export const useToggleReaction = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleReaction,
    onSuccess: () => {
      // Invalidate post data to update reaction counts
      queryClient.invalidateQueries({
        queryKey: ['post', groupSlug, postSlug],
      });
      // Invalidate comments to update comment reaction counts
      queryClient.invalidateQueries({
        queryKey: ['comments', groupSlug, postSlug],
      });
    },
  });
};
