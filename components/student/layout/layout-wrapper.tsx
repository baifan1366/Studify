"use client";

import { useState } from "react";
import AnimatedSidebar from "./sidebar";
import ClassroomHeader from "./header";
import AnimatedBackground from "@/components/ui/animated-background";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/profile/use-user";
import { useLogout } from "@/hooks/profile/use-logout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ban, AlertTriangle, Clock, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/hooks/use-format";

function generateTitle(pathname: string | null): string {
  if (!pathname) {
    return "Home";
  }

  const parts = pathname.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];

  if (!lastSegment || lastSegment.toLowerCase() === "home") {
    return "Home";
  }

  return lastSegment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Banned User Dialog Component (inline)
function BannedUserDialog({
  isOpen,
  bannedReason,
  bannedAt,
  expiresAt,
}: {
  isOpen: boolean;
  bannedReason?: string;
  bannedAt?: string;
  expiresAt?: string;
}) {
  const t = useTranslations("BannedUserDialog");
  const { formatDate, formatRelativeTime } = useFormat();
  const logoutMutation = useLogout();

  // Prevent dialog from closing
  const handleOpenChange = (open: boolean) => {
    // Dialog cannot be closed
    return;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Ban className="h-6 w-6" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ban Warning */}
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                    {t("access_restricted")}
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {t("access_restricted_message")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ban Details */}
          <div className="space-y-3">
            {/* Ban Reason */}
            {bannedReason && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("reason_label")}
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {bannedReason}
                </p>
              </div>
            )}

            {/* Ban Timeline */}
            <div className="grid grid-cols-1 gap-3">
              {bannedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("banned_on")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(bannedAt, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {expiresAt ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                      {t("expires_on")}
                    </span>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 font-semibold mt-1">
                    {formatDate(expiresAt, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    ({formatRelativeTime(expiresAt)})
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300 font-semibold">
                      {t("permanent_ban")}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {t("permanent_ban_message")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("contact_support_message")}
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full"
          >
            {logoutMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t("logging_out")}
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                {t("logout")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const pathname = usePathname();
  const title = generateTitle(pathname);
  const { data: userData } = useUser();

  // Check if user is banned
  const isBanned = userData?.profile?.status === "banned";
  const bannedReason = userData?.profile?.banned_reason;
  const bannedAt = userData?.profile?.banned_at;
  
  // Get ban expiry from active ban records if available
  // For now, we'll use undefined - you could fetch this from ban table if needed
  const expiresAt = undefined;

  return (
    <AnimatedBackground useGlobalCSSVariable={true}>
      {/* Banned User Dialog - Cannot be dismissed */}
      {isBanned && (
        <BannedUserDialog
          isOpen={true}
          bannedReason={bannedReason}
          bannedAt={bannedAt}
          expiresAt={expiresAt}
        />
      )}

      <ClassroomHeader
        title={title}
        onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
        sidebarExpanded={sidebarExpanded}
      />
      <AnimatedSidebar isPermanentlyExpanded={sidebarExpanded} />
      <div
        style={{ marginLeft: "var(--sidebar-width)" }}
        className="transition-all duration-300 ease-in-out h-full"
      >
        <main className="pt-16 pb-20 md:pb-0 h-full w-full">
          <div className="h-full w-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
