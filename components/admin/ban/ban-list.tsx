"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "@/interface/admin/ban-interface";
import { useBan } from "@/hooks/ban/use-ban";
import { useFormat } from "@/hooks/use-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search, Users, AlertTriangle, Clock, Filter } from "lucide-react";
import { BanInfo } from "./ban-info";
import { Skeleton } from "@/components/ui/skeleton";

interface BanGroup {
  target_type: string;
  target_id: number;
  bans: Ban[];
  count: number;
  latestBan: Ban;
}

export default function BanList() {
  const t = useTranslations('AdminBanList');
  const { data: bans = [], isLoading, error } = useBan();
  const { formatDate, formatRelativeTime } = useFormat();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBan, setSelectedBan] = useState<Ban | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Group bans by target_type and target_id, sort by count
  const groupedBans = useMemo(() => {
    const groups = new Map<string, BanGroup>();
    
    // Filter bans by search term
    const filteredBans = bans.filter((ban) =>
      ban.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ban.target_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ban.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredBans.forEach((ban) => {
      const key = `${ban.target_type}-${ban.target_id}`;
      
      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.bans.push(ban);
        group.count++;
        // Update latest ban if this one is newer
        if (new Date(ban.created_at) > new Date(group.latestBan.created_at)) {
          group.latestBan = ban;
        }
      } else {
        groups.set(key, {
          target_type: ban.target_type,
          target_id: ban.target_id,
          bans: [ban],
          count: 1,
          latestBan: ban,
        });
      }
    });

    // Convert to array and sort by count (descending), then by latest date
    return Array.from(groups.values()).sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return new Date(b.latestBan.created_at).getTime() - new Date(a.latestBan.created_at).getTime();
    });
  }, [bans, searchTerm]);

  const handleBanClick = (ban: Ban) => {
    setSelectedBan(ban);
    setIsDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "destructive";
      case "rejected":
        return "secondary";
      case "pending":
        return "default";
      default:
        return "outline";
    }
  };

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return "📚";
      case "post":
        return "📝";
      case "comment":
        return "💬";
      case "chat":
        return "💭";
      case "user":
        return "👤";
      default:
        return "📋";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('error_loading_bans')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 dark:text-red-300">
            {t('failed_to_load')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('ban_management')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('manage_review_bans')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{groupedBans.length} {t('groups')}</span>
          <Separator orientation="vertical" className="h-4" />
          <Filter className="h-4 w-4" />
          <span>{bans.length} {t('total_bans')}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ban Groups */}
      <div className="space-y-4">
        {groupedBans.length === 0 ? (
          <Card className="bg-transparent p-2">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {t('no_bans_found')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('no_bans_description')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          groupedBans.map((group, index) => (
            <Card
              key={`${group.target_type}-${group.target_id}`}
              className="hover:shadow-md transition-shadow cursor-pointer bg-transparent p-2"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getTargetTypeIcon(group.target_type)}
                    </span>
                    <div>
                      <CardTitle className="text-lg">
                        {group.target_type.charAt(0).toUpperCase() + 
                         group.target_type.slice(1)} #{group.target_id}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.count} ban{group.count > 1 ? "s" : ""} • 
                        Latest: {formatRelativeTime(group.latestBan.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.count} report{group.count > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Show up to 3 most recent bans */}
                {group.bans
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 3)
                  .map((ban) => (
                    <div
                      key={ban.id}
                      onClick={() => handleBanClick(ban)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getStatusBadgeVariant(ban.status)}>
                            {ban.status}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{ban.public_id}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {ban.reason}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(ban.created_at, { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {ban.expires_at && ban.status === 'approved' && (
                            <span className="text-red-600 dark:text-red-400">
                              Expires: {formatDate(ban.expires_at, { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                      </Button>
                    </div>
                  ))}

                {/* Show "and X more" if there are more bans */}
                {group.count > 3 && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBanClick(group.latestBan)}
                      className="text-xs"
                    >
                      and {group.count - 3} more report{group.count - 3 > 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ban Info Dialog */}
      <BanInfo
        ban={selectedBan}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedBan(null);
        }}
      />
    </div>
  );
}