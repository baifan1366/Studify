"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AttemptItemSkeleton,
  GroupCardSkeleton,
} from "@/components/community/skeletons";
import { Users, Plus, Lock, Globe, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  useUserGroups,
  useSuggestedGroups,
  useGroupMembers,
} from "@/hooks/community/use-community";
import { Group } from "@/interface/community/group-interface";
import { toast } from "sonner";
import AllMyGroupsModal from "./all-my-groups-modal";
import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/profile/use-user";

function GroupCard({
  group,
  showJoinButton = false,
  isTutor,
}: {
  group: Group;
  showJoinButton?: boolean;
  isTutor: boolean;
}) {
  const { joinGroup, isJoining } = useGroupMembers(group.slug);
  const t = useTranslations();
  const groupPath = isTutor ? `/tutor/community/${group.slug}` : `/community/${group.slug}`;

  const handleJoinGroup = () => {
    joinGroup(undefined, {
      onSuccess: () => {
        toast.success("Successfully joined group!", {
          description: `You are now a member of ${group.name}`,
        });
      },
      onError: (error: any) => {
        toast.error("Failed to join group", {
          description: error?.message || "Please try again later",
        });
      },
    });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {group.visibility === "private" ? (
            <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={groupPath}>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate hover:text-primary cursor-pointer">
              {group.name}
            </h4>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{group.member_count || 0} {t("CommunitySidebar.members")}</span>
          </div>
        </div>
      </div>
      {showJoinButton && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs px-2 cursor-pointer"
          onClick={handleJoinGroup}
          disabled={isJoining}
        >
          {isJoining ? t("CommunitySidebar.joining") : t("CommunitySidebar.join")}
        </Button>
      )}
    </div>
  );
}

export default function CommunitySidebar() {
  const [showAllGroupsModal, setShowAllGroupsModal] = useState(false);
  const { groups: userGroups, isLoading: loadingUserGroups } = useUserGroups();
  const { groups: suggestedGroups, isLoading: loadingSuggested } =
    useSuggestedGroups();
  const t = useTranslations();
  const { data: currentUser } = useUser();
  const isTutor = currentUser?.profile?.role === 'tutor';
  const createGroupPath = isTutor ? '/tutor/community/create' : '/community/create';

  return (
    <>
      <div className="w-80 space-y-6">
        {/* User's Groups */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white text-lg">{t("CommunitySidebar.my_groups")}</CardTitle>
              <Link href={createGroupPath}>
                <Button
                  size="sm"
                  variant="ghost"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingUserGroups ? (
              Array.from({ length: 3 }).map((_, i) => (
                <AttemptItemSkeleton key={i} />
              ))
            ) : userGroups && userGroups.length > 0 ? (
              userGroups.map((group) => (
                <GroupCard key={group.id} group={group} isTutor={isTutor} />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">
                  {t("CommunitySidebar.no_groups_joined")}
                </p>
                <Link href={createGroupPath}>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {t("CommunitySidebar.create_group")}
                  </Button>
                </Link>
              </div>
            )}
            {userGroups && userGroups.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowAllGroupsModal(true)}
              >
                {t("CommunitySidebar.view_all_groups")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Suggested Groups */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white text-lg">
              {t("CommunitySidebar.suggested_groups")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingSuggested ? (
              Array.from({ length: 3 }).map((_, i) => (
                <AttemptItemSkeleton key={i} />
              ))
            ) : suggestedGroups && suggestedGroups.length > 0 ? (
              suggestedGroups.map((group) => (
                <GroupCard key={group.id} group={group} showJoinButton isTutor={isTutor} />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  {t("CommunitySidebar.no_suggestions")}
                </p>
              </div>
            )}




          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white text-lg">
              {t("CommunitySidebar.community_stats")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingUserGroups || loadingSuggested ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <span className="h-4 w-10 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <span className="h-4 w-10 rounded bg-muted animate-pulse" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white text-sm">{t("CommunitySidebar.total_groups")}</span>
                    <Badge
                      variant="outline"
                    >
                      {(userGroups?.length || 0) + (suggestedGroups?.length || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white text-sm">{t("CommunitySidebar.your_groups")}</span>
                    <Badge
                      variant="outline"
                    >
                      {userGroups?.length || 0}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All My Groups Modal */}
        <AllMyGroupsModal
          isOpen={showAllGroupsModal}
          onClose={() => setShowAllGroupsModal(false)}
        />
      </div>
    </>
  );
}
