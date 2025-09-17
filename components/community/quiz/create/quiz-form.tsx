"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateQuiz } from "@/hooks/community/use-quiz";
import { useRouter, useParams } from "next/navigation";

export default function QuizForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams(); // { locale: 'en', ... } 在 app/[locale] 结构下可用

  const create = useCreateQuiz();

  const handleSubmit = () => {
    create.mutate(
      { title, description, difficulty, tags },
      {
        onSuccess: (data: any) => {
          // data.slug 返回自后端
          const slug = data?.slug;
          const locale = (params as any)?.locale ?? "en";
          if (!slug) {
            alert("Created but no slug returned");
            return;
          }
          // 跳转到该 quiz 的 create-question 页面
          router.push(`/${locale}/community/quizzes/${slug}/create-question`);
        },
        onError: (err: any) => {
          alert(err?.message ?? "Create failed");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Quiz Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div>
        <label className="block mb-2 font-medium">Difficulty (1-5)</label>
        <Input
          type="number"
          min={1}
          max={5}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
        />
      </div>

      {/* 你可以把 TagInput 拆出来；这里先用简单实现 */}
      <div>
        <label className="block mb-2 font-medium">Tags (comma separated)</label>
        <Input
          placeholder="math, calculus"
          value={tags.join(", ")}
          onChange={(e) =>
            setTags(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={create.isLoading}
      >
        {create.isLoading ? "Creating..." : "Create Quiz"}
      </Button>
    </div>
  );
}
