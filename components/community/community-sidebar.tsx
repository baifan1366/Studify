'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Lock, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useUserGroups, useSuggestedGroups } from '@/hooks/community/use-community';
import { Group } from '@/interface/community/group-interface';

const GroupCard = ({ group, showJoinButton = false }: { group: Group; showJoinButton?: boolean }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-shrink-0">
        {group.visibility === 'private' ? (
          <Lock className="w-4 h-4 text-yellow-400" />
        ) : (
          <Globe className="w-4 h-4 text-green-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/community/${group.slug}`}>
          <h4 className="font-medium text-white text-sm truncate hover:text-blue-300 cursor-pointer">
            {group.name}
          </h4>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{group.member_count || 0} members</span>
        </div>
      </div>
    </div>
    {showJoinButton && (
      <Button size="sm" variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400/10 text-xs px-2">
        Join
      </Button>
    )}
  </div>
);

export default function CommunitySidebar() {
  const { groups: userGroups, isLoading: loadingUserGroups } = useUserGroups();
  const { groups: suggestedGroups, isLoading: loadingSuggested } = useSuggestedGroups();

  return (
    <div className="w-80 space-y-6">
      {/* User's Groups */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">My Groups</CardTitle>
            <Link href="/community/create">
              <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-400/10">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingUserGroups ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/10" />
            ))
          ) : userGroups && userGroups.length > 0 ? (
            userGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">You haven't joined any groups yet</p>
              <Link href="/community/create">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Create Group
                </Button>
              </Link>
            </div>
          )}
          {userGroups && userGroups.length > 3 && (
            <Link href="/community/groups">
              <Button variant="ghost" size="sm" className="w-full text-blue-400 hover:bg-blue-400/10">
                View All Groups
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Suggested Groups */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Suggested Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingSuggested ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-white/10" />
            ))
          ) : suggestedGroups && suggestedGroups.length > 0 ? (
            suggestedGroups.map((group) => (
              <GroupCard key={group.id} group={group} showJoinButton />
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No suggestions available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Community Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Total Groups</span>
              <Badge variant="outline" className="border-blue-400 text-blue-400">
                {(userGroups?.length || 0) + (suggestedGroups?.length || 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Your Groups</span>
              <Badge variant="outline" className="border-green-400 text-green-400">
                {userGroups?.length || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
