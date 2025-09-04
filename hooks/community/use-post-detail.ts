import { useQuery } from '@tanstack/react-query';
import { Post } from '@/interface/community/post-interface';

const fetchPostDetail = async (groupSlug: string, postSlug: string): Promise<Post> => {
  const response = await fetch(`/api/community/groups/${groupSlug}/posts/${postSlug}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }
  
  return response.json();
};

export const usePostDetail = (groupSlug: string, postSlug: string) => {
  return useQuery({
    queryKey: ['post', groupSlug, postSlug],
    queryFn: () => fetchPostDetail(groupSlug, postSlug),
    enabled: !!groupSlug && !!postSlug,
  });
};
