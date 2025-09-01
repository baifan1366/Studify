'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 as Spinner } from 'lucide-react';

interface NewPostFormProps {
  onSubmit: (post: { title: string; body: string }) => void;
  isLoading: boolean;
}

export function NewPostForm({ onSubmit, isLoading }: NewPostFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    onSubmit({ title, body });
    setTitle('');
    setBody('');
  };

  return (
    <Card className="bg-black/20 backdrop-blur-lg border border-white/10 text-white rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle>Create a new post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isLoading}
            className="bg-black/30 border-white/20 placeholder:text-gray-400"
          />
          <Textarea
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={isLoading}
            className="bg-black/30 border-white/20 placeholder:text-gray-400"
          />
          <Button type="submit" disabled={isLoading} className="bg-white/10 hover:bg-white/20 border border-white/20 w-full">
            {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
