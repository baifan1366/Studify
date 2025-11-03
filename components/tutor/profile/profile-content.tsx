"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/profile/use-user";
import { useFullProfile, useUpdateProfile } from "@/hooks/profile/use-profile";
import { useAccountSwitcher } from "@/hooks/auth/use-account-switcher";
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
import {
  useEarningsData,
  formatCurrency as formatEarningsCurrency,
  formatTransactionDate,
  getTransactionDisplayName,
} from "@/hooks/profile/use-earnings-data";
import {
  useStripeConnectAccount,
  useCreateStripeConnectAccount,
  useGetOnboardingLink,
  useGetDashboardLink,
  isAccountFullySetup,
  getAccountStatusText,
  getAccountStatusColor,
} from "@/hooks/tutor/use-stripe-connect";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Camera,
  Users,
  ChevronRight,
  Loader2,
  UserCircle,
  Check,
  X,
  TrendingUp,
  Settings,
  DollarSign,
  BarChart2,
  ArrowDownToLine,
  CreditCard,
  FileText,
  Edit3,
  Save,
  Mail,
  MapPin,
  Award,
  BookOpen,
} from "lucide-react";
import Image from "next/image";

export default function ProfileContent() {
  const t = useTranslations("ProfileContent");
  const tProfile = useTranslations("UserProfile");
  const router = useRouter();
  const pathname = usePathname();
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile(
    userData?.id || ""
  );
  const updateProfileMutation = useUpdateProfile(userData?.id || "");
  const { data: earningsData, isLoading: earningsLoading } = useEarningsData();
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

  // Stripe Connect hooks
  const { data: stripeConnectData, isLoading: stripeLoading } =
    useStripeConnectAccount();
  const createStripeAccount = useCreateStripeConnectAccount();
  const getOnboardingLink = useGetOnboardingLink();
  const getDashboardLink = useGetDashboardLink();

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
            description: `${t("uploading_to_mega")} (${(avatarFile.size / 1024 / 1024).toFixed(2)} MB)`,
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
              description: `${t("avatar_uploaded_desc")} (${(file_size / 1024 / 1024).toFixed(2)} MB)`,
            });
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || "Avatar upload failed");
          }
        } catch (avatarError: any) {
          console.error('Avatar upload error:', avatarError);
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
      if (!updateData.avatar_url || updateData.avatar_url === profile?.avatar_url) {
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
      console.error('Profile update error:', error);
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

  // Quick Actions handlers - Tutor specific
  const handleNavigateToCourses = () => {
    const locale = pathname.split("/")[1] || "en";
    router.push(`/${locale}/tutor/teaching/course-content`);
  };

  const handleNavigateToCommunity = () => {
    const locale = pathname.split("/")[1] || "en";
    router.push(`/${locale}/tutor/community`);
  };

  const handleNavigateToDashboard = () => {
    const locale = pathname.split("/")[1] || "en";
    router.push(`/${locale}/tutor/dashboard`);
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

  // Stripe Connect handlers
  const handleCreateStripeAccount = () => {
    const currentUrl = window.location.origin + pathname;
    createStripeAccount.mutate({
      return_url: `${currentUrl}?stripe=complete`,
      refresh_url: `${currentUrl}?stripe=refresh`,
    });
  };

  const handleCompleteOnboarding = () => {
    const currentUrl = window.location.origin + pathname;
    getOnboardingLink.mutate({
      return_url: `${currentUrl}?stripe=complete`,
      refresh_url: `${currentUrl}?stripe=refresh`,
    });
  };

  const handleOpenStripeDashboard = () => {
    getDashboardLink.mutate();
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

                {/* Tutor Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {earningsData?.stats?.students_count || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("students_taught")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {earningsData?.stats?.courses_sold || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("courses_created")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {earningsData?.stats
                        ? formatEarningsCurrency(
                            earningsData.stats.total_earnings_cents,
                            "MYR"
                          ).replace("RM ", "")
                        : "0"}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("total_earnings")}
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

            {/* Stripe Connect Setup Section */}
            <div className="bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-500/20 dark:from-indigo-100 dark:via-purple-100 dark:to-pink-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-6 overflow-hidden shadow-lg dark:shadow-xl">
              <div className="z-10 relative">
                <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <CreditCard size={18} className="sm:w-5 sm:h-5" />
                  {t("payment_account")}
                </h3>

                {stripeLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2
                      size={24}
                      className="animate-spin text-white/60 dark:text-gray-400"
                    />
                  </div>
                ) : !stripeConnectData ? (
                  <div className="text-center py-8">
                    <CreditCard
                      size={48}
                      className="text-white/20 dark:text-gray-300 mx-auto mb-4"
                    />
                    <p className="text-white/80 dark:text-gray-700 text-lg mb-2">
                      {t("setup_payment_account")}
                    </p>
                    <p className="text-white/60 dark:text-gray-600 text-sm mb-6">
                      {t("setup_payment_desc")}
                    </p>
                    <motion.button
                      onClick={handleCreateStripeAccount}
                      disabled={createStripeAccount.isPending}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2 mx-auto"
                      whileHover={{
                        scale: createStripeAccount.isPending ? 1 : 1.05,
                      }}
                      whileTap={{
                        scale: createStripeAccount.isPending ? 1 : 0.95,
                      }}
                    >
                      {createStripeAccount.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t("setting_up")}
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} />
                          {t("setup_now")}
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-white/30 rounded-lg border border-white/10 dark:border-gray-300">
                      <div>
                        <div className="text-white/70 dark:text-gray-600 text-sm">
                          {t("account_status")}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className={`w-2 h-2 rounded-full ${getAccountStatusColor(
                              stripeConnectData
                            )}`}
                          />
                          <span className="text-white dark:text-gray-900 font-medium">
                            {getAccountStatusText(stripeConnectData)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          isAccountFullySetup(stripeConnectData)
                            ? "default"
                            : "secondary"
                        }
                      >
                        {isAccountFullySetup(stripeConnectData)
                          ? t("active")
                          : t("setup_required")}
                      </Badge>
                    </div>

                    {!isAccountFullySetup(stripeConnectData) && (
                      <div className="p-4 bg-yellow-500/10 dark:bg-yellow-100 border border-yellow-500/20 dark:border-yellow-300 rounded-lg">
                        <p className="text-yellow-200 dark:text-yellow-800 text-sm mb-3">
                          {t("complete_setup_message")}
                        </p>
                        <motion.button
                          onClick={handleCompleteOnboarding}
                          disabled={getOnboardingLink.isPending}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-300 flex items-center gap-2"
                          whileHover={{
                            scale: getOnboardingLink.isPending ? 1 : 1.05,
                          }}
                          whileTap={{
                            scale: getOnboardingLink.isPending ? 1 : 0.95,
                          }}
                        >
                          {getOnboardingLink.isPending ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {t("loading")}
                            </>
                          ) : (
                            <>
                              <Settings size={16} />
                              {t("complete_setup")}
                            </>
                          )}
                        </motion.button>
                      </div>
                    )}

                    {isAccountFullySetup(stripeConnectData) && (
                      <motion.button
                        onClick={handleOpenStripeDashboard}
                        disabled={getDashboardLink.isPending}
                        className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 dark:bg-white/30 dark:hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-gray-900 font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                        whileHover={{
                          scale: getDashboardLink.isPending ? 1 : 1.02,
                        }}
                        whileTap={{
                          scale: getDashboardLink.isPending ? 1 : 0.98,
                        }}
                      >
                        {getDashboardLink.isPending ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t("loading")}
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            {t("open_stripe_dashboard")}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Earnings & Cashflow Section */}
            <div className="bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-amber-500/20 dark:from-yellow-100 dark:via-orange-100 dark:to-amber-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-6 overflow-hidden shadow-lg dark:shadow-xl">
              <motion.div
                className="absolute top-4 right-4 w-16 h-16 bg-yellow-500/30 rounded-full blur-xl pointer-events-none"
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

              <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <DollarSign size={18} className="sm:w-5 sm:h-5" />
                  {t("earnings_cashflow")}
                </h3>

                {/* Enhanced Earnings Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <motion.div
                    className="bg-gradient-to-br from-yellow-500/30 to-amber-500/30 dark:from-yellow-200 dark:to-amber-200 rounded-xl p-6 backdrop-blur-sm border border-yellow-400/20 dark:border-yellow-400"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-yellow-500/30 dark:bg-yellow-300 rounded-xl flex items-center justify-center">
                        <DollarSign
                          size={24}
                          className="text-yellow-300 dark:text-yellow-700"
                        />
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-300 dark:bg-yellow-300 dark:text-yellow-800 border-yellow-400/30 dark:border-yellow-500">
                        {t("total")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-white dark:text-gray-900 mb-1">
                      {earningsData?.stats
                        ? formatEarningsCurrency(
                            earningsData.stats.total_earnings_cents,
                            earningsData.recent_transactions?.[0]?.currency ||
                              "MYR"
                          )
                        : "RM 0"}
                    </div>
                    <div className="text-yellow-300/70 dark:text-yellow-700 text-sm">
                      {t("total_earnings")}
                    </div>
                    <div className="text-green-400 dark:text-green-700 text-xs mt-2 flex items-center gap-1">
                      <TrendingUp size={12} />+
                      {earningsData?.stats?.growth_percentage || 0}% this month
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-orange-500/30 to-red-500/30 dark:from-orange-200 dark:to-red-200 rounded-xl p-6 backdrop-blur-sm border border-orange-400/20 dark:border-orange-400"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-orange-500/30 dark:bg-orange-300 rounded-xl flex items-center justify-center">
                        <BarChart2
                          size={24}
                          className="text-orange-300 dark:text-orange-700"
                        />
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-300 dark:bg-orange-300 dark:text-orange-800 border-orange-400/30 dark:border-orange-500">
                        {t("this_month")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-white dark:text-gray-900 mb-1">
                      {earningsData?.stats
                        ? formatEarningsCurrency(
                            earningsData.stats.monthly_earnings_cents,
                            earningsData.recent_transactions?.[0]?.currency ||
                              "MYR"
                          )
                        : "RM 0"}
                    </div>
                    <div className="text-orange-300/70 dark:text-orange-700 text-sm">
                      {t("this_month")}
                    </div>
                    <div className="text-white/50 dark:text-gray-600 text-xs mt-2">
                      From {earningsData?.stats?.students_count || 0} students
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-amber-500/30 to-yellow-500/30 dark:from-amber-200 dark:to-yellow-200 rounded-xl p-6 backdrop-blur-sm border border-amber-400/20 dark:border-amber-400"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-amber-500/30 dark:bg-amber-300 rounded-xl flex items-center justify-center">
                        <CreditCard
                          size={24}
                          className="text-amber-300 dark:text-amber-700"
                        />
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300 dark:bg-amber-300 dark:text-amber-800 border-amber-400/30 dark:border-amber-500">
                        {t("pending_payout")}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-white dark:text-gray-900 mb-1">
                      {earningsData?.stats
                        ? formatEarningsCurrency(
                            earningsData.stats.pending_payout_cents,
                            earningsData.recent_transactions?.[0]?.currency ||
                              "MYR"
                          )
                        : "RM 0"}
                    </div>
                    <div className="text-amber-300/70 dark:text-amber-700 text-sm">
                      {t("pending_payout")}
                    </div>
                    <div className="text-white/50 dark:text-gray-600 text-xs mt-2">
                      To be released Dec 1
                    </div>
                  </motion.div>
                </div>

                {/* Monthly Breakdown */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white dark:text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} />
                    {t("monthly_breakdown")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {earningsLoading ? (
                      <div className="col-span-full flex justify-center py-8">
                        <Loader2
                          size={24}
                          className="animate-spin text-white/60 dark:text-gray-400"
                        />
                      </div>
                    ) : earningsData?.monthly_breakdown?.length ? (
                      earningsData.monthly_breakdown.map((monthData, index) => (
                        <motion.div
                          key={`${monthData.month}-${monthData.year}`}
                          className="bg-white/5 hover:bg-white/10 dark:bg-white/30 dark:hover:bg-white/50 border border-white/10 dark:border-gray-300 hover:border-white/20 dark:hover:border-gray-400 rounded-xl p-4 transition-all duration-300"
                          whileHover={{ scale: 1.02, y: -2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-white/70 dark:text-gray-600 text-sm">
                                {monthData.month} {monthData.year}
                              </div>
                              <div
                                className={`text-2xl font-bold mt-1 ${
                                  index === 0
                                    ? "text-yellow-400 dark:text-yellow-600"
                                    : index === 1
                                    ? "text-orange-400 dark:text-orange-600"
                                    : "text-amber-400 dark:text-amber-600"
                                }`}
                              >
                                {formatEarningsCurrency(
                                  monthData.total_cents,
                                  "MYR"
                                )}
                              </div>
                            </div>
                            <Badge
                              className={
                                monthData.status === "current"
                                  ? "bg-green-500/20 text-green-300 dark:bg-green-200 dark:text-green-800 border-green-400/30 dark:border-green-400"
                                  : "bg-gray-500/20 text-gray-300 dark:bg-gray-200 dark:text-gray-800 border-gray-400/30 dark:border-gray-400"
                              }
                            >
                              {monthData.status === "current"
                                ? t("current_month")
                                : t("paid_month")}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60 dark:text-gray-600">
                                {t("course_sales")}:
                              </span>
                              <span className="text-blue-300 dark:text-blue-700 font-medium">
                                {formatEarningsCurrency(
                                  monthData.course_sales_cents,
                                  "MYR"
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60 dark:text-gray-600">
                                {t("tutoring_income")}:
                              </span>
                              <span className="text-green-300 dark:text-green-700 font-medium">
                                {formatEarningsCurrency(
                                  monthData.tutoring_cents,
                                  "MYR"
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60 dark:text-gray-600">
                                {t("commission")}:
                              </span>
                              <span className="text-purple-300 dark:text-purple-700 font-medium">
                                {formatEarningsCurrency(
                                  monthData.commission_cents,
                                  "MYR"
                                )}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <BarChart2
                          size={48}
                          className="text-white/20 dark:text-gray-300 mx-auto mb-4"
                        />
                        <p className="text-white/60 dark:text-gray-600 text-lg">
                          No earnings data available
                        </p>
                        <p className="text-white/40 dark:text-gray-500 text-sm mt-1">
                          Start teaching to see your monthly breakdown
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-white dark:text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    {t("recent_transactions")}
                  </h4>

                  <div className="space-y-3">
                    {earningsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2
                          size={24}
                          className="animate-spin text-white/60 dark:text-gray-400"
                        />
                      </div>
                    ) : earningsData?.recent_transactions &&
                      earningsData.recent_transactions.length > 0 ? (
                      earningsData.recent_transactions
                        .slice(0, 5)
                        .map((transaction) => (
                          <motion.div
                            key={transaction.id}
                            className="group bg-white/5 hover:bg-white/10 dark:bg-white/30 dark:hover:bg-white/50 backdrop-blur-sm border border-white/10 dark:border-gray-300 hover:border-white/20 dark:hover:border-gray-400 rounded-xl p-4 transition-all duration-300"
                            whileHover={{ scale: 1.01, y: -1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between">
                              {/* Left side - Transaction info */}
                              <div className="flex items-center gap-4 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center ${
                                    transaction.source_type === "course_sale"
                                      ? "from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400"
                                      : "from-green-500 to-teal-500 dark:from-green-400 dark:to-teal-400"
                                  }`}
                                >
                                  {transaction.source_type === "course_sale" ? (
                                    <BookOpen
                                      size={20}
                                      className="text-white"
                                    />
                                  ) : (
                                    <Users size={20} className="text-white" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white dark:text-gray-900 font-semibold text-sm truncate group-hover:text-yellow-400 dark:group-hover:text-yellow-600 transition-colors">
                                    {getTransactionDisplayName(transaction)}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        transaction.source_type ===
                                        "course_sale"
                                          ? "bg-blue-500/20 text-blue-300 dark:bg-blue-200 dark:text-blue-800"
                                          : "bg-green-500/20 text-green-300 dark:bg-green-200 dark:text-green-800"
                                      }`}
                                    >
                                      {transaction.source_type === "course_sale"
                                        ? t("course_sale")
                                        : t("tutoring_session")}
                                    </div>
                                    <span className="text-white/60 dark:text-gray-600 text-xs">
                                      {formatTransactionDate(
                                        transaction.created_at
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side - Amount and status */}
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-yellow-400 dark:text-yellow-600 font-bold text-lg">
                                    {formatEarningsCurrency(
                                      transaction.amount_cents,
                                      transaction.currency
                                    )}
                                  </div>
                                  <div className="text-white/60 dark:text-gray-600 text-xs">
                                    {transaction.currency}
                                  </div>
                                </div>

                                <div
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                                    transaction.status === "released"
                                      ? "bg-green-500/20 text-green-300 dark:bg-green-200 dark:text-green-800"
                                      : transaction.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-300 dark:bg-yellow-200 dark:text-yellow-800"
                                      : "bg-gray-500/20 text-gray-300 dark:bg-gray-200 dark:text-gray-800"
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      transaction.status === "released"
                                        ? "bg-green-400 dark:bg-green-600"
                                        : transaction.status === "pending"
                                        ? "bg-yellow-400 dark:bg-yellow-600"
                                        : "bg-gray-400 dark:bg-gray-600"
                                    }`}
                                  />
                                  {transaction.status === "released"
                                    ? "Paid"
                                    : transaction.status === "pending"
                                    ? t("status_pending")
                                    : "On Hold"}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <div className="text-center py-12">
                        <DollarSign
                          size={48}
                          className="text-white/20 dark:text-gray-300 mx-auto mb-4"
                        />
                        <p className="text-white/60 dark:text-gray-600 text-lg">
                          {t("no_recent_transactions")}
                        </p>
                        <p className="text-white/40 dark:text-gray-500 text-sm mt-1">
                          {t("start_teaching_earn")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    onClick={handleOpenStripeDashboard}
                    disabled={
                      !isAccountFullySetup(stripeConnectData) ||
                      getDashboardLink.isPending
                    }
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-500 dark:to-emerald-500 dark:hover:from-green-600 dark:hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
                    whileHover={{
                      scale:
                        !isAccountFullySetup(stripeConnectData) ||
                        getDashboardLink.isPending
                          ? 1
                          : 1.05,
                    }}
                    whileTap={{
                      scale:
                        !isAccountFullySetup(stripeConnectData) ||
                        getDashboardLink.isPending
                          ? 1
                          : 0.95,
                    }}
                  >
                    {getDashboardLink.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t("loading")}
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine size={16} />
                        {t("withdraw_earnings")}
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={handleOpenStripeDashboard}
                    disabled={getDashboardLink.isPending}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 dark:from-amber-500 dark:to-orange-500 dark:hover:from-amber-600 dark:hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-amber-500/25 flex items-center gap-2"
                    whileHover={{
                      scale: getDashboardLink.isPending ? 1 : 1.05,
                    }}
                    whileTap={{ scale: getDashboardLink.isPending ? 1 : 0.95 }}
                  >
                    <CreditCard size={16} />
                    {t("payout_settings")}
                  </motion.button>
                  <motion.button
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <BarChart2 size={16} />
                    {t("analytics")}
                  </motion.button>
                </div>

                {!isAccountFullySetup(stripeConnectData) && (
                  <div className="mt-4 p-3 bg-blue-500/10 dark:bg-blue-100 border border-blue-500/20 dark:border-blue-300 rounded-lg">
                    <p className="text-blue-200 dark:text-blue-800 text-sm">
                      💡 {t("setup_payment_to_withdraw")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-600/20 via-slate-600/20 to-zinc-500/20 dark:from-gray-100 dark:via-slate-100 dark:to-zinc-100 rounded-2xl border border-white/20 dark:border-gray-200 backdrop-blur-sm p-4 sm:p-6 mb-8 overflow-hidden shadow-lg dark:shadow-xl">
              <motion.div
                className="absolute bottom-4 left-4 w-16 h-16 bg-slate-500/30 rounded-full blur-xl pointer-events-none"
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

              <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-semibold text-white dark:text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <Settings size={18} className="sm:w-5 sm:h-5" />
                  {t("quick_actions")}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Dashboard */}
                  <motion.button
                    onClick={handleNavigateToDashboard}
                    className="group flex items-center gap-3 p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 dark:from-purple-100 dark:to-pink-100 dark:hover:from-purple-200 dark:hover:to-pink-200 border border-purple-400/20 hover:border-purple-400/40 dark:border-purple-300 dark:hover:border-purple-400 rounded-xl text-white dark:text-gray-900 transition-all duration-300"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 bg-purple-500/30 dark:bg-purple-200 rounded-xl flex items-center justify-center group-hover:bg-purple-500/40 dark:group-hover:bg-purple-300 transition-colors">
                      <TrendingUp
                        size={20}
                        className="text-purple-300 dark:text-purple-700"
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base truncate">
                        {t("dashboard")}
                      </div>
                      <div className="text-xs text-white/70 dark:text-gray-600 truncate">
                        {t("teaching_dashboard")}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-white/40 dark:text-gray-400 group-hover:text-white/70 dark:group-hover:text-gray-600 transition-colors"
                    />
                  </motion.button>

                  {/* My Courses */}
                  <motion.button
                    onClick={handleNavigateToCourses}
                    className="group flex items-center gap-3 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 dark:from-blue-100 dark:to-cyan-100 dark:hover:from-blue-200 dark:hover:to-cyan-200 border border-blue-400/20 hover:border-blue-400/40 dark:border-blue-300 dark:hover:border-blue-400 rounded-xl text-white dark:text-gray-900 transition-all duration-300"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 bg-blue-500/30 dark:bg-blue-200 rounded-xl flex items-center justify-center group-hover:bg-blue-500/40 dark:group-hover:bg-blue-300 transition-colors">
                      <BookOpen
                        size={20}
                        className="text-blue-300 dark:text-blue-700"
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base truncate">
                        {t("my_courses")}
                      </div>
                      <div className="text-xs text-white/70 dark:text-gray-600 truncate">
                        {t("teaching_materials")}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-white/40 dark:text-gray-400 group-hover:text-white/70 dark:group-hover:text-gray-600 transition-colors"
                    />
                  </motion.button>

                  {/* Community */}
                  <motion.button
                    onClick={handleNavigateToCommunity}
                    className="group flex items-center gap-3 p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 dark:from-green-100 dark:to-emerald-100 dark:hover:from-green-200 dark:hover:to-emerald-200 border border-green-400/20 hover:border-green-400/40 dark:border-green-300 dark:hover:border-green-400 rounded-xl text-white dark:text-gray-900 transition-all duration-300"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 bg-green-500/30 dark:bg-green-200 rounded-xl flex items-center justify-center group-hover:bg-green-500/40 dark:group-hover:bg-green-300 transition-colors">
                      <Users
                        size={20}
                        className="text-green-300 dark:text-green-700"
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base truncate">
                        {t("community")}
                      </div>
                      <div className="text-xs text-white/70 dark:text-gray-600 truncate">
                        {t("join_groups")}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-white/40 dark:text-gray-400 group-hover:text-white/70 dark:group-hover:text-gray-600 transition-colors"
                    />
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
