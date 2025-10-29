import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Comment } from "@/interface/community/comment-interface";
import { toast } from "sonner";

// Fetch comments for a post
const fetchComments = async (
  groupSlug: string,
  postSlug: string
): Promise<Comment[]> => {
  const response = await fetch(
    `/api/community/groups/${groupSlug}/posts/${postSlug}/comments`
  );

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
  files?: File[];
}): Promise<Comment> => {
  const { groupSlug, postSlug, body, parent_id, files } = params;

  const formData = new FormData();
  formData.append("body", body);
  formData.append("sendNotification", "true"); // Enable notification for community comments
  if (parent_id) {
    formData.append("parent_id", parent_id);
  }
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append("files", file);
    });
  }

  const response = await fetch(
    `/api/community/groups/${groupSlug}/posts/${postSlug}/comments`,
    {
      method: "POST",
      body: formData, // 不再需要 headers['Content-Type']
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  return response.json();
};

const editComment = async (params: {
  groupSlug: string;
  postSlug: string;
  commentId: string;
  body: string;
}): Promise<Comment> => {
  const { groupSlug, postSlug, commentId, body } = params;

  const formData = new FormData();
  formData.append("body", body);

  const response = await fetch(
    `/api/community/groups/${groupSlug}/posts/${postSlug}/comments/${commentId}`,
    {
      method: "PATCH",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to edit comment: ${response.statusText}`);
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
  const response = await fetch(
    `/api/community/groups/${groupSlug}/posts/${postSlug}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }
};

export const useComments = (groupSlug: string, postSlug: string) => {
  return useQuery({
    queryKey: ["comments", groupSlug, postSlug],
    queryFn: () => fetchComments(groupSlug, postSlug),
    enabled: !!groupSlug && !!postSlug,
  });
};

export const useCreateComment = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: () => {
      toast.success("Comment posted successfully!", {
        description: "Your comment has been added.",
      });
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ["comments", groupSlug, postSlug],
      });
      // Also invalidate post data to update comment count
      queryClient.invalidateQueries({
        queryKey: ["post", groupSlug, postSlug],
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to post comment");
    },
  });
};

export const useEditComment = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: editComment,
    onSuccess: () => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ["comments", groupSlug, postSlug],
      });
      // 可能需要更新 post 数据（例如评论数没变，但 last_updated 可能更新）
      queryClient.invalidateQueries({
        queryKey: ["post", groupSlug, postSlug],
      });
    },
  });
};

export const useDeleteComment = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      toast.success("Comment deleted successfully");
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ["comments", groupSlug, postSlug],
      });
      // Also invalidate post data to update comment count
      queryClient.invalidateQueries({
        queryKey: ["post", groupSlug, postSlug],
      });
    },
  });
};
