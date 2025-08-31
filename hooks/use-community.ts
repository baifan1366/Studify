import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define the type for a post, based on what the API returns.
// This should be kept in sync with the API route.
// It would be best to move this to a shared interface file, e.g., 'interface/community/post-interface.ts'
interface Post {
  id: number;
  created_at: string;
  title: string;
  body: string;
  author_id: number;
  author: {
    display_name: string;
    avatar_url: string;
  };
  commentsCount: number;
  reactions: Record<string, number>;
}

// Function to fetch posts
const fetchPosts = async (): Promise<Post[]> => {
  const response = await fetch('/api/community/posts');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

// Function to create a new post
const createPost = async (newPost: { title: string; body: string }) => {
  const response = await fetch('/api/community/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newPost),
  });
  if (!response.ok) {
    throw new Error('Failed to create post');
  }
  return response.json();
};

export const useCommunity = () => {
  const queryClient = useQueryClient();

  // Query for fetching all posts
  const { data: posts, isLoading, isError, error } = useQuery<Post[], Error>({
    queryKey: ['communityPosts'],
    queryFn: fetchPosts,
  });

  // Mutation for creating a new post
  const { mutate: addPost, isPending: isAddingPost } = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      // When a post is successfully created, invalidate the posts query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    },
  });

  return {
    posts,
    isLoading,
    isError,
    error,
    addPost,
    isAddingPost,
  };
};
