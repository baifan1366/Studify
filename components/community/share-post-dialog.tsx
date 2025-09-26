"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Users, User, Loader2, Send } from "lucide-react";
import { Post } from "@/interface/community/post-interface";
import { useTranslations } from "next-intl";

interface SearchResult {
  id: number;
  type: "direct" | "group";
  name: string;
  avatar_url?: string;
  member_count?: number;
}

interface ShareTarget {
  type: "direct" | "group";
  id: number;
  name: string;
  avatar_url?: string;
}

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export default function SharePostDialog({
  open,
  onOpenChange,
  post,
}: SharePostDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<ShareTarget[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const t = useTranslations("SharePost");

  // 搜索用户和群组
  const searchUsersAndGroups = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=chat`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsersAndGroups(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 添加选中目标
  const addTarget = (result: SearchResult) => {
    const isAlreadySelected = selectedTargets.some(
      (target) => target.type === result.type && target.id === result.id
    );

    if (!isAlreadySelected) {
      setSelectedTargets([
        ...selectedTargets,
        {
          type: result.type,
          id: result.id,
          name: result.name,
          avatar_url: result.avatar_url,
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // 移除选中目标
  const removeTarget = (targetToRemove: ShareTarget) => {
    setSelectedTargets(
      selectedTargets.filter(
        (target) =>
          !(target.type === targetToRemove.type && target.id === targetToRemove.id)
      )
    );
  };

  // 分享帖子
  const handleShare = async () => {
    if (selectedTargets.length === 0) return;

    setIsSharing(true);
    try {
      const response = await fetch("/api/messages/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.public_id || post.id.toString(),
          targets: selectedTargets.map((target) => ({
            type: target.type,
            id: target.id,
          })),
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        setSelectedTargets([]);
        setSearchQuery("");
        // TODO: 显示成功提示
      } else {
        // TODO: 显示错误提示
        console.error("Share failed");
      }
    } catch (error) {
      console.error("Share error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  // 重置状态
  const handleClose = () => {
    setSelectedTargets([]);
    setSearchQuery("");
    setSearchResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Share Post</DialogTitle>
        </DialogHeader>

        {/* Post Preview */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.author?.avatar_url} />
                <AvatarFallback>{post.author?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {post.author?.display_name}
                </p>
                <h4 className="text-sm font-semibold text-white mt-1 line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {post.body}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Targets */}
        {selectedTargets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-300">Share to:</p>
            <div className="flex flex-wrap gap-2">
              {selectedTargets.map((target) => (
                <Badge
                  key={`${target.type}-${target.id}`}
                  variant="secondary"
                  className="bg-blue-600 text-white hover:bg-blue-700 pr-1"
                >
                  <div className="flex items-center gap-1">
                    {target.type === "group" ? (
                      <Users className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span className="text-xs">{target.name}</span>
                    <button
                      onClick={() => removeTarget(target)}
                      className="ml-1 hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-700 rounded-md bg-gray-800">
            {searchResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => addTarget(result)}
                className="w-full p-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={result.avatar_url} />
                  <AvatarFallback>{result.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {result.type === "group" ? (
                      <Users className="h-4 w-4 text-blue-400" />
                    ) : (
                      <User className="h-4 w-4 text-green-400" />
                    )}
                    <span className="text-sm font-medium text-white truncate">
                      {result.name}
                    </span>
                  </div>
                  {result.type === "group" && result.member_count && (
                    <p className="text-xs text-gray-400">
                      {result.member_count} members
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedTargets.length === 0 || isSharing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Share ({selectedTargets.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
