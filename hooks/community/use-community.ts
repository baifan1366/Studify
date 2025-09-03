"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";
import type { Post } from '@/interface/community/post-interface';

// API 路径常量
const COMMUNITY_API = {
  list: "/api/community/posts",
  create: "/api/community/posts",
};

export const useCommunity = () => {
  const queryClient = useQueryClient();

  // 查询帖子列表
  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<Post[], Error>({
    queryKey: ["communityPosts"],
    queryFn: () => apiGet<Post[]>(COMMUNITY_API.list), // ✅ 用 apiGet
    staleTime: 1000 * 60 * 1, // 缓存 1 分钟
    refetchOnWindowFocus: true,
  });

  // 创建帖子
  const {
    mutate: addPost,
    isPending: isAddingPost,
    error: addPostError,
  } = useMutation({
    mutationFn: (newPost: { title: string; body: string }) =>
      apiSend<Post>({
        url: COMMUNITY_API.create, 
        method: "POST",
        body: newPost,
      }),
    onSuccess: () => {
      // 成功后重新获取帖子
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
    },
  });

  return {
    posts,
    isLoading,
    isError,
    error,
    addPost,
    isAddingPost,
    addPostError,
  };
};
