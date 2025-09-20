// hooks/admin/use-admin-reports.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import type {
  AdminReportsResponse,
  AdminReportDetails,
  AdminReportsFilters,
  AdminModerationActionRequest
} from '@/interface/admin/admin-interface';

// Fetch reports with filters and pagination
export function useAdminReports(filters: AdminReportsFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'reports', filters],
    queryFn: async (): Promise<AdminReportsResponse> => {
      const response = await adminApi.getReports(filters);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Fetch single report details
export function useAdminReport(reportId: string) {
  return useQuery({
    queryKey: ['admin', 'reports', reportId],
    queryFn: async (): Promise<AdminReportDetails> => {
      const response = await adminApi.getReport(reportId);
      return response.data.report;
    },
    enabled: !!reportId,
    staleTime: 60000, // 1 minute
  });
}

// Update report status
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, status, notes }: {
      reportId: string;
      status: string;
      notes?: string;
    }) => {
      return adminApi.updateReportStatus(reportId, { status, notes });
    },
    onSuccess: (data, variables) => {
      toast.success('Report status updated successfully');
      
      // Invalidate and refetch reports queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', variables.reportId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update report status');
    },
  });
}

// Take moderation action
export function useModerationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, ...actionData }: {
      reportId: string;
    } & AdminModerationActionRequest) => {
      return adminApi.executeModerationAction(reportId, actionData);
    },
    onSuccess: (data, variables) => {
      const actionName = variables.action.charAt(0).toUpperCase() + variables.action.slice(1);
      toast.success(`${actionName} action executed successfully`);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', variables.reportId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to execute moderation action');
    },
  });
}

// Get report statistics
export function useReportStats() {
  return useQuery({
    queryKey: ['admin', 'reports', 'stats'],
    queryFn: async () => {
      const data = await adminApi.getReports({ limit: 1 });
      
      // Get counts for different statuses
      const [openReports, reviewingReports, resolvedReports] = await Promise.all([
        adminApi.getReports({ status: 'open', limit: 1 }),
        adminApi.getReports({ status: 'reviewing', limit: 1 }),
        adminApi.getReports({ status: 'resolved', limit: 1 }),
      ]);

      return {
        total: data.data.pagination.total,
        open: openReports.data.pagination.total,
        reviewing: reviewingReports.data.pagination.total,
        resolved: resolvedReports.data.pagination.total,
      };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
}

// Batch report actions
export function useBatchReportAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      reportIds: string[];
      action: 'resolve' | 'reject' | 'hide_all' | 'delete_all' | 'ban_all';
      notes?: string;
      ban_duration_hours?: number;
    }) => {
      return adminApi.batchReportAction(data);
    },
    onSuccess: (data, variables) => {
      const actionName = variables.action.replace('_all', '').replace('_', ' ');
      toast.success(`Batch ${actionName} action completed successfully`);
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to execute batch action');
    },
  });
}
