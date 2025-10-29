import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban } from "@/interface/admin/ban-interface";
import { apiGet, apiSend } from "@/lib/api-config";
import { banApi } from "@/lib/api";

interface UpdateStatusParams {
  banId: string;
  status: "approved" | "pending" | "rejected";
  expires_at?: string;
}

export function useBan() {
  return useQuery<Ban[]>({
    queryKey: ["ban"],
    queryFn: () => {
      return apiGet<Ban[]>(banApi.list);
    },
  });
}

export function useBanById(banId?: string) {
  return useQuery<Ban>({
    queryKey: ["ban", banId],
    queryFn: () => {
      if (!banId) {
        throw new Error("Ban ID is required");
      }
      return apiGet<Ban>(banApi.getById(banId));
    },
    enabled: Boolean(banId),
  });
}

export function useBanByTarget(targetType: string, targetId?: number) {
  return useQuery<Ban[]>({
    queryKey: ["ban", "target", targetType, targetId],
    queryFn: () => {
      if (!targetId) {
        throw new Error("Target ID is required");
      }
      return apiGet<Ban[]>(banApi.getByTarget(targetType, targetId));
    },
    enabled: Boolean(targetId && targetType),
  });
}

export function useCreateBan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body }: { body: Record<string, any> }) =>
      apiSend({
        method: "POST",
        url: banApi.create,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ban"] });
    },
  });
}

export function useUpdateBan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      banId,
      ...updates
    }: { banId: string } & Partial<Omit<Ban, "banId">>) =>
      apiSend<Ban>({
        url: banApi.update(banId),
        method: "PATCH",
        body: updates,
      }),
    onSuccess: (data: Ban) => {
      qc.invalidateQueries({ queryKey: ["ban"] });
    },
  });
}

// Note: Toast messages should be handled in the component using translations
export function useUpdateBanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ banId, status, expires_at }: UpdateStatusParams) => {
      // First update the ban status
      const banResult = await apiSend<Ban>({
        url: banApi.status(banId),
        method: "PATCH",
        body: { status, expires_at },
      });

      // If ban is approved and target_type is "course", execute auto-flow
      if (
        status === "approved" &&
        banResult.target_type === "course" &&
        banResult.target_id
      ) {
        try {
          // Update course status to "ban"
          await apiSend({
            url: `/api/admin/courses/${banResult.target_id}/status`,
            method: "PATCH",
            body: { status: "ban" },
          });

          // Auto-create system announcement for enrolled students
          await apiSend({
            url: `/api/course/ban-notification`,
            method: "POST",
            body: {
              courseId: banResult.target_id,
              banReason: banResult.reason,
              expiresAt: expires_at || null,
            },
          });
        } catch (error) {
          console.warn("Failed to complete ban auto-flow:", error);
          // Don't fail the whole operation if auto-flow fails
        }
      }

      return banResult;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch bans and courses
      queryClient.invalidateQueries({ queryKey: ["ban"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    // onError callback removed - handle in component with translations
  });
}

export function useDeleteBan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (banId: string) =>
      apiSend<void>({
        url: banApi.delete(banId),
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ban"] });
    },
  });
}
