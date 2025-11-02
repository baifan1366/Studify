"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Camera,
  Edit3,
  Save,
  X,
  Mail,
  Calendar,
  MapPin,
  Award,
  BookOpen,
  Users,
  Settings,
  ChevronRight,
  Check,
  Loader2,
  UserCircle,
  Trophy,
  Target,
  Zap,
  Clock,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  ArrowDownToLine,
  CreditCard,
  BarChart2,
  FileText,
  Filter,
  SortDesc,
  Search,
  Download,
  Receipt,
  Calendar as CalendarIcon,
  Star,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/profile/use-user";
import {
  useCurrentUserProfile,
  useUpdateCurrentUserProfile,
} from "@/hooks/profile/use-profile";
import { useAccountSwitcher } from "@/hooks/auth/use-account-switcher";
import {
  useLearningStats,
  usePointsData,
  formatStudyTime,
} from "@/hooks/profile/use-learning-stats";
import {
  usePurchaseData,
  formatCurrency as formatPurchaseCurrency,
  formatPurchaseDate,
} from "@/hooks/profile/use-purchase-data";
import {
  useProfileCurrency,
  useUpdateProfileCurrency,
  getSupportedCurrencies as getProfileSupportedCurrencies,
} from "@/hooks/profile/use-profile-currency";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AchievementsSection from "@/components/student/achievements-section";
import StudentAchievementStats from "@/components/student/achievement-stats";
import Image from "next/image";

export default function ProfileContent() {
  const t = useTranslations("ProfileContent");
  const tProfile = useTranslations("UserProfile");
  const router = useRouter();
  const pathname = usePathname();
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } =
    useCurrentUserProfile();
  const updateProfileMutation = useUpdateCurrentUserProfile();
  // Remove old achievementsData - now handled by AchievementsSection component
  const { data: learningStats, isLoading: statsLoading } =
    useLearningStats("all");
  const { data: pointsData, isLoading: pointsLoading } = usePointsData();
  const { data: purchaseData, isLoading: purchaseLoading } = usePurchaseData();
  const { data: profileCurrency } = useProfileCurrency();
  const updateProfileCurrency = useUpdateProfileCurrency();
  const {
    storedAccounts,
    currentAccountId,
    switchToAccount,
    removeAccount,
    addAccount,
    isSwitching,
    switchError,
  } = useAccountSwitcher();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: "",
    full_name: "",
    bio: "",
    timezone: "",
    currency: "MYR",
    avatar_url: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number>(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Purchase history state
  const [purchaseFilter, setPurchaseFilter] = useState<
    "all" | "course" | "plugin" | "resource"
  >("all");
  const [purchaseSort, setPurchaseSort] = useState<"date" | "amount" | "name">(
    "date"
  );
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState("");
  const [showAllPurchases, setShowAllPurchases] = useState(false);

  const user = userData;
  const profile = fullProfileData?.profile || user?.profile;
  const userDisplayName =
    profile?.display_name || user?.user_metadata?.full_name || "";
  const userEmail = user?.email || "";
  const userName =
    userDisplayName || userEmail?.split("@")[0] || "Unknown User";
  const userAvatar =
    profile?.avatar_url || user?.user_metadata?.avatar_url || "";

  // Get interests from profile preferences
  const userInterests =
    profile?.preferences?.interests || user?.user_metadata?.interests;
  const broadField = userInterests?.broadField;
  const subFields = userInterests?.subFields || [];

  React.useEffect(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        full_name: (profile as any)?.full_name || "",
        bio: (profile as any)?.bio || "",
        timezone: (profile as any)?.timezone || "Asia/Kuala_Lumpur",
        currency:
          (profile as any)?.currency || profileCurrency?.currency || "MYR",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile, profileCurrency]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      let updateData = { ...editForm };

      // Handle avatar upload if a new file is selected
      if (avatarFile) {
        setIsUploadingAvatar(true);
        setAvatarUploadProgress(0);

        const formData = new FormData();
        formData.append("avatar", avatarFile);

        // Upload avatar to MEGA via backend
        try {
          toast({
            title: t("uploading_avatar"),
            description: `${t("uploading_to_mega")} (${(
              avatarFile.size /
              1024 /
              1024
            ).toFixed(2)} MB)`,
          });

          const response = await fetch("/api/profile/avatar", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const { avatar_url, file_size } = await response.json();
            updateData = { ...updateData, avatar_url };

            toast({
              title: t("avatar_uploaded"),
              description: `${t("avatar_uploaded_desc")} (${(
                file_size /
                1024 /
                1024
              ).toFixed(2)} MB)`,
            });
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || "Avatar upload failed");
          }
        } catch (avatarError: any) {
          console.error("Avatar upload error:", avatarError);
          toast({
            title: t("avatar_upload_failed"),
            description: avatarError.message || t("avatar_upload_failed_desc"),
            variant: "destructive",
          });
          // Continue with profile update even if avatar upload fails
        } finally {
          setIsUploadingAvatar(false);
          setAvatarUploadProgress(0);
        }
      }

      // Remove avatar_url from updateData if it's empty or unchanged
      const finalUpdateData: Record<string, any> = { ...updateData };
      if (
        !updateData.avatar_url ||
        updateData.avatar_url === profile?.avatar_url
      ) {
        delete finalUpdateData.avatar_url;
      }

      await updateProfileMutation.mutateAsync(finalUpdateData);

      toast({
        title: t("profile_updated"),
        description: t("profile_updated_desc"),
      });

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: t("update_error"),
        description: t("update_error_desc"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset form to original values
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        full_name: (profile as any)?.full_name || "",
        bio: (profile as any)?.bio || "",
        timezone: (profile as any)?.timezone || "Asia/Kuala_Lumpur",
        currency:
          (profile as any)?.currency || profileCurrency?.currency || "MYR",
        avatar_url: profile.avatar_url || "",
      });
    }
  };

  const handleAvatarChange = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: t("file_too_large"),
            description: t("file_too_large_desc"),
            variant: "destructive",
          });
          return;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: t("invalid_file_type"),
            description: t("invalid_file_type_desc"),
            variant: "destructive",
          });
          return;
        }

        setAvatarFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        toast({
          title: t("avatar_selected"),
          description: t("avatar_selected_desc"),
        });
      }
    };
    input.click();
  };

  // Quick Actions handlers with role-specific routing
  const handleNavigateToCourses = () => {
    const locale = pathname.split("/")[1] || "en";
    const userRole = profile?.role || "student";

    switch (userRole) {
      case "tutor":
        router.push(`/${locale}/tutor/teaching/course-content`);
        break;
      case "admin":
        router.push(`/${locale}/admin/courses`);
        break;
      default:
        router.push(`/${locale}/courses`);
    }
  };

  const handleNavigateToAchievements = () => {
    const locale = pathname.split("/")[1] || "en";
    const userRole = profile?.role || "student";

    // Achievements might not be available for all roles
    if (userRole === "student") {
      router.push(`/${locale}/community/achievements`);
    } else {
      // Redirect to their respective dashboards instead
      router.push(`/${locale}/${userRole}/dashboard`);
    }
  };

  const handleNavigateToCommunity = () => {
    const locale = pathname.split("/")[1] || "en";
    const userRole = profile?.role || "student";

    switch (userRole) {
      case "admin":
        router.push(`/${locale}/admin/community`);
        break;
      case "tutor":
        router.push(`/${locale}/tutor/community`);
        break;
      default:
        router.push(`/${locale}/community`);
    }
  };

  const handleNavigateToDashboard = () => {
    const locale = pathname.split("/")[1] || "en";
    const userRole = profile?.role || "student";

    switch (userRole) {
      case "tutor":
        router.push(`/${locale}/tutor/dashboard`);
        break;
      case "admin":
        router.push(`/${locale}/admin/dashboard`);
        break;
      default:
        router.push(`/${locale}/dashboard`);
    }
  };

  // Account switcher handlers
  const handleAccountSwitch = () => {
    setShowAccountSwitcher(!showAccountSwitcher);
  };

  const handleSwitchToAccount = (accountId: string) => {
    if (accountId === currentAccountId || isSwitching) {
      return;
    }

    const targetAccount = storedAccounts.find((acc) => acc.id === accountId);
    if (targetAccount) {
      switchToAccount(accountId, targetAccount.email);
    }
  };

  const handleRemoveAccount = (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (accountId !== currentAccountId) {
      removeAccount(accountId);
    }
  };

  // Get accounts formatted for display
  const allAccounts = storedAccounts.map((account) => ({
    id: account.id,
    email: account.email,
    name: account.display_name || account.email.split("@")[0],
    avatar: account.avatar_url || "",
    isCurrent: account.id === currentAccountId,
    role: account.role,
  }));

  return (
    <div className="min-h-screen p-6 pb-32 overflow-y-auto bg-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white dark:text-gray-900 mb-2">
            {t("page_title")}
          </h1>
          <p className="text-white/70 dark:text-gray-600">
            {t("page_subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Profile Card */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 dark:from-blue-100 dark:via-purple-100 dark:to-orange-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 overflow-hidden shadow-lg dark:shadow-xl">
              {/* Animated Background Elements */}
              <motion.div
                className="fixed top-4 right-4 w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/30 rounded-full blur-xl pointer-events-none"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div className="text-center z-10 relative">
                {/* Avatar */}
                <div className="inline-block mb-4">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white/20 dark:bg-gray-200 flex items-center justify-center mx-auto">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Profile Preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : userAvatar ? (
                      <Image
                        src={userAvatar}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User
                        size={64}
                        className="text-white/70 dark:text-gray-400"
                      />
                    )}
                  </div>
                  <motion.button
                    onClick={handleAvatarChange}
                    className="mt-2 mx-auto w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera size={14} className="sm:w-4 sm:h-4" />
                  </motion.button>
                </div>

                {/* User Info */}
                <h2 className="text-xl sm:text-2xl font-bold text-white dark:text-gray-900 mb-2 truncate">
                  {userName}
                </h2>
                <p className="text-white/70 dark:text-gray-600 mb-4 text-sm sm:text-base truncate">
                  {userEmail}
                </p>

                {profile?.role && (
                  <span className="inline-block px-4 py-2 bg-white/20 dark:bg-gray-200 rounded-full text-sm font-medium text-white dark:text-gray-700 capitalize mb-4">
                    {profile.role}
                  </span>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20 dark:border-gray-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white dark:text-gray-900">
                      {pointsData?.data?.currentPoints ||
                        (profile as any)?.points ||
                        0}
                    </div>
                    <div className="text-xs text-white/70 dark:text-gray-600">
                      {t("points")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white dark:text-gray-900">
                      {learningStats?.data?.summary?.completedCourses || 0}
                    </div>
                    <div className="text-xs text-white/70 dark:text-gray-600">
                      {t("courses")}
                    </div>
                  </div>
                  <div className="text-center">
                    <StudentAchievementStats />
                    <div className="text-xs text-white/70 dark:text-gray-600">
                      {t("achievements")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Switcher Card */}
            {storedAccounts.length > 1 && (
              <div className="bg-gradient-to-br from-indigo-600/20 via-blue-600/20 to-cyan-500/20 dark:from-indigo-100 dark:via-blue-100 dark:to-cyan-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mt-6 overflow-hidden shadow-lg dark:shadow-xl">
                {/* Animated Background Elements */}
                <motion.div
                  className="absolute top-4 right-4 w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/30 rounded-full blur-xl pointer-events-none"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                <div className="relative z-10">
                  <motion.button
                    onClick={handleAccountSwitch}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/10 dark:hover:bg-gray-200 rounded-lg transition-all duration-200 group"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 flex items-center justify-center shadow-sm">
                        <Users size={18} className="text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-white dark:text-gray-900 text-sm sm:text-base">
                          {tProfile("switch_account")}
                        </span>
                        <span className="text-xs text-white/70 dark:text-gray-600">
                          {allAccounts.length}{" "}
                          {tProfile("accounts").toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: showAccountSwitcher ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight
                        size={16}
                        className="text-white/70 dark:text-gray-600 group-hover:text-white/90 dark:group-hover:text-gray-900 transition-colors"
                      />
                    </motion.div>
                  </motion.button>

                  {/* Account List Dropdown */}
                  <AnimatePresence>
                    {showAccountSwitcher && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="space-y-2">
                          {/* Show switching loading state */}
                          {isSwitching && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2
                                size={20}
                                className="text-blue-400 dark:text-blue-600 animate-spin"
                              />
                              <span className="ml-2 text-sm text-white/70 dark:text-gray-600">
                                {tProfile("switching_account")}
                              </span>
                            </div>
                          )}

                          {/* Show error if any */}
                          {switchError && (
                            <div className="mb-3 p-3 bg-red-500/20 dark:bg-red-100 border border-red-400/30 dark:border-red-300 rounded-lg">
                              <p className="text-xs text-red-300 dark:text-red-700">
                                {switchError}
                              </p>
                            </div>
                          )}

                          {allAccounts.map((account) => (
                            <motion.div
                              key={account.id}
                              className="relative group"
                              whileHover={{ x: 2, scale: 1.01 }}
                            >
                              <button
                                onClick={() =>
                                  handleSwitchToAccount(account.id)
                                }
                                disabled={isSwitching}
                                className={`w-full flex items-center space-x-3 p-3 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                                  account.isCurrent
                                    ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 dark:from-emerald-200 dark:to-teal-200 ring-2 ring-emerald-400/50 dark:ring-emerald-500"
                                    : "hover:bg-white/10 dark:hover:bg-gray-200"
                                } ${
                                  isSwitching
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 dark:bg-gray-200 flex items-center justify-center ring-2 ring-white/30 dark:ring-gray-300">
                                  {account.avatar ? (
                                    <Image
                                      src={account.avatar}
                                      alt={account.name}
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <UserCircle
                                      size={20}
                                      className="text-white/70 dark:text-gray-400"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-semibold text-white dark:text-gray-900 truncate">
                                      {account.name}
                                    </div>
                                    {account.role && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          account.role === "admin"
                                            ? "bg-purple-500/30 text-purple-200 dark:bg-purple-200 dark:text-purple-800"
                                            : account.role === "tutor"
                                            ? "bg-blue-500/30 text-blue-200 dark:bg-blue-200 dark:text-blue-800"
                                            : "bg-gray-500/30 text-gray-200 dark:bg-gray-200 dark:text-gray-800"
                                        }`}
                                      >
                                        {account.role}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-white/60 dark:text-gray-600 truncate">
                                    {account.email}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {account.isCurrent && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center">
                                      <Check size={12} className="text-white" />
                                    </div>
                                  )}
                                  {!account.isCurrent &&
                                    allAccounts.length > 1 && (
                                      <button
                                        onClick={(e) =>
                                          handleRemoveAccount(account.id, e)
                                        }
                                        className="w-5 h-5 rounded-full hover:bg-red-500/30 dark:hover:bg-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        title={tProfile("remove_account")}
                                      >
                                        <X
                                          size={12}
                                          className="text-red-400 dark:text-red-600"
                                        />
                                      </button>
                                    )}
                                </div>
                              </button>
                            </motion.div>
                          ))}

                          <div className="h-px bg-gradient-to-r from-transparent via-white/20 dark:via-gray-300 to-transparent my-3"></div>
                          <motion.button
                            onClick={addAccount}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 dark:hover:from-blue-100 dark:hover:to-cyan-100 transition-all duration-200 text-blue-300 dark:text-blue-600 group"
                            whileHover={{ x: 2, scale: 1.01 }}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 flex items-center justify-center shadow-sm">
                              <User size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-semibold">
                              {tProfile("add_account")}
                            </span>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* Personal Information */}
            <div className="bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-blue-500/20 dark:from-emerald-100 dark:via-teal-100 dark:to-blue-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 overflow-hidden shadow-lg dark:shadow-xl">
              <motion.div
                className="fixed bottom-4 left-4 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/30 rounded-full blur-xl pointer-events-none"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.4, 0.2, 0.4],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />

              <div className="z-10 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 flex items-center gap-2">
                    <User size={18} className="sm:w-5 sm:h-5" />
                    {t("personal_info")}
                  </h3>
                  {!isEditing ? (
                    <motion.button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg text-white text-xs sm:text-sm font-medium self-start sm:self-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Edit3 size={14} className="sm:w-4 sm:h-4" />
                      {t("edit")}
                    </motion.button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <motion.button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-xs sm:text-sm font-medium"
                        whileHover={{
                          scale: updateProfileMutation.isPending ? 1 : 1.05,
                        }}
                        whileTap={{
                          scale: updateProfileMutation.isPending ? 1 : 0.95,
                        }}
                      >
                        <Save size={14} className="sm:w-4 sm:h-4" />
                        {updateProfileMutation.isPending
                          ? t("saving")
                          : t("save")}
                      </motion.button>
                      <motion.button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-400 dark:hover:bg-gray-500 rounded-lg text-white text-xs sm:text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X size={14} className="sm:w-4 sm:h-4" />
                        {t("cancel")}
                      </motion.button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                      {t("display_name")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.display_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            display_name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-white/10 dark:bg-white border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder={t("display_name_placeholder")}
                      />
                    ) : (
                      <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900">
                        {profile?.display_name || t("not_set")}
                      </div>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                      {t("full_name")}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-white/10 dark:bg-white border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder={t("full_name_placeholder")}
                      />
                    ) : (
                      <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900">
                        {(profile as any)?.full_name || t("not_set")}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                      <Mail size={16} className="inline mr-1" />
                      {t("email")}
                    </label>
                    <div className="px-4 py-3 bg-white/5 dark:bg-gray-100 border border-white/10 dark:border-gray-300 rounded-lg text-white/70 dark:text-gray-600">
                      {userEmail}
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                      <MapPin size={16} className="inline mr-1" />
                      {t("timezone")}
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.timezone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, timezone: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white/10 dark:bg-white border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [&>option]:bg-gray-800 dark:[&>option]:bg-white [&>option]:text-white dark:[&>option]:text-gray-900"
                      >
                        <option value="Asia/Kuala_Lumpur">
                          Asia/Kuala Lumpur
                        </option>
                        <option value="Asia/Singapore">Asia/Singapore</option>
                        <option value="Asia/Jakarta">Asia/Jakarta</option>
                        <option value="Asia/Bangkok">Asia/Bangkok</option>
                        <option value="UTC">UTC</option>
                      </select>
                    ) : (
                      <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900">
                        {(profile as any)?.timezone || "Asia/Kuala_Lumpur"}
                      </div>
                    )}
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                      <DollarSign size={16} className="inline mr-1" />
                      {t("preferred_currency")}
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.currency}
                        onChange={(e) =>
                          setEditForm({ ...editForm, currency: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white/10 dark:bg-white border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [&>option]:bg-gray-800 dark:[&>option]:bg-white [&>option]:text-white dark:[&>option]:text-gray-900"
                      >
                        {getProfileSupportedCurrencies().map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.name} ({curr.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900">
                        {(() => {
                          const currencyCode =
                            (profile as any)?.currency ||
                            profileCurrency?.currency ||
                            "MYR";
                          const currency = getProfileSupportedCurrencies().find(
                            (c) => c.code === currencyCode
                          );
                          return currency
                            ? `${currency.symbol} ${currency.name} (${currency.code})`
                            : currencyCode;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                    {t("bio")}
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 dark:bg-white border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 placeholder-white/50 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                      placeholder={t("bio_placeholder")}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg text-white dark:text-gray-900 min-h-[100px]">
                      {(profile as any)?.bio || t("bio_empty")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interests Section */}
            {(broadField || subFields.length > 0) && (
              <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 dark:from-purple-100 dark:via-pink-100 dark:to-red-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 overflow-hidden shadow-lg dark:shadow-xl">
                <motion.div
                  className="fixed top-4 right-4 w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/30 rounded-full blur-xl pointer-events-none"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                  }}
                />

                <div className="z-10 relative">
                  <h3 className="text-xl font-semibold text-white dark:text-gray-900 mb-6 flex items-center gap-2">
                    <Award size={20} />
                    {t("interests")}
                  </h3>

                  <div className="space-y-4">
                    {broadField && (
                      <div>
                        <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                          {t("main_interest")}
                        </label>
                        <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg">
                          <span className="inline-block px-3 py-1 bg-blue-500/30 dark:bg-blue-200 rounded-full text-sm font-medium text-white dark:text-blue-800">
                            {broadField}
                          </span>
                        </div>
                      </div>
                    )}

                    {subFields.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-white/80 dark:text-gray-700 mb-2">
                          {t("specific_interests")}
                        </label>
                        <div className="px-4 py-3 bg-white/10 dark:bg-white/50 border border-white/20 dark:border-gray-300 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            {subFields.map(
                              (interest: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-block px-3 py-1 bg-green-500/30 dark:bg-green-200 rounded-full text-sm font-medium text-white dark:text-green-800"
                                >
                                  {interest}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Statistics - Role specific */}
            <div className="bg-gradient-to-br from-indigo-600/20 via-blue-600/20 to-cyan-500/20 dark:from-indigo-100 dark:via-blue-100 dark:to-cyan-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-6 overflow-hidden shadow-lg dark:shadow-xl">
              <div className="z-10 relative">
                <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="sm:w-5 sm:h-5" />
                  {profile?.role === "admin"
                    ? t("platform_statistics")
                    : profile?.role === "tutor"
                    ? t("teaching_statistics")
                    : t("learning_progress")}
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profile?.role === "student" ? (
                    // Student statistics
                    <>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Clock
                          size={24}
                          className="text-blue-400 dark:text-blue-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          {formatStudyTime(
                            learningStats?.data?.summary?.totalStudyMinutes || 0
                          )}
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("study_time")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Target
                          size={24}
                          className="text-green-400 dark:text-green-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          {learningStats?.data?.summary?.completedLessons || 0}
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("lessons_done")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Zap
                          size={24}
                          className="text-orange-400 dark:text-orange-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          {learningStats?.data?.summary?.studyStreak || 0}
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("day_streak")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Trophy
                          size={24}
                          className="text-yellow-400 dark:text-yellow-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          {learningStats?.data?.summary?.avgProgress || 0}%
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("avg_progress")}
                        </div>
                      </div>
                    </>
                  ) : profile?.role === "tutor" ? (
                    // Tutor statistics
                    <>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <BookOpen
                          size={24}
                          className="text-blue-400 dark:text-blue-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("courses_created")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Users
                          size={24}
                          className="text-green-400 dark:text-green-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("students_taught")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Clock
                          size={24}
                          className="text-orange-400 dark:text-orange-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0h
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("teaching_hours")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Award
                          size={24}
                          className="text-yellow-400 dark:text-yellow-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          5.0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("avg_rating")}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Admin statistics
                    <>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Users
                          size={24}
                          className="text-blue-400 dark:text-blue-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("total_users")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <BookOpen
                          size={24}
                          className="text-green-400 dark:text-green-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("total_courses")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <TrendingUp
                          size={24}
                          className="text-orange-400 dark:text-orange-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("active_sessions")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/10 dark:bg-white/50 rounded-lg">
                        <Settings
                          size={24}
                          className="text-yellow-400 dark:text-yellow-600 mx-auto mb-2"
                        />
                        <div className="text-xl font-bold text-white dark:text-gray-900">
                          0
                        </div>
                        <div className="text-xs text-white/70 dark:text-gray-600">
                          {t("reports_pending")}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Purchase History - Only for students */}
            {profile?.role === "student" && (
              <div className="bg-gradient-to-br from-emerald-600/20 via-green-600/20 to-teal-500/20 dark:from-emerald-100 dark:via-green-100 dark:to-teal-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-6 overflow-hidden shadow-lg dark:shadow-xl">
                <div className="z-10 relative">
                  <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                    <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                    {t("purchase_history")}
                  </h3>

                  {/* Enhanced Purchase Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <motion.div
                      className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-xl p-6 backdrop-blur-sm border border-emerald-400/20"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                          <DollarSign size={24} className="text-emerald-300" />
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                          {t("total")}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {purchaseData?.stats
                          ? formatPurchaseCurrency(
                              purchaseData.stats.total_spent_cents,
                              purchaseData.purchases?.[0]?.currency || "MYR"
                            )
                          : "RM 0"}
                      </div>
                      <div className="text-emerald-300/70 text-sm">
                        {t("total_spent")}
                      </div>
                      <div className="text-white/50 text-xs mt-2">
                        {t("lifetime_purchases")}
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl p-6 backdrop-blur-sm border border-blue-400/20"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                          <BookOpen size={24} className="text-blue-300" />
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                          {t("owned")}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {purchaseData?.stats?.courses_owned || 0}
                      </div>
                      <div className="text-blue-300/70 text-sm">
                        {t("courses_owned")}
                      </div>
                      <div className="text-white/50 text-xs mt-2">
                        {t("active_orders")}:{" "}
                        {purchaseData?.stats?.active_orders || 0}
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl p-6 backdrop-blur-sm border border-purple-400/20"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                          <CalendarIcon size={24} className="text-purple-300" />
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                          {t("recent")}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold text-white mb-1">
                        {purchaseData?.stats?.last_purchase
                          ? formatPurchaseDate(
                              purchaseData.stats.last_purchase.date
                            )
                          : "--"}
                      </div>
                      <div className="text-purple-300/70 text-sm">
                        {t("last_purchase")}
                      </div>
                      <div className="text-white/50 text-xs mt-2 truncate">
                        {purchaseData?.stats?.last_purchase?.item_name || "--"}
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-xl p-6 backdrop-blur-sm border border-orange-400/20"
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center">
                          <Receipt size={24} className="text-orange-300" />
                        </div>
                        <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                          {t("total")}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {purchaseData?.purchases?.length || 0}
                      </div>
                      <div className="text-orange-300/70 text-sm">
                        {t("orders")}
                      </div>
                      <div className="text-white/50 text-xs mt-2">
                        {t("all_time_transactions")}
                      </div>
                    </motion.div>
                  </div>

                  {/* Purchase History Cards */}
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText size={16} />
                      {t("recent_purchases")}
                    </h4>

                    {purchaseLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2
                          size={24}
                          className="animate-spin text-white/60 dark:text-gray-400"
                        />
                      </div>
                    ) : purchaseData?.purchases?.length ? (
                      <div className="space-y-3">
                        {purchaseData.purchases.slice(0, 5).map((purchase) => (
                          <motion.div
                            key={purchase.id}
                            className="group bg-white/5 hover:bg-white/10 dark:bg-white/30 dark:hover:bg-white/50 backdrop-blur-sm border border-white/10 dark:border-gray-300 hover:border-white/20 dark:hover:border-gray-400 rounded-xl p-4 transition-all duration-300"
                            whileHover={{ scale: 1.01, y: -1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between">
                              {/* Left side - Course info */}
                              <div className="flex items-center gap-4 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center ${
                                    purchase.purchase_type === "course"
                                      ? "from-blue-500 to-cyan-500"
                                      : purchase.purchase_type === "plugin"
                                      ? "from-purple-500 to-pink-500"
                                      : "from-orange-500 to-red-500"
                                  }`}
                                >
                                  {purchase.purchase_type === "course" ? (
                                    <BookOpen
                                      size={20}
                                      className="text-white"
                                    />
                                  ) : purchase.purchase_type === "plugin" ? (
                                    <Zap size={20} className="text-white" />
                                  ) : (
                                    <FileText
                                      size={20}
                                      className="text-white"
                                    />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white font-semibold text-sm truncate group-hover:text-emerald-400 transition-colors">
                                    {purchase.item_name}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        purchase.purchase_type === "course"
                                          ? "bg-blue-500/20 text-blue-300"
                                          : purchase.purchase_type === "plugin"
                                          ? "bg-purple-500/20 text-purple-300"
                                          : "bg-orange-500/20 text-orange-300"
                                      }`}
                                    >
                                      {purchase.purchase_type === "course"
                                        ? t("course_type")
                                        : purchase.purchase_type === "plugin"
                                        ? t("plugin_type")
                                        : t("resource_type")}
                                    </div>
                                    <span className="text-white/60 text-xs">
                                      {formatPurchaseDate(purchase.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side - Price and status */}
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-emerald-400 font-bold text-lg">
                                    {formatPurchaseCurrency(
                                      purchase.amount_cents,
                                      purchase.currency
                                    )}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    {purchase.currency}
                                  </div>
                                </div>

                                <div
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                                    purchase.status === "paid"
                                      ? "bg-green-500/20 text-green-300"
                                      : purchase.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-300"
                                      : purchase.status === "failed"
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-gray-500/20 text-gray-300"
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      purchase.status === "paid"
                                        ? "bg-green-400"
                                        : purchase.status === "pending"
                                        ? "bg-yellow-400"
                                        : purchase.status === "failed"
                                        ? "bg-red-400"
                                        : "bg-gray-400"
                                    }`}
                                  />
                                  {purchase.status === "paid"
                                    ? t("status_paid")
                                    : purchase.status === "pending"
                                    ? t("status_pending")
                                    : purchase.status === "failed"
                                    ? t("status_failed")
                                    : t("status_refunded")}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBag
                          size={48}
                          className="text-white/20 mx-auto mb-4"
                        />
                        <p className="text-white/60 text-lg">
                          {t("no_purchase_history")}
                        </p>
                        <p className="text-white/40 text-sm mt-1">
                          {t("no_purchase_history_desc")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* View All Button */}
                  {purchaseData?.purchases?.length &&
                    purchaseData.purchases.length > 5 && (
                      <div className="mt-6 text-center">
                        <motion.button
                          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center gap-2 mx-auto"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ArrowDownToLine size={18} />
                          {t("view_all_purchases")}
                          <Badge className="bg-white/20 text-white ml-2">
                            +{purchaseData.purchases.length - 5}
                          </Badge>
                        </motion.button>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Achievements System - Only for students */}
            {profile?.role === "student" && (
              <AchievementsSection className="mb-6" />
            )}

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-600/20 via-slate-600/20 to-zinc-500/20 dark:from-gray-100 dark:via-slate-100 dark:to-zinc-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-8 overflow-hidden shadow-lg dark:shadow-xl">
              <div className="z-10 relative">
                <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Settings size={18} className="sm:w-5 sm:h-5" />
                  {t("quick_actions")}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Dashboard - Always visible for all roles */}
                  <motion.button
                    onClick={handleNavigateToDashboard}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 dark:bg-white/50 dark:hover:bg-white/70 rounded-lg text-white dark:text-gray-900 transition-colors"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <TrendingUp
                      size={18}
                      className="sm:w-5 sm:h-5 text-purple-400 dark:text-purple-600 flex-shrink-0"
                    />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {t("dashboard")}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70 dark:text-gray-600 truncate">
                        {profile?.role === "admin"
                          ? t("admin_control_panel")
                          : profile?.role === "tutor"
                          ? t("teaching_dashboard")
                          : t("learning_dashboard")}
                      </div>
                    </div>
                  </motion.button>

                  {/* Courses - Role specific */}
                  <motion.button
                    onClick={handleNavigateToCourses}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 dark:bg-white/50 dark:hover:bg-white/70 rounded-lg text-white dark:text-gray-900 transition-colors"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BookOpen
                      size={18}
                      className="sm:w-5 sm:h-5 text-blue-400 dark:text-blue-600 flex-shrink-0"
                    />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">
                        {profile?.role === "admin"
                          ? t("manage_courses")
                          : profile?.role === "tutor"
                          ? t("my_courses")
                          : t("my_courses")}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70 dark:text-gray-600 truncate">
                        {profile?.role === "admin"
                          ? t("course_administration")
                          : profile?.role === "tutor"
                          ? t("teaching_materials")
                          : t("view_enrolled")}
                      </div>
                    </div>
                  </motion.button>

                  {/* Community/Achievements - Role specific */}
                  <motion.button
                    onClick={
                      profile?.role === "student"
                        ? handleNavigateToAchievements
                        : handleNavigateToCommunity
                    }
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 dark:bg-white/50 dark:hover:bg-white/70 rounded-lg text-white dark:text-gray-900 transition-colors"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {profile?.role === "student" ? (
                      <>
                        <Award
                          size={18}
                          className="sm:w-5 sm:h-5 text-yellow-400 dark:text-yellow-600 flex-shrink-0"
                        />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">
                            {t("achievements")}
                          </div>
                          <div className="text-xs sm:text-sm text-white/70 dark:text-gray-600 truncate">
                            {t("view_badges")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Users
                          size={18}
                          className="sm:w-5 sm:h-5 text-green-400 dark:text-green-600 flex-shrink-0"
                        />
                        <div className="text-left min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">
                            {profile?.role === "admin"
                              ? t("community_management")
                              : t("community")}
                          </div>
                          <div className="text-xs sm:text-sm text-white/70 dark:text-gray-600 truncate">
                            {profile?.role === "admin"
                              ? t("moderate_community")
                              : t("join_groups")}
                          </div>
                        </div>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
