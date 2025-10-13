"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 as Spinner, UploadCloud, X, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { useDebounce } from "use-debounce";
import { useHashtags } from "@/hooks/community/use-community";
import { validateFiles } from "@/utils/file-validation";

interface NewPostFormProps {
  onSubmit: (post: {
    title: string;
    body: string;
    files: File[];
    hashtags: string[];
  }) => void;
  isLoading: boolean;
  searchHashtags: (query: string) => Promise<string[]>;
}

export function NewPostForm({
  onSubmit,
  isLoading,
  searchHashtags,
}: NewPostFormProps) {
  const t = useTranslations("CommunityNewPostForm");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [searchedTags, setSearchedTags] = useState<string[]>([]);
  const { createHashtag } = useHashtags();
  const [debouncedTagInput] = useDebounce(tagInput, 300);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILES = 5;
  const MAX_VIDEO_SIZE_MB = 30;
  const MAX_NON_VIDEO_SIZE_MB = 10;

  useEffect(() => {
    const fetchTags = async () => {
      if (!debouncedTagInput) {
        setSearchedTags([]);
        return;
      }
      const results = await searchHashtags(debouncedTagInput);
      setSearchedTags(results.filter((t) => !hashtags.includes(t)));
    };
    fetchTags();
  }, [debouncedTagInput, searchHashtags, hashtags]);

  const handleTagKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!newTag) return;

      // ✅ 检查标签是否已存在于已选中列表
      if (hashtags.includes(newTag)) {
        setTagInput("");
        return;
      }

      try {
        // ✅ 查询数据库看是否已存在
        const existingTags = await searchHashtags(newTag);
        const exists = existingTags.some(
          (t) => t.toLowerCase() === newTag.toLowerCase()
        );

        if (exists) {
          // 已存在，直接加到已选标签
          setHashtags((prev) => [...prev, newTag]);
        } else {
          // 不存在，先加到 UI
          setHashtags((prev) => [...prev, newTag]);
          // 再插入数据库
          createHashtag(newTag);
        }
      } catch (err) {
        console.error("Error handling tag:", err);
      }

      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    await onSubmit({ title, body, files, hashtags });
    setTitle("");
    setBody("");
    setFiles([]);
    setHashtags([]);
  };

  // dropzone config
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

  return (
    <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle>{t("create_post_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder={t("title_placeholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isLoading}
            className="bg-black/30 border-white/20 placeholder:text-gray-400"
          />
          <Textarea
            placeholder={t("body_placeholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={isLoading}
            className="bg-black/30 border-white/20 placeholder:text-gray-400"
          />

          {/* drag & drop area */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition ${
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
              <p className="text-sm text-gray-400">
                {t("drag_drop_or_click")} {t("upload_limits_hint", {
                  maxFiles: MAX_FILES,
                  maxVideoSize: MAX_VIDEO_SIZE_MB,
                  maxOtherSize: MAX_NON_VIDEO_SIZE_MB,
                })}
              </p>
            )}
          </div>

          {/* error message */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* preview uploaded files */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {files.map((file, index) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <div
                    key={index}
                    className="relative group border border-white/10 rounded-lg overflow-hidden bg-black/40"
                  >
                    {/* close button */}
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white opacity-70 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* file preview */}
                    {file.type.startsWith("image/") ? (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-28 object-cover"
                      />
                    ) : file.type.startsWith("video/") ? (
                      <video
                        src={previewUrl}
                        className="w-full h-28 object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex items-center justify-center h-28 text-sm text-gray-400 p-2">
                        {file.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hashtag Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="hashtags"
                className="text-sm font-medium text-gray-300"
              >
                {t("hashtags_label")}
              </label>
              <div className="group relative">
                <Info className="h-4 w-4 text-gray-400 hover:text-blue-400 cursor-help transition-colors" />
                {/* Hint Box */}
                <div
                  className="
                    absolute left-0 top-6 z-50 w-64 p-3 rounded-lg 
                    border border-blue-400/30 shadow-lg
                    backdrop-blur-md bg-blue-500/20 text-white text-xs leading-relaxed
                    opacity-0 scale-95 translate-y-1 
                    transition-all duration-300 ease-out
                    group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                  "
                >
                  {t("hashtags_hint")}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-dashed border-white/20 bg-black/30">
                <Input
                  id="hashtags"
                  type="text"
                  placeholder={t("add_or_search_tags")}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onFocus={() => {}}
                  className="flex-1 bg-transparent border-none focus:ring-0 p-2 h-auto placeholder:text-gray-500"
                />
              </div>

              {/* 下拉弹窗：绝对定位在输入框下方，覆盖其它内容 */}
              {searchedTags.length > 0 && (
                <ul
                  className="absolute left-0 right-0 mt-1 z-50 bg-gray-900/90 border border-white/10 rounded-md shadow-lg max-h-40 overflow-y-auto"
                  role="listbox"
                >
                  {searchedTags.map((raw) => {
                    // 如果每个 item 是对象 {id,name} 用 name，否则直接用字符串
                    const tagName =
                      typeof raw === "string" ? raw : (raw as any).name;
                    const key =
                      typeof raw === "string" ? tagName : (raw as any).id;

                    return (
                      <li
                        key={key}
                        // 使用 onMouseDown 而不是 onClick，确保在 input blur 前就选中
                        onMouseDown={(e) => {
                          e.preventDefault(); // 阻止 blur 或表单提交副作用
                          if (!hashtags.includes(tagName)) {
                            setHashtags((prev) => [...prev, tagName]);
                          }
                          setTagInput("");
                          setSearchedTags([]);
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-white/10 text-sm text-gray-100"
                        role="option"
                      >
                        #{tagName}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 下面继续渲染已选 badges（如果你想把 badges 放到这而不是上面可以移到这里） */}
            <div className="flex flex-wrap gap-2 mt-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md text-sm flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() =>
                      setHashtags((prev) => prev.filter((t) => t !== tag))
                    }
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          {/* END: Hashtag Section */}

          <Button
            type="submit"
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 border border-white/20 w-full !mt-6"
          >
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {t("post_button")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
