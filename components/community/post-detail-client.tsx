"use client";

import React, { useState, useRef, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Clock,
  MessageSquare,
  ThumbsUp,
  Heart,
  Users,
  Loader2,
  Reply,
  Trash2,
  MoreHorizontal,
  Paperclip,
  X,
  UploadCloud,
  Pencil,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Post, PostFile } from "@/interface/community/post-interface";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDropzone } from "react-dropzone";
import { Comment } from "@/interface/community/comment-interface";
import { usePostDetail } from "@/hooks/community/use-post-detail";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useEditComment,
} from "@/hooks/community/use-comments";
import { useToggleReaction } from "@/hooks/community/use-reactions";
import { useFormat } from "@/hooks/use-format";
import { useTranslations } from "next-intl";
import { useUpdatePost, useDeletePost } from "@/hooks/community/use-community";
import { validateFiles } from "@/utils/file-validation";
import ZoomImage from "@/components/image-zoom/ZoomImage";
import SharePostDialog from "./share-post-dialog";
import { ReportButton } from "@/components/ui/report-button";

// Reaction button component
const ReactionButton = ({
  emoji,
  count,
  isActive,
  onClick,
  disabled,
}: {
  emoji: string;
  count: number;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className={`hover:bg-white/10 hover:text-white px-2 ${
      isActive ? "bg-blue-500/20 text-blue-400" : "text-gray-300"
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    <span className="mr-1">{emoji}</span>
    <span className="text-xs">{count}</span>
  </Button>
);

const CommentForm = ({
  groupSlug,
  postSlug,
  parentId,
  onCancel,
  placeholder,
}: {
  groupSlug: string;
  postSlug: string;
  parentId?: number;
  onCancel?: () => void;
  placeholder?: string;
}) => {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useTranslations("CommunityPostDetail");
  const createCommentMutation = useCreateComment(groupSlug, postSlug);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const validFiles = filesArray.filter((file) =>
        allowedTypes.includes(file.type)
      );
      setAttachments((prev) => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;

    try {
      await createCommentMutation.mutateAsync({
        groupSlug,
        postSlug,
        body: body.trim(),
        parent_id: parentId?.toString(),
        files: attachments,
      });
      setBody("");
      setAttachments([]);
      onCancel?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder || t("comment_form.placeholder")}
        className="min-h-[80px] bg-black/20 border-white/10 text-white resize-none"
        disabled={createCommentMutation.isPending}
      />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center bg-white/10 text-white px-2 py-1 rounded-md text-xs"
            >
              {file.name}
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="ml-2 hover:text-red-400 z-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={
            (!body.trim() && attachments.length === 0) ||
            createCommentMutation.isPending
          }
        >
          {createCommentMutation.isPending
            ? t("comment_form.submitting")
            : t("comment_form.submit")}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={createCommentMutation.isPending}
          >
            {t("comment_form.cancel")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={16} />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </form>
  );
};

const CommentItem = ({
  comment,
  groupSlug,
  postSlug,
  depth = 0,
}: {
  comment: Comment;
  groupSlug: string;
  postSlug: string;
  depth?: number;
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const { formatRelativeTime } = useFormat();
  const t = useTranslations("CommunityPostDetail");
  const deleteCommentMutation = useDeleteComment(groupSlug, postSlug);
  const toggleReactionMutation = useToggleReaction(groupSlug, postSlug);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editBody, setEditBody] = useState(comment.body || "");
  const editCommentMutation = useEditComment(groupSlug, postSlug);

  const commentMaxDepth = 3;

  const handleReaction = (emoji: string) => {
    toggleReactionMutation.mutate({
      groupSlug,
      postSlug,
      emoji,
      target_type: "comment",
      target_id: comment.id.toString(),
    });
  };

  const handleSaveEdit = () => {
    editCommentMutation.mutate(
      {
        groupSlug,
        postSlug,
        commentId: comment.id.toString(),
        body: editBody,
      },
      {
        onSuccess: () => {
          setShowEditForm(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm(t("comment_actions.confirm_delete"))) {
      deleteCommentMutation.mutate({
        groupSlug,
        postSlug,
        commentId: comment.id.toString(),
      });
    }
  };

  const replies = comment.replies || [];
  const marginLeft = depth > 0 ? `${Math.min(depth * 24, 96)}px` : "0px";

  return (
    <div style={{ marginLeft }} className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage
            src={comment.author?.avatar_url}
            alt={comment.author?.display_name}
          />
          <AvatarFallback>{comment.author?.display_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-black/20 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-white">
                {comment.author?.display_name}
              </p>
              <p className="text-xs text-gray-400">
                {formatRelativeTime(comment.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowEditForm(!showEditForm);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("comment_actions.edit")}
                  </DropdownMenuItem>
                  {depth < commentMaxDepth && (
                    <DropdownMenuItem
                      onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      {t("comment_actions.reply")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("comment_actions.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ReportButton 
                targetId={comment.author_id} 
                targetType="comment" 
              />
            </div>
          </div>
          {/* 这里判断是否在编辑 */}
          {showEditForm ? (
            <div className="space-y-2">
              <textarea
                className="w-full p-2 rounded bg-black/30 border border-gray-700 text-white text-sm"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editCommentMutation.isPending}
                >
                  {t("comment_actions.save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEditForm(false)}
                >
                  {t("comment_actions.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-300 mb-3">{comment.body}</p>
              {comment.files && comment.files.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {comment.files.map((file) => (
                    <img
                      key={file.id || file.file_name}
                      src={file.url}
                      alt={file.file_name}
                      className="rounded-lg max-h-40 w-full object-cover cursor-pointer hover:opacity-80 transition"
                      onClick={() => window.open(file.url, "_blank")}
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <ReactionButton
                  emoji="👍"
                  count={comment.reactions?.["👍"] || 0}
                  onClick={() => handleReaction("👍")}
                  disabled={toggleReactionMutation.isPending}
                />
                <ReactionButton
                  emoji="❤️"
                  count={comment.reactions?.["❤️"] || 0}
                  onClick={() => handleReaction("❤️")}
                  disabled={toggleReactionMutation.isPending}
                />
                <ReactionButton
                  emoji="😂"
                  count={comment.reactions?.["😂"] || 0}
                  onClick={() => handleReaction("😂")}
                  disabled={toggleReactionMutation.isPending}
                />
                <ReactionButton
                  emoji="😡"
                  count={comment.reactions?.["😡"] || 0}
                  onClick={() => handleReaction("😡")}
                  disabled={toggleReactionMutation.isPending}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {showReplyForm && (
        <div className="ml-11">
          <CommentForm
            groupSlug={groupSlug}
            postSlug={postSlug}
            parentId={comment.id}
            onCancel={() => setShowReplyForm(false)}
            placeholder={t("comment_form.reply_placeholder")}
          />
        </div>
      )}
      {replies.length > 0 && (
        <div className="ml-11 border-l border-gray-700 pl-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal"
          >
            {showReplies
              ? t("comment_actions.hide_replies")
              : t("comment_actions.show_replies")}{" "}
            ({replies.length})
          </Button>
          {showReplies && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  groupSlug={groupSlug}
                  postSlug={postSlug}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const buildCommentTree = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<number, Comment>();
  const rootComments: Comment[] = [];
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [], depth: 0 });
  });
  comments.forEach((comment) => {
    const commentWithReplies = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        commentWithReplies.depth = (parent.depth ?? 0) + 1;
        parent.replies = parent.replies || [];
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });
  return rootComments;
};

const PostEditForm = ({
  post,
  onSave,
  onCancel,
}: {
  post: Post;
  onSave: (updates: any) => void;
  onCancel: () => void;
}) => {
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editBody, setEditBody] = useState(post.body || "");
  const [existingFiles, setExistingFiles] = useState<PostFile[]>(
    post.files || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("CommunityPostDetail");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILES = 5;
  const MAX_VIDEO_SIZE_MB = 30;
  const MAX_NON_VIDEO_SIZE_MB = 10;

  const onDrop = (acceptedFiles: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    let currentFiles = [...files];

    for (const file of acceptedFiles) {
      // 先检查文件数量
      if (currentFiles.length >= MAX_FILES) {
        setError(`最多只能上传 ${MAX_FILES} 个文件`);
        break;
      }

      // 调用统一的文件验证逻辑
      const result = validateFiles([file], {
        maxVideoSizeMB: MAX_VIDEO_SIZE_MB,
        maxOtherSizeMB: MAX_NON_VIDEO_SIZE_MB,
      });

      if (!result.valid) {
        setError(result.error);
        continue;
      }

      validFiles.push(file);
      currentFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
      "application/pdf": [],
      "application/msword": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
      "application/zip": [],
      "application/x-zip-compressed": [],
    },
    multiple: true,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const validFiles = filesArray.filter((file) =>
        allowedTypes.includes(file.type)
      );
      setNewFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeExistingFile = (fileId: string) => {
    setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };
  3;
  const handleSave = () => {
    const removedFileIds = (post.files || [])
      .filter((f) => !existingFiles.find((ef) => ef.id === f.id))
      .map((f) => f.id);
    onSave({
      title: editTitle,
      body: editBody,
      files,
      removeFileIds: removedFileIds,
    });
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="edit-title"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {t("edit_form.title")}
          </label>
          <Input
            id="edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="bg-black/20 border-white/10"
          />
        </div>
        <div>
          <label
            htmlFor="edit-body"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {t("edit_form.body")}
          </label>
          <Textarea
            id="edit-body"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="min-h-[200px] bg-black/20 border-white/10"
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            {t("edit_form.attachments")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* 已有文件 */}
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="relative group aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center"
              >
                <button
                  onClick={() => removeExistingFile(file.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-100"
                >
                  <X className="h-4 w-4" />
                </button>

                {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={file.url}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Paperclip className="h-8 w-8 mb-2" />
                    <span className="text-xs truncate max-w-[90%]">
                      {file.file_name}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* 新上传的文件 */}
            {files.map((file, index) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div
                  key={index}
                  className="relative group aspect-video rounded-lg overflow-hidden bg-black/40 flex items-center justify-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFiles(files.filter((_, i) => i !== index))
                    }
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white opacity-70 hover:opacity-100 z-100"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {file.type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type.startsWith("video/") ? (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Paperclip className="h-8 w-8 mb-2" />
                      <span className="text-xs truncate max-w-[90%]">
                        {file.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* drag & drop 区 */}
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-xl cursor-pointer transition ${
                isDragActive
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/20 bg-black/30"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-6 w-6 mb-2 text-gray-400" />
              {isDragActive ? (
                <p className="text-sm text-blue-300">{t("drop_here")}</p>
              ) : (
                <p className="text-sm text-gray-400 text-center">
                  {t("drag_drop_or_click")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button onClick={handleSave}>{t("save")}</Button>
      </div>
    </div>
  );
};

const PostDetailContent = ({
  post,
  groupSlug,
  postSlug,
}: {
  post: Post;
  groupSlug: string;
  postSlug: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"flat" | "tree">("tree");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { formatRelativeTime } = useFormat();
  const t = useTranslations("CommunityPostDetail");
  const toggleReactionMutation = useToggleReaction(groupSlug, postSlug);
  const { data: comments = [], isLoading: commentsLoading } = useComments(
    groupSlug,
    postSlug
  );
  const updatePostMutation = useUpdatePost(groupSlug, postSlug);
  const deletePostMutation = useDeletePost(groupSlug, postSlug);

  const handleSave = async (updates: any) => {
    try {
      await updatePostMutation.mutateAsync(updates);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update post:", err);
    }
  };

  const handleDeletePost = async () => {
    try {
      await deletePostMutation.mutateAsync();
      // delete 后跳转到社区主页
      window.location.href = `/community/${groupSlug}`; // TODO: use a better redirect method
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  const handlePostReaction = (emoji: string) => {
    toggleReactionMutation.mutate({
      groupSlug,
      postSlug,
      emoji,
      target_type: "post",
      target_id: post.id.toString(),
    });
  };

  const displayComments =
    viewMode === "tree" ? buildCommentTree(comments) : comments;
  const files = post.files;

  if (isEditing) {
    return (
      <PostEditForm
        post={post}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.group && (
                <Link href={`/community/${post.group.slug}`}>
                  <Badge
                    variant="outline"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400/10 cursor-pointer"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    {post.group.name}
                  </Badge>
                </Link>
              )}
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeTime(
                  post.created_at || new Date().toISOString()
                )}
              </div>
            </div>
            <CardTitle className="text-2xl leading-tight">
              {post.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={post.author?.avatar_url}
                  alt={post.author?.display_name}
                />
                <AvatarFallback>
                  {post.author?.display_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-300">
                {post.author?.display_name || t("unknown_author")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                {t("edit_post")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(t("confirm_delete_post"))) {
                    handleDeletePost();
                  }
                }}
                className="text-red-500"
              >
                {t("delete_post")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="prose prose-invert max-w-none text-gray-200">
          {post.body}
        </div>
      </CardContent>

      {files && files.length > 0 && (
        <CardContent className="pt-0">
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-black/30 rounded-lg overflow-hidden flex items-center justify-center aspect-video"
              >
                {file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <ZoomImage
                    src={file.url}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover"
                    controls={true}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 p-4">
                    <Paperclip className="h-8 w-8 mb-2" />
                    <span className="text-xs truncate max-w-[90%]">
                      {file.file_name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}

      <CardContent className="flex justify-between pt-3">
        <div className="flex space-x-2">
          <ReactionButton
            emoji="👍"
            count={post.reactions?.["👍"] || 0}
            onClick={() => handlePostReaction("👍")}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="❤️"
            count={post.reactions?.["❤️"] || 0}
            onClick={() => handlePostReaction("❤️")}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="😂"
            count={post.reactions?.["😂"] || 0}
            onClick={() => handlePostReaction("😂")}
            disabled={toggleReactionMutation.isPending}
          />
          <ReactionButton
            emoji="😡"
            count={post.reactions?.["😡"] || 0}
            onClick={() => handlePostReaction("😡")}
            disabled={toggleReactionMutation.isPending}
          />
          <Button variant="ghost" size="sm" className="text-gray-300 px-2">
            <MessageSquare className="mr-1 h-4 w-4" />
            <span className="text-xs">{comments.length}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-300 px-2 hover:bg-white/10 hover:text-white"
            onClick={() => setShowShareDialog(true)}
          >
            <Send className="mr-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {post.hashtags && post.hashtags.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag) => (
              <Link
                key={tag.name}
                href={`/community/hashtags/${tag.name}`}
                className="hover:underline"
              >
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                >
                  #{tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      )}

      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {t("comments_title")} ({comments.length})
          </h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("flat")}
            >
              {t("view_modes.flat")}
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("tree")}
            >
              {t("view_modes.tree")}
            </Button>
          </div>
        </div>
        <div className="mb-6">
          <CommentForm groupSlug={groupSlug} postSlug={postSlug} />
        </div>
        {commentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {t("empty_comments")}
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === "tree"
              ? displayComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    groupSlug={groupSlug}
                    postSlug={postSlug}
                  />
                ))
              : comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    groupSlug={groupSlug}
                    postSlug={postSlug}
                    depth={0}
                  />
                ))}
          </div>
        )}
      </CardContent>
      
      <SharePostDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        post={post}
      />
    </Card>
  );
};

const LoadingSpinner = () => {
  const t = useTranslations("CommunityPostDetail");
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      <span className="ml-2 text-gray-400">{t("loading")}</span>
    </div>
  );
};

const ErrorMessage = ({ message }: { message: string }) => (
  <Card className="bg-red-500/10 backdrop-blur-lg border border-red-500/20 text-white rounded-xl shadow-lg">
    <CardContent className="p-6 text-center">
      <p className="text-red-400">{message}</p>
    </CardContent>
  </Card>
);

export default function PostDetailClient({
  groupSlug,
  postSlug,
}: {
  groupSlug: string;
  postSlug: string;
}) {
  const { data: post, isLoading, error } = usePostDetail(groupSlug, postSlug);
  const t = useTranslations("CommunityPostDetail");

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={t("error_loading")} />;
  }

  if (!post) {
    return <ErrorMessage message={t("post_not_found")} />;
  }

  return (
    <PostDetailContent post={post} groupSlug={groupSlug} postSlug={postSlug} />
  );
}
