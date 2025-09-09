"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useGroupPosts } from "@/hooks/community/use-community";

interface CreatePostFormProps {
  groupSlug: string;
  groupName: string;
  onSuccess?: (postSlug: string) => void;
  onCancel?: () => void;
}

export default function CreatePostForm({
  groupSlug,
  groupName,
  onSuccess,
  onCancel,
}: CreatePostFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    slug: "",
    hashtags: [] as string[],
    files: [] as File[],
  });

  const router = useRouter();
  const { createPost, isCreatingPost, createPostError } =
    useGroupPosts(groupSlug);

  const handleTitleChange = (title: string) => {
    // Validate title length
    if (title.length > 200) {
      return;
    }

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .substring(0, 50);

    setFormData((prev) => ({ ...prev, title, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.title.trim() ||
      formData.title.length < 5 ||
      formData.title.length > 200
    ) {
      return;
    }

    if (!formData.body.trim()) {
      return;
    }

    createPost({
      title: formData.title,
      body: formData.body,
      files: formData.files,
      hashtags: formData.hashtags,
    }, {
      onSuccess: (newPost) => {
        setFormData({
          title: "",
          body: "",
          slug: "",
          hashtags: [],
          files: [],
        });
        if (onSuccess) {
          onSuccess(newPost.slug);
        } else {
          router.push(`/community/${groupSlug}/${newPost.slug}`);
        }
      },
    });
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Create New Post</CardTitle>
        <CardDescription className="text-gray-300">
          Share your thoughts with the {groupName} community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">
              Post Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="What would you like to discuss?"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-400">
              {formData.title.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-white">
              URL Slug (Optional)
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="auto-generated-from-title"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400">
              This will be used in the URL: /community/{groupSlug}/
              {formData.slug || "your-post-slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-white">
              Post Content
            </Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Share your thoughts, ask questions, or start a discussion..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[150px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-white">
              Tags (Optional)
            </Label>
            <Input
              id="tags"
              placeholder="javascript, react, web-development (comma separated)"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              onChange={(e) => {
                const hashtags = e.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                setFormData((prev) => ({ ...prev, hashtags }));
              }}
            />
          </div>

          {createPostError && (
            <Alert className="border-red-400 bg-red-400/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {createPostError.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={
                isCreatingPost ||
                !formData.title.trim() ||
                !formData.body.trim()
              }
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {isCreatingPost && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isCreatingPost ? "Publishing..." : "Publish Post"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreatingPost}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
