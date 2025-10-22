'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Users,
  Lock,
  Globe,
  Calendar,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useAllUserGroups } from "@/hooks/community/use-community";
import { Group } from "@/interface/community/group-interface";
import { AttemptItemSkeleton } from "@/components/community/skeletons";
import { toast } from "sonner";
import { useUser } from "@/hooks/profile/use-user";

interface AllMyGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GroupVisibilityBadge = ({ visibility }: { visibility: string }) => {
  return visibility === "private" ? (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
      <Lock className="w-3 h-3 mr-1" />
      Private
    </Badge>
  ) : (
    <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
      <Globe className="w-3 h-3 mr-1" />
      Public
    </Badge>
  );
};

const GroupCard = ({ group, isTutor }: { group: Group; isTutor: boolean }) => {
  const groupPath = isTutor ? `/tutor/community/${group.slug}` : `/community/${group.slug}`;
  const handleViewGroup = () => {
    // The Link component will handle navigation
    toast.success(`Opening ${group.name}`);
  };

  return (
    <Card className="p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link href={groupPath}>
            <h4 className="font-medium text-white hover:text-blue-300 cursor-pointer line-clamp-1 text-lg">
              {group.name}
            </h4>
          </Link>
          {group.description && (
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <GroupVisibilityBadge visibility={group.visibility} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Users className="w-4 h-4" />
          <span>{group.member_count || 0} members</span>
        </div>
        
        {group.created_at && (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4" />
            <span>Joined {format(new Date(group.created_at), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>

      {/* Post count if available */}
      {group.post_count !== undefined && group.post_count > 0 && (
        <div className="mt-3">
          <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
            {group.post_count} {group.post_count === 1 ? 'post' : 'posts'}
          </Badge>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Link href={groupPath}>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleViewGroup}
          >
            View Group
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default function AllMyGroupsModal({ isOpen, onClose }: AllMyGroupsModalProps) {
  const t = useTranslations('AllMyGroupsModal');
  const { groups, isLoading } = useAllUserGroups();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';

  // Sort groups by most recent activity or member count
  const sortedGroups = React.useMemo(() => {
    if (!groups) return [];
    return [...groups].sort((a, b) => {
      // Sort by member count descending
      return (b.member_count || 0) - (a.member_count || 0);
    });
  }, [groups]);

  // Group by visibility
  const groupedByVisibility = React.useMemo(() => {
    if (!sortedGroups.length) return { private: [], public: [] };
    
    return sortedGroups.reduce((acc, group) => {
      const key = group.visibility === "private" ? "private" : "public";
      acc[key].push(group);
      return acc;
    }, { private: [] as Group[], public: [] as Group[] });
  }, [sortedGroups]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-white/5">
                  <AttemptItemSkeleton />
                </div>
              ))}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="space-y-6">
              {/* Private Groups Section */}
              {groupedByVisibility.private.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-lg font-medium text-white">Private Groups</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      {groupedByVisibility.private.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {groupedByVisibility.private.map((group) => (
                      <GroupCard key={group.id} group={group} isTutor={isTutor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Public Groups Section */}
              {groupedByVisibility.public.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-green-400" />
                    <h3 className="text-lg font-medium text-white">Public Groups</h3>
                    <Badge className="bg-green-500/20 text-green-400">
                      {groupedByVisibility.public.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {groupedByVisibility.public.map((group) => (
                      <GroupCard key={group.id} group={group} isTutor={isTutor} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">
                {t('no_groups')}
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {t('explore_groups')}
              </p>
              <Link href="/community">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Browse Groups
                </Button>
              </Link>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
