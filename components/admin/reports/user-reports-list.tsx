"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Users, 
  Eye, 
  Ban, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  RefreshCw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { useAdminUsers } from "@/hooks/admin/use-admin-user-data";
import { useFormat } from "@/hooks/use-format";
import { UserDetailsDialog } from "@/components/admin/reports/user-details-dialog";
import { BanUserDialog } from "@/components/admin/reports/ban-user-dialog";

export function UserReportsList() {
  const t = useTranslations('UserReportsList');
  const { formatCurrency, formatDate } = useFormat();

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<'created_at' | 'full_name' | 'total_spent' | 'total_posts'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Dialog states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);

  // Fetch users with filters
  const { 
    data: usersData, 
    isLoading, 
    isError, 
    refetch,
    isRefetching 
  } = useAdminUsers({
    search: searchQuery || undefined,
    role: selectedRole,
    status: selectedStatus,
    sortBy,
    sortOrder,
    page: currentPage,
    limit: pageSize,
  });

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'banned':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'tutor':
        return 'default';
      case 'student':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Handle user actions
  const handleViewUser = (userUuid: string) => {
    setSelectedUserId(userUuid);
    setShowUserDetails(true);
  };

  const handleBanUser = (userUuid: string) => {
    setSelectedUserId(userUuid);
    setShowBanDialog(true);
  };

  // Handle sort
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedStatus("all");
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (isError) {
    return (
      <Card className="bg-transparent p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">{t('error_loading')}</div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>

          {usersData && (
            <Badge variant="outline" className="text-xs">
              {t('total_users', { count: usersData.total })}
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-transparent p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                {t('filters')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('filter_options')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Role Filter */}
              <div className="px-2 py-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('role')}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_roles')}</SelectItem>
                    <SelectItem value="student">{t('student')}</SelectItem>
                    <SelectItem value="tutor">{t('tutor')}</SelectItem>
                    <SelectItem value="admin">{t('admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="px-2 py-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('status')}
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                    <SelectItem value="banned">{t('banned')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetFilters}>
                {t('reset_filters')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-transparent p-2">
        <div className="overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="lg:col-span-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('full_name')}
                className="h-auto p-0 font-medium"
              >
                {t('user')}
                {sortBy === 'full_name' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="lg:col-span-2">{t('role')}</div>
            <div className="lg:col-span-2">{t('status')}</div>
            <div className="lg:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('created_at')}
                className="h-auto p-0 font-medium"
              >
                {t('joined_date')}
                {sortBy === 'created_at' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="lg:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('total_spent')}
                className="h-auto p-0 font-medium"
              >
                {t('total_spent')}
                {sortBy === 'total_spent' && (
                  sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="lg:col-span-1">{t('actions')}</div>
          </div>

          {/* Table Content */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
                  <div className="lg:col-span-3 flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-48 h-3" />
                    </div>
                  </div>
                  <div className="lg:col-span-2"><Skeleton className="w-16 h-6" /></div>
                  <div className="lg:col-span-2"><Skeleton className="w-16 h-6" /></div>
                  <div className="lg:col-span-2"><Skeleton className="w-20 h-4" /></div>
                  <div className="lg:col-span-2"><Skeleton className="w-16 h-4" /></div>
                  <div className="lg:col-span-1"><Skeleton className="w-8 h-8" /></div>
                </div>
              ))
            ) : usersData?.users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('no_users_found')}</p>
              </div>
            ) : (
              usersData?.users.map((user) => (
                <div key={user.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* User Info */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url} alt={user.full_name || user.display_name} />
                        <AvatarFallback>
                          {(user.full_name || user.display_name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user.full_name || user.display_name || t('no_name')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="lg:col-span-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {t(user.role)}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="lg:col-span-2">
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {t(user.status)}
                    </Badge>
                  </div>

                  {/* Joined Date */}
                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(user.created_at)}
                    </p>
                  </div>

                  {/* Total Spent */}
                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.total_spent ? formatCurrency(user.total_spent / 100) : t('no_purchases')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewUser(user.user_id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('view_details')}
                        </DropdownMenuItem>
                        {user.status !== 'banned' && (
                          <DropdownMenuItem
                            onClick={() => handleBanUser(user.user_id)}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            {t('ban_user')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {usersData && usersData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {t('showing_results', {
                start: (currentPage - 1) * pageSize + 1,
                end: Math.min(currentPage * pageSize, usersData.total),
                total: usersData.total,
              })}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('previous')}
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, usersData.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= usersData.totalPages}
              >
                {t('next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      {selectedUserId && (
        <>
          <UserDetailsDialog
            userId={selectedUserId}
            open={showUserDetails}
            onOpenChange={setShowUserDetails}
          />
          <BanUserDialog
            userId={selectedUserId}
            open={showBanDialog}
            onOpenChange={setShowBanDialog}
          />
        </>
      )}
    </div>
  );
}
