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
    mutationFn: async (newPost: { title: string; body: string; files: File[] }) => {
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('body', newPost.body);
      newPost.files.forEach(file => {
          formData.append('files', file);
      });

      const response = await fetch(COMMUNITY_API.groupPosts(slug), {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'API request failed');
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
  const queryClient = useQueryClient();

  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery<Post, Error>({
    queryKey: ["post", groupSlug, postSlug],
    queryFn: () => apiGet<Post>(COMMUNITY_API.postDetail(groupSlug, postSlug)),
    staleTime: 1000 * 60 * 1,
  });

  const {
    mutate: updatePost,
    isPending: isUpdatingPost,
    error: updatePostError,
  } = useMutation({
    mutationFn: (updates: { title: string; body: string }) =>
      apiSend<Post>({
        url: COMMUNITY_API.postDetail(groupSlug, postSlug),
        method: "PUT",
        body: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["post", groupSlug, postSlug],
      });
      queryClient.invalidateQueries({ queryKey: ["groupPosts", groupSlug] });
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] });
    },
  });

  const {
    mutate: deletePost,
    isPending: isDeletingPost,
    error: deletePostError,
  } = useMutation({
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

  return {
    post,
    isLoading,
    isError,
    error,
    updatePost,
    isUpdatingPost,
    updatePostError,
    deletePost,
    isDeletingPost,
    deletePostError,
  };
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
    mutationFn: (newPost: { title: string; body: string }) =>
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
