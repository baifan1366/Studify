"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api-config";
import { Group } from "@/interface/community/group-interface";
import { Post } from "@/interface/community/post-interface";
import { GroupMember } from "@/interface/community/group-member-interface";
//import { communityApi } from "@/lib/api"; //to be used

// API 路径常量
const COMMUNITY_API = {
  groups: "/api/community/groups",
  posts: "/api/community/posts",
  searchPosts: "/api/community/posts/search",
  groupDetail: (slug: string) => `/api/community/groups/${slug}`,
  groupMembers: (slug: string) => `/api/community/groups/${slug}/members`,
  groupPosts: (slug: string) => `/api/community/groups/${slug}/posts`,
  postDetail: (groupSlug: string, postSlug: string) =>
    `/api/community/groups/${groupSlug}/posts/${postSlug}`,
  groupAccess: (slug: string) => `/api/community/groups/${slug}/access`,
};

// Groups hooks
export const useGroups = () => {
  const queryClient = useQueryClient();

  const {
    data: groups,
    isLoading,
    isError,
    error,
  } = useQuery<Group[], Error>({
    queryKey: ["communityGroups"],
    queryFn: () => apiGet<Group[]>(COMMUNITY_API.groups),
    staleTime: 1000 * 60 * 5, // 缓存 5 分钟
  });

  const {
    mutate: createGroup,
    isPending: isCreatingGroup,
    error: createGroupError,
  } = useMutation({
    mutationFn: (newGroup: {
      name: string;
      description?: string;
      slug: string;
      visibility?: "public" | "private";
    }) =>
      apiSend<Group>({
        url: COMMUNITY_API.groups,
        method: "POST",
        body: newGroup,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });

  return {
    groups,
    isLoading,
    isError,
    error,
    createGroup,
    isCreatingGroup,
    createGroupError,
  };
};

// Group detail hook
export const useGroup = (slug: string) => {
  const queryClient = useQueryClient();

  const {
    data: group,
    isLoading,
    isError,
    error,
  } = useQuery<Group, Error>({
    queryKey: ["communityGroup", slug],
    queryFn: () => apiGet<Group>(COMMUNITY_API.groupDetail(slug)),
    staleTime: 1000 * 60 * 2, // 缓存 2 分钟
  });

  const {
    mutate: updateGroup,
    isPending: isUpdatingGroup,
    error: updateGroupError,
  } = useMutation({
    mutationFn: (updates: {
      name?: string;
      description?: string;
      visibility?: "public" | "private";
    }) =>
      apiSend<Group>({
        url: COMMUNITY_API.groupDetail(slug),
        method: "PUT",
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityGroup", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });

  const {
    mutate: deleteGroup,
    isPending: isDeletingGroup,
    error: deleteGroupError,
  } = useMutation({
    mutationFn: () =>
      apiSend({
        url: COMMUNITY_API.groupDetail(slug),
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });

  return {
    group,
    isLoading,
    isError,
    error,
    updateGroup,
    isUpdatingGroup,
    updateGroupError,
    deleteGroup,
    isDeletingGroup,
    deleteGroupError,
  };
};

// Group membership hooks
export const useGroupMembers = (slug: string) => {
  const queryClient = useQueryClient();

  const {
    data: members,
    isLoading,
    isError,
    error,
  } = useQuery<GroupMember[], Error>({
    queryKey: ["groupMembers", slug],
    queryFn: () => apiGet<GroupMember[]>(COMMUNITY_API.groupMembers(slug)),
    staleTime: 1000 * 60 * 2,
  });

  const {
    mutate: joinGroup,
    isPending: isJoining,
    error: joinError,
  } = useMutation({
    mutationFn: () =>
      apiSend({
        url: COMMUNITY_API.groupMembers(slug),
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMembers", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroup", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });

  const {
    mutate: leaveGroup,
    isPending: isLeaving,
    error: leaveError,
  } = useMutation({
    mutationFn: () =>
      apiSend({
        url: COMMUNITY_API.groupMembers(slug),
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMembers", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroup", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] });
    },
  });

  return {
    members,
    isLoading,
    isError,
    error,
    joinGroup,
    isJoining,
    joinError,
    leaveGroup,
    isLeaving,
    leaveError,
  };
};

// Group posts hooks
export const useGroupPosts = (slug: string) => {
  const queryClient = useQueryClient();

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<Post[], Error>({
    queryKey: ["groupPosts", slug],
    queryFn: () => apiGet<Post[]>(COMMUNITY_API.groupPosts(slug)),
    staleTime: 1000 * 60 * 1,
  });

  const {
    mutate: createPost,
    isPending: isCreatingPost,
    error: createPostError,
  } = useMutation({
    mutationFn: async (newPost: {
      title: string;
      body: string;
      files: File[];
      hashtags: string[];
    }) => {
      const formData = new FormData();
      formData.append("title", newPost.title);
      formData.append("body", newPost.body);
      newPost.hashtags.forEach((tag) => formData.append("hashtags", tag));
      newPost.files.forEach((file) => formData.append("files", file));

      const response = await fetch(COMMUNITY_API.groupPosts(slug), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "API request failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupPosts", slug] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
    },
  });

  return {
    posts,
    isLoading,
    isError,
    error,
    createPost,
    isCreatingPost,
    createPostError,
  };
};

// Individual post hook
export const usePost = (groupSlug: string, postSlug: string) => {
  return useQuery<Post, Error>({
    queryKey: ["post", groupSlug, postSlug],
    queryFn: () => apiGet<Post>(COMMUNITY_API.postDetail(groupSlug, postSlug)),
    staleTime: 1000 * 60 * 1,
  });
};

// 更新单个 post
export const useUpdatePost = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: {
        title?: string;
        body?: string;
        files?: File[];
        removeFileIds?: string[];
      }
    ) => {
      const formData = new FormData();
      if (updates.title !== undefined) {
        formData.append("title", updates.title);
      }
      if (updates.body !== undefined) {
        formData.append("body", updates.body);
      }
      if (updates.files) {
        updates.files.forEach((file) => formData.append("files", file));
      }
      if (updates.removeFileIds) {
        updates.removeFileIds.forEach((id) =>
          formData.append("removeFileIds", id)
        );
      }

      const response = await fetch(
        COMMUNITY_API.postDetail(groupSlug, postSlug),
        {
          method: "PATCH",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "API request failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["post", groupSlug, postSlug],
      });
      queryClient.invalidateQueries({ queryKey: ["groupPosts", groupSlug] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
    },
  });
};

// 删除单个 post
export const useDeletePost = (groupSlug: string, postSlug: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiSend({
        url: COMMUNITY_API.postDetail(groupSlug, postSlug),
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupPosts", groupSlug] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
    },
  });
};

// Popular posts hook for main feed
export const usePopularPosts = () => {
  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<Post[], Error>({
    queryKey: ["popularPosts"],
    queryFn: () => apiGet<Post[]>(`${COMMUNITY_API.posts}?sort=popular`),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  return {
    posts,
    isLoading,
    isError,
    error,
  };
};

// User's groups hook
export const useUserGroups = () => {
  const {
    data: groups,
    isLoading,
    isError,
    error,
  } = useQuery<Group[], Error>({
    queryKey: ["userGroups"],
    queryFn: () => apiGet<Group[]>(`${COMMUNITY_API.groups}?filter=joined`),
    staleTime: 1000 * 60 * 5,
  });

  return {
    groups,
    isLoading,
    isError,
    error,
  };
};

// All user groups hook (no limit, for modal)
export const useAllUserGroups = () => {
  const {
    data: groups,
    isLoading,
    isError,
    error,
  } = useQuery<Group[], Error>({
    queryKey: ["allUserGroups"],
    queryFn: () => apiGet<Group[]>(`${COMMUNITY_API.groups}?filter=joined&limit=100`), // Get all joined groups
    staleTime: 1000 * 60 * 5,
  });

  return {
    groups,
    isLoading,
    isError,
    error,
  };
};

// Suggested groups hook
export const useSuggestedGroups = () => {
  const {
    data: groups,
    isLoading,
    isError,
    error,
  } = useQuery<Group[], Error>({
    queryKey: ["suggestedGroups"],
    queryFn: () =>
      apiGet<Group[]>(`${COMMUNITY_API.groups}?filter=suggested&limit=5`),
    staleTime: 1000 * 60 * 10,
  });

  return {
    groups,
    isLoading,
    isError,
    error,
  };
};

// Group access check hook
export const useGroupAccess = (slug: string) => {
  const {
    data: accessData,
    isLoading,
    isError,
    error,
  } = useQuery<{ group: Group; canPost: boolean }, Error>({
    queryKey: ["groupAccess", slug],
    queryFn: () =>
      apiGet<{ group: Group; canPost: boolean }>(
        `${COMMUNITY_API.groupDetail(slug)}/access`
      ),
    staleTime: 1000 * 60 * 2,
  });

  return {
    group: accessData?.group,
    canPost: accessData?.canPost,
    isLoading,
    isError,
    error,
  };
};

// Legacy community posts hook (for backward compatibility)
export const useCommunity = () => {
  const queryClient = useQueryClient();

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<Post[], Error>({
    queryKey: ["communityPosts"],
    queryFn: () => apiGet<Post[]>(COMMUNITY_API.posts),
    staleTime: 1000 * 60 * 1,
    refetchOnWindowFocus: true,
  });

  const {
    mutate: addPost,
    isPending: isAddingPost,
    error: addPostError,
  } = useMutation({
    mutationFn: (newPost: {
      title: string;
      body: string;
      files: File[];
      hashtags: string[];
    }) =>
      apiSend<Post>({
        url: COMMUNITY_API.posts,
        method: "POST",
        body: newPost,
      }),
    onSuccess: () => {
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

type Hashtag = { id: number; name: string };

export const useHashtags = () => {
  const queryClient = useQueryClient();

  // 查询所有 hashtags
  const {
    data: hashtags,
    isLoading,
    isError,
    error,
  } = useQuery<Hashtag[], Error>({
    queryKey: ["allHashtags"],
    queryFn: () => apiGet<Hashtag[]>("/api/community/hashtags"),
    staleTime: 1000 * 60 * 5,
  });

  // 搜索 hashtags
  const searchHashtags = async (query: string): Promise<Hashtag[]> => {
    if (!query) return [];
    try {
      const response = await fetch(
        `/api/community/hashtags?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Failed to fetch hashtags");
      return await response.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // 新建 hashtag mutation
  const {
    mutate: createHashtag,
    isPending: isCreatingHashtag,
    error: createHashtagError,
  } = useMutation({
    mutationFn: (tag: string) =>
      apiSend<Hashtag>({
        url: "/api/community/hashtags",
        method: "POST",
        body: { tag },
      }),
    onSuccess: () => {
      // 新建成功后，刷新 hashtags 列表
      queryClient.invalidateQueries({ queryKey: ["allHashtags"] });
    },
  });

  return {
    hashtags,
    isLoading,
    isError,
    error,
    searchHashtags,
    createHashtag,
    isCreatingHashtag,
    createHashtagError,
  };
};

// Search posts hook
export const useSearchPosts = (query: string) => {
  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<Post[], Error>({
    queryKey: ["searchPosts", query],
    queryFn: () => {
      if (!query || query.trim() === "") return Promise.resolve([]);
      return apiGet<Post[]>(
        `${COMMUNITY_API.searchPosts}?query=${encodeURIComponent(query)}`
      );
    },
    enabled: !!query && query.trim().length > 0, // 只有在 query 有值时才发请求
    staleTime: 1000 * 30, // 缓存 30 秒，避免用户每次输入都重新拉
  });

  return {
    posts,
    isLoading,
    isError,
    error,
  };
};
