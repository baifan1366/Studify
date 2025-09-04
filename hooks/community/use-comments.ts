import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Comment } from '@/interface/community/comment-interface';

// Fetch comments for a post
const fetchComments = async (groupSlug: string, postSlug: string): Promise<Comment[]> => {
  const response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}/comments`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`);
  }
  
  return response.json();
};

// Create a new comment
const createComment = async (params: {
  groupSlug: string;
  postSlug: string;
  body: string;
  parent_id?: string;
}): Promise<Comment> => {
  const { groupSlug, postSlug, ...data } = params;
  const response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }
  
  return response.json();
};

// Delete a comment
const deleteComment = async (params: {
  groupSlug: string;
  postSlug: string;
  commentId: string;
}): Promise<void> => {
  const { groupSlug, postSlug, commentId } = params;
  const response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}/comments/${commentId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }
};

export const useComments = (groupSlug: string, postSlug: string) => {
  return useQuery({
    queryKey: ['comments', groupSlug, postSlug],
    queryFn: () => fetchComments(groupSlug, postSlug),
    enabled: !!groupSlug && !!postSlug,
  });
};

export const useCreateComment = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ['comments', groupSlug, postSlug],
      });
      // Also invalidate post data to update comment count
      queryClient.invalidateQueries({
        queryKey: ['post', groupSlug, postSlug],
      });
    },
  });
};

export const useDeleteComment = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ['comments', groupSlug, postSlug],
      });
      // Also invalidate post data to update comment count
      queryClient.invalidateQueries({
        queryKey: ['post', groupSlug, postSlug],
      });
    },
  });
};
