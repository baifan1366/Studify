"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 as Spinner, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";

interface NewPostFormProps {
  onSubmit: (post: { title: string; body: string; files: File[] }) => void;
  isLoading: boolean;
}

export function NewPostForm({ onSubmit, isLoading }: NewPostFormProps) {
  const t = useTranslations("CommunityNewPostForm");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    onSubmit({ title, body, files });
    setTitle("");
    setBody("");
    setFiles([]);
  };

  // dropzone config
  const onDrop = (acceptedFiles: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    let currentFiles = [...files];

    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件 ${file.name} 超过了 10MB 限制`);
        continue;
      }
      if (currentFiles.length >= MAX_FILES) {
        setError(`最多只能上传 ${MAX_FILES} 个文件`);
        break;
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
                {t("drag_drop_or_click")} (最多 {MAX_FILES} 个, 单个 ≤ 10MB)
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

          <Button
            type="submit"
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 border border-white/20 w-full"
          >
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {t("post_button")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
