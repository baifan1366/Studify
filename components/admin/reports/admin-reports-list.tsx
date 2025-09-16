'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Eye,
  MessageSquare,
  User,
  BookOpen,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Trash2,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAdminReports, useUpdateReportStatus, useModerationAction, useBatchReportAction } from '@/hooks/admin/use-admin-reports';
import type { AdminReport, AdminReportsFilters } from '@/interface/admin/admin-interface';

const statusColors = {
  open: 'destructive',
  reviewing: 'secondary',
  resolved: 'default',
  rejected: 'outline',
} as const;

const subjectTypeIcons = {
  post: MessageSquare,
  comment: MessageSquare,
  course: BookOpen,
  profile: User,
} as const;

const subjectTypeLabels = {
  post: 'Post',
  comment: 'Comment',
  course: 'Course',
  profile: 'Profile',
} as const;

export default function AdminReportsList() {
  const [filters, setFilters] = useState<AdminReportsFilters>({
    page: 1,
    limit: 20,
    status: 'all',
    subject_type: 'all',
  });
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [moderationAction, setModerationAction] = useState<{
    action: 'hide' | 'delete' | 'warn' | 'ban';
    notes: string;
    banDuration?: number;
  } | null>(null);

  const { data: reportsData, isLoading, error } = useAdminReports(filters);
  const updateReportStatus = useUpdateReportStatus();
  const executeModerationAction = useModerationAction();
  const batchReportAction = useBatchReportAction();

  const handleFilterChange = (key: keyof AdminReportsFilters, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'page' ? (typeof value === 'string' ? parseInt(value) || 1 : value) : value,
    }));
  };

  const handleStatusUpdate = async (reportId: string, status: string, notes?: string) => {
    await updateReportStatus.mutateAsync({ reportId, status, notes });
  };

  const handleModerationAction = async () => {
    if (!selectedReport || !moderationAction) return;

    await executeModerationAction.mutateAsync({
      reportId: selectedReport.public_id,
      action: moderationAction.action,
      notes: moderationAction.notes,
      ban_duration_hours: moderationAction.banDuration,
    });

    setSelectedReport(null);
    setModerationAction(null);
  };

  const getContentPreview = (report: AdminReport) => {
    const details = report.content_details;
    if (!details) return 'Content not available';

    if (details.title) return details.title;
    if (details.body) return details.body.substring(0, 100) + '...';
    if (details.description) return details.description.substring(0, 100) + '...';
    if (details.display_name) return `Profile: ${details.display_name}`;
    
    return 'No preview available';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load reports</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Reports</h2>
        <p className="text-muted-foreground">
          Manage user reports and take moderation actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter">Content Type</Label>
              <Select
                value={filters.subject_type || 'all'}
                onValueChange={(value) => handleFilterChange('subject_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="course">Courses</SelectItem>
                  <SelectItem value="profile">Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit-filter">Per Page</Label>
              <Select
                value={filters.limit?.toString() || '20'}
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports ({reportsData?.pagination.total || 0})</CardTitle>
          <CardDescription>
            Review and moderate reported content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsData?.reports.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsData?.reports.map((report) => {
                    const IconComponent = subjectTypeIcons[report.subject_type];
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <span className="text-sm">
                              {subjectTypeLabels[report.subject_type]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {getContentPreview(report)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3 w-3" />
                            </div>
                            <span className="text-sm">
                              {report.profiles.display_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{report.reason}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[report.status]}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(report.created_at), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedReport(report)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Report Details</DialogTitle>
                                  <DialogDescription>
                                    Review and take action on this report
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedReport && (
                                  <ReportDetailsModal
                                    report={selectedReport}
                                    onStatusUpdate={handleStatusUpdate}
                                    onModerationAction={(action) => {
                                      setModerationAction(action);
                                    }}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {reportsData && reportsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((reportsData.pagination.page - 1) * reportsData.pagination.limit) + 1} to{' '}
                    {Math.min(reportsData.pagination.page * reportsData.pagination.limit, reportsData.pagination.total)} of{' '}
                    {reportsData.pagination.total} reports
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                      disabled={!filters.page || filters.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {filters.page || 1} of {reportsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                      disabled={!filters.page || filters.page >= reportsData.pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Moderation Action Dialog */}
      {moderationAction && (
        <AlertDialog open={!!moderationAction} onOpenChange={() => setModerationAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Moderation Action</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {moderationAction.action} this content? This action cannot be undone.
                {moderationAction.action === 'ban' && moderationAction.banDuration && (
                  <span className="block mt-2 font-medium">
                    Ban duration: {moderationAction.banDuration} hours
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModerationAction(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleModerationAction}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm {moderationAction.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Report Details Modal Component
function ReportDetailsModal({
  report,
  onStatusUpdate,
  onModerationAction,
}: {
  report: AdminReport;
  onStatusUpdate: (reportId: string, status: string, notes?: string) => void;
  onModerationAction: (action: { action: 'hide' | 'delete' | 'warn' | 'ban'; notes: string; banDuration?: number }) => void;
}) {
  const [notes, setNotes] = useState('');
  const [banDuration, setBanDuration] = useState(24);

  const moderationActions = [
    {
      action: 'hide' as const,
      label: 'Hide Content',
      description: 'Hide the content from public view',
      icon: EyeOff,
      color: 'secondary',
    },
    {
      action: 'delete' as const,
      label: 'Delete Content',
      description: 'Permanently delete the content',
      icon: Trash2,
      color: 'destructive',
    },
    {
      action: 'warn' as const,
      label: 'Warn User',
      description: 'Send a warning to the content author',
      icon: AlertCircle,
      color: 'secondary',
    },
    {
      action: 'ban' as const,
      label: 'Ban User',
      description: 'Temporarily or permanently ban the user',
      icon: Ban,
      color: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Report Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Content Type</Label>
          <p className="text-sm text-muted-foreground">
            {subjectTypeLabels[report.subject_type]}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Badge variant={statusColors[report.status]} className="mt-1">
            {report.status}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium">Reporter</Label>
          <p className="text-sm text-muted-foreground">
            {report.profiles.display_name} ({report.profiles.email})
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Report Date</Label>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.created_at), 'PPP')}
          </p>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Reason</Label>
        <p className="text-sm text-muted-foreground mt-1">{report.reason}</p>
      </div>

      <div>
        <Label className="text-sm font-medium">Content Preview</Label>
        <div className="mt-1 p-3 bg-muted rounded-md">
          <p className="text-sm">{getContentPreview(report)}</p>
        </div>
      </div>

      {/* Status Update */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Update Status</Label>
        <div className="flex gap-2">
          {['reviewing', 'resolved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={report.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStatusUpdate(report.public_id, status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Moderation Actions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Moderation Actions</Label>
        <div className="grid grid-cols-2 gap-2">
          {moderationActions.map(({ action, label, description, icon: Icon, color }) => (
            <Button
              key={action}
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1"
              onClick={() => {
                onModerationAction({
                  action,
                  notes,
                  banDuration: action === 'ban' ? banDuration : undefined,
                });
              }}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {description}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Action Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Action Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add notes about your moderation decision..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Ban Duration (if ban action) */}
      <div className="space-y-2">
        <Label htmlFor="ban-duration">Ban Duration (hours)</Label>
        <Input
          id="ban-duration"
          type="number"
          min="1"
          max="8760"
          value={banDuration}
          onChange={(e) => setBanDuration(parseInt(e.target.value) || 24)}
          placeholder="24"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for permanent ban. Max: 8760 hours (1 year)
        </p>
      </div>
    </div>
  );

  function getContentPreview(report: AdminReport) {
    const details = report.content_details;
    if (!details) return 'Content not available';

    if (details.title) return details.title;
    if (details.body) return details.body;
    if (details.description) return details.description;
    if (details.display_name) return `Profile: ${details.display_name}`;
    
    return 'No preview available';
  }
}
