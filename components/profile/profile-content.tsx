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
    <div className="min-h-screen w-full bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t("page_title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {t("page_subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
          {/* Profile Card */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="inline-block mb-4 relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto ring-4 ring-gray-200 dark:ring-gray-600">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Profile Preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : userAvatar ? (
                      <Image
                        src={userAvatar}
                        alt="Profile"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        size={64}
                        className="text-gray-400 dark:text-gray-500"
                      />
                    )}
                  </div>
                  <motion.button
                    onClick={handleAvatarChange}
                    className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera size={14} className="sm:w-4 sm:h-4" />
                  </motion.button>
                </div>

                {/* User Info */}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                  {userName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base truncate">
                  {userEmail}
                </p>

                {profile?.role && (
                  <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize mb-4">
                    {profile.role}
                  </span>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {pointsData?.data?.currentPoints ||
                        (profile as any)?.points ||
                        0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("points")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {learningStats?.data?.summary?.completedCourses || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("courses")}
                    </div>
                  </div>
                  <div className="text-center">
                    <StudentAchievementStats />
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("achievements")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Switcher Card */}
            {storedAccounts.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mt-6">
                <div className="relative">
                  <motion.button
                    onClick={handleAccountSwitch}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 group"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                          {tProfile("switch_account")}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
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
                        className="text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
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
                                className="text-blue-600 dark:text-blue-400 animate-spin"
                              />
                              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                {tProfile("switching_account")}
                              </span>
                            </div>
                          )}

                          {/* Show error if any */}
                          {switchError && (
                            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-xs text-red-700 dark:text-red-300">
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
                                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                                  account.isCurrent
                                    ? "bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500 dark:ring-green-600"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                } ${
                                  isSwitching
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600">
                                  {account.avatar ? (
                                    <Image
                                      src={account.avatar}
                                      alt={account.name}
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <UserCircle
                                      size={20}
                                      className="text-gray-400 dark:text-gray-500"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                      {account.name}
                                    </div>
                                    {account.role && (
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          account.role === "admin"
                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                            : account.role === "tutor"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        }`}
                                      >
                                        {account.role}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {account.email}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {account.isCurrent && (
                                    <div className="w-5 h-5 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                                      <Check size={12} className="text-white" />
                                    </div>
                                  )}
                                  {!account.isCurrent &&
                                    allAccounts.length > 1 && (
                                      <button
                                        onClick={(e) =>
                                          handleRemoveAccount(account.id, e)
                                        }
                                        className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        title={tProfile("remove_account")}
                                      >
                                        <X
                                          size={12}
                                          className="text-red-600 dark:text-red-400"
                                        />
                                      </button>
                                    )}
                                </div>
                              </button>
                            </motion.div>
                          ))}

                          <div className="h-px bg-gray-200 dark:bg-gray-700 my-3"></div>
                          <motion.button
                            onClick={addAccount}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-blue-600 dark:text-blue-400 group"
                            whileHover={{ x: 2, scale: 1.01 }}
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User size={16} className="text-blue-600 dark:text-blue-400" />
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
                      className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 rounded-lg text-white text-xs sm:text-sm font-medium"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                      placeholder={t("display_name_placeholder")}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {profile?.display_name || t("not_set")}
                    </div>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                      placeholder={t("full_name_placeholder")}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {(profile as any)?.full_name || t("not_set")}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail size={16} className="inline mr-1" />
                    {t("email")}
                  </label>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400">
                    {userEmail}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin size={16} className="inline mr-1" />
                    {t("timezone")}
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.timezone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, timezone: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
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
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {(profile as any)?.timezone || "Asia/Kuala_Lumpur"}
                    </div>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <DollarSign size={16} className="inline mr-1" />
                    {t("preferred_currency")}
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.currency}
                      onChange={(e) =>
                        setEditForm({ ...editForm, currency: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                    >
                      {getProfileSupportedCurrencies().map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.name} ({curr.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("bio")}
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors resize-none"
                    placeholder={t("bio_placeholder")}
                  />
                ) : (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white min-h-[100px]">
                    {(profile as any)?.bio || t("bio_empty")}
                  </div>
                )}
              </div>
            </div>

            {/* Interests Section */}
            {(broadField || subFields.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Award size={20} />
                  {t("interests")}
                </h3>

                <div className="space-y-4">
                  {broadField && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("main_interest")}
                      </label>
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          {broadField}
                        </span>
                      </div>
                    </div>
                  )}

                  {subFields.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("specific_interests")}
                      </label>
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {subFields.map(
                            (interest: string, index: number) => (
                              <span
                                key={index}
                                className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium"
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
            )}

            {/* Statistics - Role specific */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
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
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Clock
                        size={24}
                        className="text-blue-600 dark:text-blue-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatStudyTime(
                          learningStats?.data?.summary?.totalStudyMinutes || 0
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("study_time")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Target
                        size={24}
                        className="text-green-600 dark:text-green-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {learningStats?.data?.summary?.completedLessons || 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("lessons_done")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Zap
                        size={24}
                        className="text-orange-600 dark:text-orange-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {learningStats?.data?.summary?.studyStreak || 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("day_streak")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Trophy
                        size={24}
                        className="text-yellow-600 dark:text-yellow-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {learningStats?.data?.summary?.avgProgress || 0}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("avg_progress")}
                      </div>
                    </div>
                  </>
                ) : profile?.role === "tutor" ? (
                  // Tutor statistics
                  <>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <BookOpen
                        size={24}
                        className="text-blue-600 dark:text-blue-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("courses_created")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Users
                        size={24}
                        className="text-green-600 dark:text-green-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("students_taught")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Clock
                        size={24}
                        className="text-orange-600 dark:text-orange-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0h
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("teaching_hours")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Award
                        size={24}
                        className="text-yellow-600 dark:text-yellow-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        5.0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("avg_rating")}
                      </div>
                    </div>
                  </>
                ) : (
                  // Admin statistics
                  <>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Users
                        size={24}
                        className="text-blue-600 dark:text-blue-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("total_users")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <BookOpen
                        size={24}
                        className="text-green-600 dark:text-green-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("total_courses")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <TrendingUp
                        size={24}
                        className="text-orange-600 dark:text-orange-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("active_sessions")}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Settings
                        size={24}
                        className="text-yellow-600 dark:text-yellow-400 mx-auto mb-2"
                      />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        0
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t("reports_pending")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Enhanced Purchase History - Only for students */}
            {profile?.role === "student" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                  <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                  {t("purchase_history")}
                </h3>

                {/* Enhanced Purchase Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <motion.div
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <DollarSign size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                        {t("total")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {purchaseData?.stats
                        ? formatPurchaseCurrency(
                            purchaseData.stats.total_spent_cents,
                            purchaseData.purchases?.[0]?.currency || "MYR"
                          )
                        : "RM 0"}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("total_spent")}
                    </div>
                    <div className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                      {t("lifetime_purchases")}
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        {t("owned")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {purchaseData?.stats?.courses_owned || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("courses_owned")}
                    </div>
                    <div className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                      {t("active_orders")}:{" "}
                      {purchaseData?.stats?.active_orders || 0}
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <CalendarIcon size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        {t("recent")}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {purchaseData?.stats?.last_purchase
                        ? formatPurchaseDate(
                            purchaseData.stats.last_purchase.date
                          )
                        : "--"}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("last_purchase")}
                    </div>
                    <div className="text-gray-500 dark:text-gray-500 text-xs mt-2 truncate">
                      {purchaseData?.stats?.last_purchase?.item_name || "--"}
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <Receipt size={24} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                        {t("total")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {purchaseData?.purchases?.length || 0}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {t("orders")}
                    </div>
                    <div className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                      {t("all_time_transactions")}
                    </div>
                  </motion.div>
                </div>

                {/* Purchase History Cards */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={16} />
                    {t("recent_purchases")}
                  </h4>

                  {purchaseLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2
                        size={24}
                        className="animate-spin text-gray-400 dark:text-gray-500"
                      />
                    </div>
                  ) : purchaseData?.purchases?.length ? (
                    <div className="space-y-3">
                      {purchaseData.purchases.slice(0, 5).map((purchase) => (
                        <motion.div
                          key={purchase.id}
                          className="group bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg p-4 transition-all duration-300"
                          whileHover={{ scale: 1.01, y: -1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-between">
                            {/* Left side - Course info */}
                            <div className="flex items-center gap-4 flex-1">
                              <div
                                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                  purchase.purchase_type === "course"
                                    ? "bg-blue-100 dark:bg-blue-900/30"
                                    : purchase.purchase_type === "plugin"
                                    ? "bg-purple-100 dark:bg-purple-900/30"
                                    : "bg-orange-100 dark:bg-orange-900/30"
                                }`}
                              >
                                {purchase.purchase_type === "course" ? (
                                  <BookOpen
                                    size={20}
                                    className="text-blue-600 dark:text-blue-400"
                                  />
                                ) : purchase.purchase_type === "plugin" ? (
                                  <Zap size={20} className="text-purple-600 dark:text-purple-400" />
                                ) : (
                                  <FileText
                                    size={20}
                                    className="text-orange-600 dark:text-orange-400"
                                  />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h5 className="text-gray-900 dark:text-white font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {purchase.item_name}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      purchase.purchase_type === "course"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : purchase.purchase_type === "plugin"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    }`}
                                  >
                                    {purchase.purchase_type === "course"
                                      ? t("course_type")
                                      : purchase.purchase_type === "plugin"
                                      ? t("plugin_type")
                                      : t("resource_type")}
                                  </div>
                                  <span className="text-gray-600 dark:text-gray-400 text-xs">
                                    {formatPurchaseDate(purchase.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right side - Price and status */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-green-600 dark:text-green-400 font-bold text-lg">
                                  {formatPurchaseCurrency(
                                    purchase.amount_cents,
                                    purchase.currency
                                  )}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 text-xs">
                                  {purchase.currency}
                                </div>
                              </div>

                              <div
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                                  purchase.status === "paid"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                    : purchase.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : purchase.status === "failed"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    purchase.status === "paid"
                                      ? "bg-green-600 dark:bg-green-400"
                                      : purchase.status === "pending"
                                      ? "bg-yellow-600 dark:bg-yellow-400"
                                      : purchase.status === "failed"
                                      ? "bg-red-600 dark:bg-red-400"
                                      : "bg-gray-600 dark:bg-gray-400"
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
                        className="text-gray-300 dark:text-gray-600 mx-auto mb-4"
                      />
                      <p className="text-gray-600 dark:text-gray-400 text-lg">
                        {t("no_purchase_history")}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
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
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg flex items-center gap-2 mx-auto"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ArrowDownToLine size={18} />
                        {t("view_all_purchases")}
                        <Badge className="bg-white/20 text-white ml-2 border-white/30">
                          +{purchaseData.purchases.length - 5}
                        </Badge>
                      </motion.button>
                    </div>
                  )}
              </div>
            )}

            {/* Achievements System - Only for students */}
            {profile?.role === "student" && (
              <AchievementsSection className="mb-6" />
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                <Settings size={18} className="sm:w-5 sm:h-5" />
                {t("quick_actions")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Dashboard - Always visible for all roles */}
                <motion.button
                  onClick={handleNavigateToDashboard}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TrendingUp
                    size={18}
                    className="sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 flex-shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {t("dashboard")}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
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
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <BookOpen
                    size={18}
                    className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {profile?.role === "admin"
                        ? t("manage_courses")
                        : profile?.role === "tutor"
                        ? t("my_courses")
                        : t("my_courses")}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
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
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {profile?.role === "student" ? (
                    <>
                      <Award
                        size={18}
                        className="sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {t("achievements")}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {t("view_badges")}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Users
                        size={18}
                        className="sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {profile?.role === "admin"
                            ? t("community_management")
                            : t("community")}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
