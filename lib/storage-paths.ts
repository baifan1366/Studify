/**
 * Supabase Storage 路径配置
 * 统一管理所有存储路径，确保一致性
 */

// 主要存储桶名称
export const STORAGE_BUCKETS = {
  CLASSROOM_ATTACHMENT: 'whiteboard', // 使用 whiteboard 桶
  USER_AVATARS: 'user-avatars', 
  ASSIGNMENT_FILES: 'assignment-files',
  CHAT_ATTACHMENTS: 'chat-attachments', // 聊天附件桶
} as const;

// 存储路径生成器
export const STORAGE_PATHS = {
  /**
   * 白板图片路径
   * @param classroomSlug 课堂标识
   * @param sessionId 会话ID
   * @returns private/whiteboard/{classroomSlug}/{sessionId}/canvas.png
   */
  whiteboard: (classroomSlug: string, sessionId: string) => 
    `private/whiteboard/${classroomSlug}/${sessionId}/canvas.png`,

  /**
   * 课堂附件路径
   * @param classroomSlug 课堂标识
   * @param fileName 文件名
   * @returns uploads/{classroomSlug}/{fileName}
   */
  classroomUpload: (classroomSlug: string, fileName: string) =>
    `uploads/${classroomSlug}/${fileName}`,

  /**
   * 作业文件路径
   * @param assignmentId 作业ID
   * @param userId 用户ID
   * @param fileName 文件名
   * @returns private/assignments/{assignmentId}/{userId}/{fileName}
   */
  assignmentFile: (assignmentId: string, userId: string, fileName: string) =>
    `private/assignments/${assignmentId}/${userId}/${fileName}`,

  /**
   * 用户头像路径
   * @param userId 用户ID
   * @param fileName 文件名（包含扩展名）
   * @returns public/{userId}/avatar/{fileName}
   */
  userAvatar: (userId: string, fileName: string) =>
    `public/${userId}/avatar/${fileName}`,

  /**
   * 临时文件路径
   * @param fileName 文件名
   * @returns temp/{timestamp}_{fileName}
   */
  tempFile: (fileName: string) =>
    `temp/${Date.now()}_${fileName}`,

  /**
   * 聊天附件路径
   * @param userId 用户ID
   * @param conversationId 会话ID
   * @param fileName 文件名
   * @returns chat/{userId}/{conversationId}/{timestamp}_{fileName}
   */
  chatAttachment: (userId: string, conversationId: string, fileName: string) =>
    `chat/${userId}/${conversationId}/${Date.now()}_${fileName}`,
} as const;

// 文件类型配置
export const FILE_CONFIGS = {
  WHITEBOARD: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    bucket: STORAGE_BUCKETS.CLASSROOM_ATTACHMENT,
  },
  AVATAR: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    bucket: STORAGE_BUCKETS.USER_AVATARS,
  },
  ASSIGNMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    bucket: STORAGE_BUCKETS.ASSIGNMENT_FILES,
  },
  CLASSROOM_UPLOAD: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['image/*', 'application/pdf', 'text/*'],
    bucket: STORAGE_BUCKETS.CLASSROOM_ATTACHMENT,
  },
  CHAT_ATTACHMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.*', 'application/zip', 'application/x-rar-compressed'],
    bucket: STORAGE_BUCKETS.CHAT_ATTACHMENTS,
  },
} as const;

// 辅助函数
export const StorageUtils = {
  /**
   * 生成唯一的文件名
   * @param originalName 原始文件名
   * @param prefix 前缀（可选）
   * @returns 唯一文件名
   */
  generateUniqueFileName: (originalName: string, prefix?: string) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    
    return prefix 
      ? `${prefix}_${timestamp}_${randomStr}_${baseName}.${extension}`
      : `${timestamp}_${randomStr}_${baseName}.${extension}`;
  },

  /**
   * 验证文件类型
   * @param fileType 文件MIME类型
   * @param allowedTypes 允许的类型数组
   * @returns 是否允许
   */
  isFileTypeAllowed: (fileType: string, allowedTypes: string[]) => {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.slice(0, -1));
      }
      return fileType === type;
    });
  },

  /**
   * 验证文件大小
   * @param fileSize 文件大小（字节）
   * @param maxSize 最大允许大小（字节）
   * @returns 是否在允许范围内
   */
  isFileSizeValid: (fileSize: number, maxSize: number) => {
    return fileSize <= maxSize;
  },

  /**
   * 格式化文件大小显示
   * @param bytes 字节数
   * @returns 格式化的大小字符串
   */
  formatFileSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default STORAGE_PATHS;
