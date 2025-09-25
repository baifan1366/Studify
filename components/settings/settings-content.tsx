"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Volume2,
  Mail,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Download,
  Upload,
  Key,
  Database,
  Zap,
  X,
  Trash2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile, useUpdateSettings } from '@/hooks/profile/use-profile';
import { useToast } from '@/hooks/use-toast';
import { useFontSize } from '@/context/font-size-context';
import { FontSizeDemo } from './font-size-demo';
import { useMFAStatus, useMFADisable } from '@/hooks/auth/use-mfa';
import { useRequestPasswordReset } from '@/hooks/auth/use-password-reset';
import MFASetupModal from './mfa-setup-modal';
import ChangePasswordModal from './change-password-modal';

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'data';

export default function SettingsContent() {
  const t = useTranslations('SettingsContent');
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile(userData?.profile?.id || '');
  const updateSettingsMutation = useUpdateSettings(userData?.profile?.id || '');
  const { toast } = useToast();
  const { fontSize, setFontSize } = useFontSize();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMFADisable, setShowMFADisable] = useState(false);
  const [mfaDisableCode, setMfaDisableCode] = useState('');
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  
  const mfaStatus = useMFAStatus();
  const mfaDisable = useMFADisable();
  const requestPasswordReset = useRequestPasswordReset();
  
  const [settings, setSettings] = useState({
    // Account settings
    twoFactorEnabled: mfaStatus.isEnabled || false,
    emailVerified: true,
    
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    communityUpdates: false,
    marketingEmails: false,
    
    // Privacy settings
    profileVisibility: 'public',
    showEmail: false,
    showProgress: true,
    dataCollection: true,
    
    // Appearance settings
    theme: 'system',
    language: 'en',
    animations: true,
    
    // Data settings
    autoSave: true,
    offlineMode: false
  });

  const user = userData;
  const profile = fullProfileData?.profile || user?.profile;

  // Load settings from profile data
  React.useEffect(() => {
    if (profile) {
      const notificationSettings = profile.notification_settings || {};
      const privacySettings = profile.privacy_settings || {};
      
      setSettings(prev => ({
        ...prev,
        // Account settings
        twoFactorEnabled: profile.two_factor_enabled || false,
        emailVerified: profile.email_verified || false,
        
        // Notification settings
        emailNotifications: notificationSettings.email_notifications ?? true,
        pushNotifications: notificationSettings.push_notifications ?? true,
        courseUpdates: notificationSettings.course_updates ?? true,
        communityUpdates: notificationSettings.community_updates ?? false,
        marketingEmails: notificationSettings.marketing_emails ?? false,
        
        // Privacy settings
        profileVisibility: privacySettings.profile_visibility || 'public',
        showEmail: privacySettings.show_email ?? false,
        showProgress: privacySettings.show_progress ?? true,
        dataCollection: privacySettings.data_collection ?? true,
        
        // Appearance settings
        theme: profile.theme || 'system',
        language: profile.language || 'en',
      }));
    }
  }, [profile]);

  const tabs = [
    { id: 'account', label: t('account'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'privacy', label: t('privacy'), icon: Shield },
    { id: 'appearance', label: t('appearance'), icon: Palette },
    { id: 'language', label: t('language'), icon: Globe },
    { id: 'data', label: t('data'), icon: Database }
  ] as const;

  const handleSettingChange = async (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Prepare update data based on setting type
    let updateData: any = {};
    
    // Account settings
    if (key === 'twoFactorEnabled') {
      updateData.two_factor_enabled = value;
    }
    
    // Notification settings
    if (['emailNotifications', 'pushNotifications', 'courseUpdates', 'communityUpdates', 'marketingEmails'].includes(key)) {
      const notificationKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData.notification_settings = {
        [notificationKey]: value
      };
    }
    
    // Privacy settings
    if (['profileVisibility', 'showEmail', 'showProgress', 'dataCollection'].includes(key)) {
      const privacyKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateData.privacy_settings = {
        [privacyKey]: value
      };
    }
    
    // Appearance settings
    if (key === 'theme') {
      updateData.theme = value;
    }
    if (key === 'language') {
      updateData.language = value;
    }
    
    try {
      await updateSettingsMutation.mutateAsync(updateData);
      toast({
        title: t('setting_updated'),
        description: t('setting_updated_desc'),
      });
    } catch (error) {
      // Revert the setting if update failed
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast({
        title: t('error'),
        description: t('update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: t('export_started'),
      description: t('export_started_desc'),
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: t('delete_account_warning'),
      description: t('delete_account_warning_desc'),
      variant: "destructive",
    });
  };

  const handleMFAToggle = () => {
    if (mfaStatus.isEnabled) {
      setShowMFADisable(true);
    } else {
      setShowMFASetup(true);
    }
  };

  const handleMFADisable = async () => {
    if (!mfaDisablePassword) {
      toast({
        title: t('password_required'),
        description: t('password_required_desc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await mfaDisable.mutateAsync({
        password: mfaDisablePassword,
        code: mfaDisableCode || undefined
      });
      setShowMFADisable(false);
      setMfaDisablePassword('');
      setMfaDisableCode('');
      // Refresh settings
      window.location.reload();
    } catch (error) {
      console.error('MFA disable error:', error);
    }
  };

  const handleForgotPassword = () => {
    if (user?.email) {
      requestPasswordReset.mutate({ email: user.email });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            {/* Account Security */}
            <div className="space-y-4">
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Shield size={20} />
                {t('account_security')}
              </h4>
              
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {t('two_factor_auth')}
                        {mfaStatus.isEnabled && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                            {t('enabled')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {mfaStatus.isEnabled ? t('mfa_enabled_desc') : t('mfa_disabled_desc')}
                      </div>
                      {mfaStatus.enabledAt && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('enabled_at', { date: new Date(mfaStatus.enabledAt).toLocaleDateString() })}
                        </div>
                      )}
                    </div>
                    <motion.button
                      onClick={handleMFAToggle}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        mfaStatus.isEnabled 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: mfaStatus.isEnabled ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{t('email_verification')}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{user?.email}</div>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 flex-shrink-0">
                      <Eye size={16} />
                      <span className="text-sm font-medium">{t('verified')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.button
                    onClick={() => setShowChangePassword(true)}
                    className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Key size={16} />
                    {t('change_password')}
                  </motion.button>

                  <motion.button
                    onClick={handleForgotPassword}
                    disabled={requestPasswordReset.isPending}
                    className="flex items-center justify-center gap-2 p-4 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {requestPasswordReset.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )}
                    {t('forgot_password')}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Bell size={20} />
              {t('notification_preferences')}
            </h4>
            
            <div className="grid gap-4">
              {[
                { key: 'emailNotifications', label: t('email_notifications'), desc: t('email_notifications_desc'), icon: Mail },
                { key: 'pushNotifications', label: t('push_notifications'), desc: t('push_notifications_desc'), icon: Smartphone },
                { key: 'courseUpdates', label: t('course_updates'), desc: t('course_updates_desc'), icon: Bell },
                { key: 'communityUpdates', label: t('community_updates'), desc: t('community_updates_desc'), icon: Bell },
                { key: 'marketingEmails', label: t('marketing_emails'), desc: t('marketing_emails_desc'), icon: Mail }
              ].map((item) => (
                <div key={item.key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <item.icon size={20} className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</div>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        settings[item.key as keyof typeof settings] 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Shield size={20} />
              {t('privacy_settings')}
            </h4>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-white mb-4">{t('profile_visibility')}</div>
                <div className="space-y-3">
                  {['public', 'friends', 'private'].map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={option}
                        checked={settings.profileVisibility === option}
                        onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-gray-900 dark:text-white capitalize">{t(option)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {[
                { key: 'showEmail', label: t('show_email'), desc: t('show_email_desc') },
                { key: 'showProgress', label: t('show_progress'), desc: t('show_progress_desc') },
                { key: 'dataCollection', label: t('data_collection'), desc: t('data_collection_desc') }
              ].map((item) => (
                <div key={item.key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</div>
                    </div>
                    <motion.button
                      onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        settings[item.key as keyof typeof settings] 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Palette size={20} />
              {t('appearance_settings')}
            </h4>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-white mb-4">{t('theme')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: t('light'), icon: Sun },
                    { value: 'dark', label: t('dark'), icon: Moon },
                    { value: 'system', label: t('system'), icon: Monitor }
                  ].map((theme) => (
                    <motion.button
                      key={theme.value}
                      onClick={() => handleSettingChange('theme', theme.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 ${
                        settings.theme === theme.value 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <theme.icon size={20} />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-white mb-4">{t('font_size')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'small', label: t('small'), preview: 'Aa' },
                    { value: 'medium', label: t('medium'), preview: 'Aa' },
                    { value: 'large', label: t('large'), preview: 'Aa' },
                    { value: 'extra-large', label: t('extra_large'), preview: 'Aa' }
                  ].map((size) => (
                    <motion.button
                      key={size.value}
                      onClick={() => {
                        setFontSize(size.value as any);
                        toast({
                          title: t('font_size_updated'),
                          description: t('font_size_updated_desc'),
                        });
                      }}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        fontSize === size.value 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span 
                          className="font-medium"
                          style={{ 
                            fontSize: size.value === 'small' ? '0.75rem' : 
                                      size.value === 'medium' ? '1rem' : 
                                      size.value === 'large' ? '1.25rem' : '1.5rem' 
                          }}
                        >
                          {size.preview}
                        </span>
                        <span className="text-xs opacity-70">{size.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('font_size_preview')}:</h5>
                  <FontSizeDemo />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white">{t('animations')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('animations_desc')}</div>
                  </div>
                  <motion.button
                    onClick={() => handleSettingChange('animations', !settings.animations)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      settings.animations 
                        ? 'bg-green-500 dark:bg-green-600' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: settings.animations ? 26 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Globe size={20} />
              {t('language_settings')}
            </h4>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                <div className="font-medium text-gray-900 dark:text-white mb-4">{t('interface_language')}</div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ms">Bahasa Malaysia</option>
                  <option value="id">Bahasa Indonesia</option>
                  <option value="th">ไทย</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Database size={20} />
              {t('data_management')}
            </h4>
            
            <div className="space-y-4">
              {[
                { key: 'autoSave', label: t('auto_save'), desc: t('auto_save_desc') },
                { key: 'offlineMode', label: t('offline_mode'), desc: t('offline_mode_desc') }
              ].map((item) => (
                <div key={item.key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.desc}</div>
                    </div>
                    <motion.button
                      onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        settings[item.key as keyof typeof settings] 
                          ? 'bg-green-500 dark:bg-green-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <motion.button
                  onClick={handleExportData}
                  className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Download size={16} />
                  {t('export_data')}
                </motion.button>

                <motion.button
                  onClick={handleDeleteAccount}
                  className="flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Trash2 size={16} />
                  {t('delete_account')}
                </motion.button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-transparent border-gray-400 dark:border-gray-600 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('page_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {t('page_subtitle')}
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Settings Navigation */}
          <motion.div
            className="w-full lg:w-80 lg:flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings size={20} />
                {t('settings')}
              </h3>
              
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <tab.icon size={18} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
              {renderTabContent()}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <MFASetupModal 
        isOpen={showMFASetup} 
        onClose={() => setShowMFASetup(false)}
        onSuccess={() => window.location.reload()}
      />
      
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)}
      />

      {/* MFA Disable Modal */}
      {showMFADisable && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('disable_mfa')}</h2>
              <button
                onClick={() => setShowMFADisable(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">{t('confirm_disable_mfa')}</h4>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {t('disable_mfa_warning')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('current_password')} *</label>
                  <input
                    type="password"
                    value={mfaDisablePassword}
                    onChange={(e) => setMfaDisablePassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('verification_code_optional')}</label>
                  <input
                    type="text"
                    value={mfaDisableCode}
                    onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('verification_code_placeholder')}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowMFADisable(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleMFADisable}
                  disabled={!mfaDisablePassword || mfaDisable.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {mfaDisable.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Shield size={16} />
                  )}
                  {t('disable')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
