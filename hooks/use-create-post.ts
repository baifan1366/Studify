'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomApi } from '@/lib/api';

interface CreatePostParams {
  classroomId: string;
  content: string;
  attachments?: Array<{
    id?: string;
    name: string;
    file?: File;
    type: string;
  }>;
}

/**
 * 创建课程帖子的mutation hook
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, CreatePostParams>(
    async ({ classroomId, content, attachments = [] }) => {
      // 处理附件上传
      const uploadedAttachments = [];
      
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.file) {
            // 创建FormData对象
            const formData = new FormData();
            formData.append('file', attachment.file);
            
            // 上传文件
            const uploadResponse = await fetch(classroomApi.docs.upload(classroomId), {
              method: 'POST',
              body: formData,
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Failed to upload attachment');
            }
            
            const uploadResult = await uploadResponse.json();
            uploadedAttachments.push({
              id: uploadResult.id,
              name: attachment.name,
              url: uploadResult.url,
              type: attachment.type,
            });
          } else if (attachment.id) {
            // 已有的附件，直接添加
            uploadedAttachments.push(attachment);
          }
        }
      }
      
      // 创建帖子
      const response = await fetch(classroomApi.posts.create(classroomId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          attachments: uploadedAttachments,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      
      return response.json();
    },
    {
      onSuccess: (_, variables) => {
        // 成功后刷新帖子列表
        queryClient.invalidateQueries(['classroom-posts', variables.classroomId]);
      },
    }
  );
}