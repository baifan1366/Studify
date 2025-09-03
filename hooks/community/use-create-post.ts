"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classroomApi } from "@/lib/api";
import { apiSend, apiUploadFile } from "@/lib/api-config";

interface Attachment {
  id?: string;
  name: string;
  file?: File;
  type: string;
}

interface CreatePostParams {
  classroomId: string;
  content: string;
  attachments?: Attachment[];
}

/**
 * 创建课程帖子的 mutation hook
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreatePostParams>({
    mutationFn: async ({ classroomId, content, attachments = [] }) => {
      // 上传附件
      const uploadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.file) {
            const uploaded = await apiUploadFile(
              classroomApi.docs.upload(classroomId),
              attachment.file
            );

            return {
              id: uploaded.id,
              name: attachment.name,
              url: uploaded.url,
              type: attachment.type,
            };
          }
          return attachment; // 已有附件直接返回
        })
      );

      // 创建帖子
      return apiSend({
        url: classroomApi.posts.create(classroomId),
        method: "POST",
        body: {
          content,
          attachments: uploadedAttachments,
        },
      });
    },
    onSuccess: (_, { classroomId }) => {
      // 刷新帖子列表
      queryClient.invalidateQueries({ queryKey: ["classroom-posts", classroomId] });
    },
  });
}
