"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateQuiz } from "@/hooks/community/use-quiz";
import { useRouter, useParams } from "next/navigation";

export default function QuizForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const router = useRouter();
  const params = useParams(); // { locale: 'en', ... } 在 app/[locale] 结构下可用

  const create = useCreateQuiz();

  const handleSubmit = () => {
    create.mutate(
      { 
        title, 
        description, 
        difficulty, 
        tags, 
        visibility, 
        max_attempts: maxAttempts 
      },
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

      {/* Visibility Setting */}
      <div>
        <Label className="text-base font-medium">Visibility</Label>
        <RadioGroup 
          value={visibility} 
          onValueChange={(value: 'public' | 'private') => setVisibility(value)}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="public" id="public" />
            <Label htmlFor="public">Public - Anyone can see and attempt this quiz</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="private" id="private" />
            <Label htmlFor="private">Private - Only you and invited users can access</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Max Attempts */}
      <div>
        <Label className="block mb-2 font-medium">Maximum Attempts</Label>
        <Select value={maxAttempts.toString()} onValueChange={(value) => setMaxAttempts(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Select max attempts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 attempt</SelectItem>
            <SelectItem value="2">2 attempts</SelectItem>
            <SelectItem value="3">3 attempts</SelectItem>
            <SelectItem value="5">5 attempts</SelectItem>
            <SelectItem value="10">10 attempts</SelectItem>
            <SelectItem value="999">Unlimited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={create.isPending}
      >
        {create.isPending ? "Creating..." : "Create Quiz"}
      </Button>
    </div>
  );
}
