"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Camera, Edit3, Save, X, Mail, Calendar, MapPin, Award, BookOpen, Users, Settings, ChevronRight, Check, Loader2, UserCircle, Trophy, Target, Zap, Clock, TrendingUp, ShoppingBag, DollarSign, ArrowDownToLine, CreditCard, BarChart2, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile, useUpdateProfile } from '@/hooks/profile/use-profile';
import { useAccountSwitcher } from '@/hooks/auth/use-account-switcher';
import { useEarningsData, formatCurrency as formatEarningsCurrency, formatTransactionDate, getTransactionDisplayName } from '@/hooks/profile/use-earnings-data';
import { useProfileCurrency, useUpdateProfileCurrency, getSupportedCurrencies as getProfileSupportedCurrencies } from '@/hooks/profile/use-profile-currency';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';

export default function ProfileContent() {
  const t = useTranslations('ProfileContent');
  const tProfile = useTranslations('UserProfile');
  const router = useRouter();
  const pathname = usePathname();
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile(userData?.id || '');
  const updateProfileMutation = useUpdateProfile(userData?.id || '');
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
    switchError
  } = useAccountSwitcher();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    full_name: '',
    bio: '',
    timezone: '',
    currency: 'MYR',
    avatar_url: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const user = userData;
  const profile = fullProfileData?.profile || user?.profile;
  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || '';
  const userEmail = user?.email || '';
  const userName = userDisplayName || userEmail?.split('@')[0] || 'Unknown User';
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  
  // Get interests from profile preferences
  const userInterests = profile?.preferences?.interests || user?.user_metadata?.interests;
  const broadField = userInterests?.broadField;
  const subFields = userInterests?.subFields || [];

  React.useEffect(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        full_name: (profile as any)?.full_name || '',
        bio: (profile as any)?.bio || '',
        timezone: (profile as any)?.timezone || 'Asia/Kuala_Lumpur',
        currency: (profile as any)?.currency || profileCurrency?.currency || 'MYR',
        avatar_url: profile.avatar_url || ''
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
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        // Upload avatar to your backend/storage service
        // This is a placeholder - you'll need to implement the actual upload endpoint
        try {
          const response = await fetch('/api/profile/avatar', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const { avatar_url } = await response.json();
            updateData = { ...updateData, avatar_url };
          } else {
            throw new Error('Avatar upload failed');
          }
        } catch (avatarError) {
          toast({
            title: 'Avatar upload failed',
            description: 'Profile updated but avatar upload failed. Please try again.',
            variant: 'destructive',
          });
        }
      }

      await updateProfileMutation.mutateAsync(updateData);
      
      toast({
        title: t('profile_updated'),
        description: t('profile_updated_desc'),
      });
      
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
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
        display_name: profile.display_name || '',
        full_name: (profile as any)?.full_name || '',
        bio: (profile as any)?.bio || '',
        timezone: (profile as any)?.timezone || 'Asia/Kuala_Lumpur',
        currency: (profile as any)?.currency || profileCurrency?.currency || 'MYR',
        avatar_url: profile.avatar_url || ''
      });
    }
  };

  const handleAvatarChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: 'Please select an image smaller than 5MB',
            variant: 'destructive',
          });
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: 'Please select an image file',
            variant: 'destructive',
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
          title: 'Avatar selected',
          description: 'Click "Save" to update your profile with the new avatar',
        });
      }
    };
    input.click();
  };

  // Quick Actions handlers - Tutor specific
  const handleNavigateToCourses = () => {
    const locale = pathname.split('/')[1] || 'en';
    router.push(`/${locale}/tutor/courses`);
  };

  const handleNavigateToCommunity = () => {
    const locale = pathname.split('/')[1] || 'en';
    router.push(`/${locale}/community`);
  };

  const handleNavigateToDashboard = () => {
    const locale = pathname.split('/')[1] || 'en';
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
    
    const targetAccount = storedAccounts.find(acc => acc.id === accountId);
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
  const allAccounts = storedAccounts.map(account => ({
    id: account.id,
    email: account.email,
    name: account.display_name || account.email.split('@')[0],
    avatar: account.avatar_url || '',
    isCurrent: account.id === currentAccountId,
    role: account.role
  }));

  return (
      <div className="min-h-screen p-6 pb-32 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold text-white mb-2 dark:text-white">
              {t('page_title')}
            </h1>
            <p className="text-white/70 dark:text-white/70">
              {t('page_subtitle')}
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
              <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
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
                    ease: "easeInOut"
                  }}
                />

                <div className="text-center z-10">
                  {/* Avatar */}
                  <div className="inline-block mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white/20 flex items-center justify-center mx-auto">
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
                        <User size={64} className="text-white/70" />
                      )}
                    </div>
                    <motion.button
                      onClick={handleAvatarChange}
                      className="mt-2 mx-auto w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Camera size={14} className="sm:w-4 sm:h-4" />
                    </motion.button>
                  </div>

                  {/* User Info */}
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 truncate">
                    {userName}
                  </h2>
                  <p className="text-white/70 mb-4 text-sm sm:text-base truncate">{userEmail}</p>
                  
                  {profile?.role && (
                    <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium text-white capitalize mb-4">
                      {profile.role}
                    </span>
                  )}

                  {/* Tutor Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{earningsData?.stats?.students_count || 0}</div>
                      <div className="text-xs text-white/70">{t('students_taught')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{earningsData?.stats?.courses_sold || 0}</div>
                      <div className="text-xs text-white/70">{t('courses_created')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {earningsData?.stats ? formatEarningsCurrency(earningsData.stats.total_earnings_cents, 'MYR').replace('RM ', '') : '0'}
                      </div>
                      <div className="text-xs text-white/70">{t('total_earnings')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Switcher Card */}
              {storedAccounts.length > 1 && (
                <div className="bg-gradient-to-br from-indigo-600/20 via-blue-600/20 to-cyan-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 mt-6 overflow-hidden">
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
                      ease: "easeInOut"
                    }}
                  />

                  <div className="relative z-10">
                    <motion.button
                      onClick={handleAccountSwitch}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-sm">
                          <Users size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-semibold text-white text-sm sm:text-base">{tProfile('switch_account')}</span>
                          <span className="text-xs text-white/70">
                            {allAccounts.length} {tProfile('accounts').toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: showAccountSwitcher ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight size={16} className="text-white/70 group-hover:text-white/90 transition-colors" />
                      </motion.div>
                    </motion.button>

                    {/* Account List Dropdown */}
                    <AnimatePresence>
                      {showAccountSwitcher && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="overflow-hidden mt-4"
                        >
                          <div className="space-y-2">
                            {/* Show switching loading state */}
                            {isSwitching && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 size={20} className="text-blue-400 animate-spin" />
                                <span className="ml-2 text-sm text-white/70">
                                  {tProfile('switching_account')}
                                </span>
                              </div>
                            )}

                            {/* Show error if any */}
                            {switchError && (
                              <div className="mb-3 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                                <p className="text-xs text-red-300">{switchError}</p>
                              </div>
                            )}

                            {allAccounts.map((account) => (
                              <motion.div
                                key={account.id}
                                className="relative group"
                                whileHover={{ x: 2, scale: 1.01 }}
                              >
                                <button
                                  onClick={() => handleSwitchToAccount(account.id)}
                                  disabled={isSwitching}
                                  className={`w-full flex items-center space-x-3 p-3 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                                    account.isCurrent 
                                      ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 ring-2 ring-emerald-400/50' 
                                      : 'hover:bg-white/10'
                                  } ${isSwitching ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                                    {account.avatar ? (
                                      <Image
                                        src={account.avatar}
                                        alt={account.name}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    ) : (
                                      <UserCircle size={20} className="text-white/70" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center space-x-2">
                                      <div className="text-sm font-semibold text-white truncate">
                                        {account.name}
                                      </div>
                                      {account.role && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                          account.role === 'admin' 
                                            ? 'bg-purple-500/30 text-purple-200'
                                            : account.role === 'tutor'
                                            ? 'bg-blue-500/30 text-blue-200'
                                            : 'bg-gray-500/30 text-gray-200'
                                        }`}>
                                          {account.role}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-white/60 truncate">
                                      {account.email}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {account.isCurrent && (
                                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <Check size={12} className="text-white" />
                                      </div>
                                    )}
                                    {!account.isCurrent && allAccounts.length > 1 && (
                                      <button
                                        onClick={(e) => handleRemoveAccount(account.id, e)}
                                        className="w-5 h-5 rounded-full hover:bg-red-500/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        title={tProfile('remove_account')}
                                      >
                                        <X size={12} className="text-red-400" />
                                      </button>
                                    )}
                                  </div>
                                </button>
                              </motion.div>
                            ))}
                            
                            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3"></div>
                            <motion.button
                              onClick={addAccount}
                              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-cyan-500/20 transition-all duration-200 text-blue-300 group"
                              whileHover={{ x: 2, scale: 1.01 }}
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                                <User size={16} className="text-white" />
                              </div>
                              <span className="text-sm font-semibold">{tProfile('add_account')}</span>
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
              <div className="bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-blue-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
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
                    delay: 1
                  }}
                />

                <div className="z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                      <User size={18} className="sm:w-5 sm:h-5" />
                      {t('personal_info')}
                    </h3>
                    {!isEditing ? (
                      <motion.button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs sm:text-sm font-medium self-start sm:self-auto"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit3 size={14} className="sm:w-4 sm:h-4" />
                        {t('edit')}
                      </motion.button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <motion.button
                          onClick={handleSave}
                          disabled={updateProfileMutation.isPending}
                          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-xs sm:text-sm font-medium"
                          whileHover={{ scale: updateProfileMutation.isPending ? 1 : 1.05 }}
                          whileTap={{ scale: updateProfileMutation.isPending ? 1 : 0.95 }}
                        >
                          <Save size={14} className="sm:w-4 sm:h-4" />
                          {updateProfileMutation.isPending ? 'Saving...' : t('save')}
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-xs sm:text-sm font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X size={14} className="sm:w-4 sm:h-4" />
                          {t('cancel')}
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('display_name')}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('display_name_placeholder')}
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                          {profile?.display_name || t('not_set')}
                        </div>
                      )}
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('full_name')}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('full_name_placeholder')}
                        />
                      ) : (
                        <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                          {(profile as any)?.full_name || t('not_set')}
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        <Mail size={16} className="inline mr-1" />
                        {t('email')}
                      </label>
                      <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/70">
                        {userEmail}
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        <MapPin size={16} className="inline mr-1" />
                        {t('timezone')}
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.timezone}
                          onChange={(e) => setEditForm({...editForm, timezone: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur</option>
                          <option value="Asia/Singapore">Asia/Singapore</option>
                          <option value="Asia/Jakarta">Asia/Jakarta</option>
                          <option value="Asia/Bangkok">Asia/Bangkok</option>
                          <option value="UTC">UTC</option>
                        </select>
                      ) : (
                        <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                          {(profile as any)?.timezone || 'Asia/Kuala_Lumpur'}
                        </div>
                      )}
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        <DollarSign size={16} className="inline mr-1" />
                        {t('preferred_currency')}
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.currency}
                          onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {getProfileSupportedCurrencies().map((curr) => (
                            <option key={curr.code} value={curr.code}>
                              {curr.symbol} {curr.name} ({curr.code})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white">
                          {(() => {
                            const currencyCode = (profile as any)?.currency || profileCurrency?.currency || 'MYR';
                            const currency = getProfileSupportedCurrencies().find(c => c.code === currencyCode);
                            return currency ? `${currency.symbol} ${currency.name} (${currency.code})` : currencyCode;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('bio')}
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder={t('bio_placeholder')}
                      />
                    ) : (
                      <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white min-h-[100px]">
                        {(profile as any)?.bio || t('bio_empty')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Interests Section */}
              {(broadField || subFields.length > 0) && (
                <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
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
                      delay: 2
                    }}
                  />

                  <div className="z-10">
                    <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                      <Award size={20} />
                      {t('interests')}
                    </h3>

                    <div className="space-y-4">
                      {broadField && (
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            {t('main_interest')}
                          </label>
                          <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg">
                            <span className="inline-block px-3 py-1 bg-blue-500/30 rounded-full text-sm font-medium text-white">
                              {broadField}
                            </span>
                          </div>
                        </div>
                      )}

                      {subFields.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            {t('specific_interests')}
                          </label>
                          <div className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg">
                            <div className="flex flex-wrap gap-2">
                              {subFields.map((interest: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-block px-3 py-1 bg-green-500/30 rounded-full text-sm font-medium text-white"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Earnings & Cashflow Section */}
              <div className="bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-amber-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 mb-6 overflow-hidden">
                <div className="z-10">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <DollarSign size={18} className="sm:w-5 sm:h-5" />
                    {t('earnings_cashflow')}
                  </h3>

                  {/* Earnings Stats */}
                  <div className="stats stats-horizontal shadow mb-6 bg-white/10 backdrop-blur-sm">
                    <div className="stat">
                      <div className="stat-title text-white/70">{t('total_earnings')}</div>
                      <div className="stat-value text-yellow-400">
                        {earningsData?.stats ? formatEarningsCurrency(earningsData.stats.total_earnings_cents, earningsData.recent_transactions?.[0]?.currency || 'MYR') : 'RM 0'}
                      </div>
                      <div className="stat-desc text-green-400">
                        ↗︎ +{earningsData?.stats?.growth_percentage || 0}% this month
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title text-white/70">{t('this_month')}</div>
                      <div className="stat-value text-orange-400">
                        {earningsData?.stats ? formatEarningsCurrency(earningsData.stats.monthly_earnings_cents, earningsData.recent_transactions?.[0]?.currency || 'MYR') : 'RM 0'}
                      </div>
                      <div className="stat-desc text-white/60">
                        From {earningsData?.stats?.students_count || 0} students
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title text-white/70">{t('pending_payout')}</div>
                      <div className="stat-value text-amber-400">
                        {earningsData?.stats ? formatEarningsCurrency(earningsData.stats.pending_payout_cents, earningsData.recent_transactions?.[0]?.currency || 'MYR') : 'RM 0'}
                      </div>
                      <div className="stat-desc text-white/60">To be released Dec 1</div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <TrendingUp size={16} />
                      {t('monthly_breakdown')}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {earningsLoading ? (
                        <div className="col-span-full flex justify-center py-8">
                          <Loader2 size={24} className="animate-spin text-white/60" />
                        </div>
                      ) : earningsData?.monthly_breakdown?.length ? (
                        earningsData.monthly_breakdown.map((monthData, index) => (
                          <div key={`${monthData.month}-${monthData.year}`} className="card bg-white/5 border border-white/10">
                            <div className="card-body p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-white/70 text-sm">{monthData.month} {monthData.year}</div>
                                  <div className={`text-2xl font-bold ${
                                    index === 0 ? 'text-yellow-400' : 
                                    index === 1 ? 'text-orange-400' : 'text-amber-400'
                                  }`}>
                                    {formatEarningsCurrency(monthData.total_cents, 'MYR')}
                                  </div>
                                </div>
                                <div className={`badge ${monthData.status === 'current' ? 'badge-success' : 'badge-ghost'}`}>
                                  {monthData.status === 'current' ? t('current_month') : t('paid_month')}
                                </div>
                              </div>
                              <div className="text-white/60 text-xs mt-2">
                                {t('course_sales')}: {formatEarningsCurrency(monthData.course_sales_cents, 'MYR')}<br/>
                                {t('tutoring_income')}: {formatEarningsCurrency(monthData.tutoring_cents, 'MYR')}<br/>
                                {t('commission')}: {formatEarningsCurrency(monthData.commission_cents, 'MYR')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8 text-white/60">
                          No earnings data available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      {t('recent_transactions')}
                    </h4>
                    
                    <div className="space-y-3">
                      {earningsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 size={24} className="animate-spin text-white/60" />
                        </div>
                      ) : earningsData?.recent_transactions?.length ? (
                        earningsData.recent_transactions.slice(0, 5).map((transaction) => (
                          <motion.div
                            key={transaction.id}
                            className="group bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all duration-300"
                            whileHover={{ scale: 1.01, y: -1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between">
                              {/* Left side - Transaction info */}
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center ${
                                  transaction.source_type === 'course_sale' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-teal-500'
                                }`}>
                                  {transaction.source_type === 'course_sale' ? (
                                    <BookOpen size={20} className="text-white" />
                                  ) : (
                                    <Users size={20} className="text-white" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-white font-semibold text-sm truncate group-hover:text-yellow-400 transition-colors">
                                    {getTransactionDisplayName(transaction)}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      transaction.source_type === 'course_sale' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                                    }`}>
                                      {transaction.source_type === 'course_sale' ? t('course_sale') : t('tutoring_session')}
                                    </div>
                                    <span className="text-white/60 text-xs">
                                      {formatTransactionDate(transaction.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right side - Amount and status */}
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-yellow-400 font-bold text-lg">
                                    {formatEarningsCurrency(transaction.amount_cents, transaction.currency)}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    {transaction.currency}
                                  </div>
                                </div>
                                
                                <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                                  transaction.status === 'released' ? 'bg-green-500/20 text-green-300' :
                                  transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    transaction.status === 'released' ? 'bg-green-400' :
                                    transaction.status === 'pending' ? 'bg-yellow-400' :
                                    'bg-gray-400'
                                  }`} />
                                  {transaction.status === 'released' ? 'Paid' : 
                                   transaction.status === 'pending' ? t('status_pending') : 'On Hold'}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <DollarSign size={48} className="text-white/20 mx-auto mb-4" />
                          <p className="text-white/60 text-lg">No recent transactions</p>
                          <p className="text-white/40 text-sm mt-1">Start teaching to earn your first income</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <motion.button 
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowDownToLine size={16} />
                      {t('download_report')}
                    </motion.button>
                    <motion.button 
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-amber-500/25 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CreditCard size={16} />
                      {t('payout_settings')}
                    </motion.button>
                    <motion.button 
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <BarChart2 size={16} />
                      {t('analytics')}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-gray-600/20 via-slate-600/20 to-zinc-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 mb-8 overflow-hidden">
                <div className="z-10">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <Settings size={18} className="sm:w-5 sm:h-5" />
                    {t('quick_actions')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Dashboard */}
                    <motion.button
                      onClick={handleNavigateToDashboard}
                      className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <TrendingUp size={18} className="sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">Dashboard</div>
                        <div className="text-xs sm:text-sm text-white/70 truncate">Teaching Dashboard</div>
                      </div>
                    </motion.button>

                    {/* My Courses */}
                    <motion.button
                      onClick={handleNavigateToCourses}
                      className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <BookOpen size={18} className="sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">My Courses</div>
                        <div className="text-xs sm:text-sm text-white/70 truncate">Teaching Materials</div>
                      </div>
                    </motion.button>

                    {/* Community */}
                    <motion.button
                      onClick={handleNavigateToCommunity}
                      className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Users size={18} className="sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{t('community')}</div>
                        <div className="text-xs sm:text-sm text-white/70 truncate">{t('join_groups')}</div>
                      </div>
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
