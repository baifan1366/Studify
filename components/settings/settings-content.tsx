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
  Trash2,
  Download,
  Upload,
  Key,
  Database,
  Zap
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'data';

export default function SettingsContent() {
  const t = useTranslations('SettingsContent');
  const { data: userData } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState({
    // Account settings
    twoFactorEnabled: false,
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
    fontSize: 'medium',
    animations: true,
    
    // Data settings
    autoSave: true,
    offlineMode: false
  });

  const user = userData;
  const profile = user?.profile;

  const tabs = [
    { id: 'account', label: t('account'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'privacy', label: t('privacy'), icon: Shield },
    { id: 'appearance', label: t('appearance'), icon: Palette },
    { id: 'language', label: t('language'), icon: Globe },
    { id: 'data', label: t('data'), icon: Database }
  ] as const;

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: t('setting_updated'),
      description: t('setting_updated_desc'),
    });
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            {/* Account Security */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield size={20} />
                {t('account_security')}
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{t('two_factor_auth')}</div>
                    <div className="text-sm text-white/70">{t('two_factor_desc')}</div>
                  </div>
                  <motion.button
                    onClick={() => handleSettingChange('twoFactorEnabled', !settings.twoFactorEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      animate={{ x: settings.twoFactorEnabled ? 26 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{t('email_verification')}</div>
                    <div className="text-sm text-white/70">{user?.email}</div>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Eye size={16} />
                    <span className="text-sm">{t('verified')}</span>
                  </div>
                </div>

                <motion.button
                  className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Key size={16} />
                  {t('change_password')}
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bell size={20} />
              {t('notification_preferences')}
            </h4>
            
            <div className="space-y-4">
              {[
                { key: 'emailNotifications', label: t('email_notifications'), desc: t('email_notifications_desc'), icon: Mail },
                { key: 'pushNotifications', label: t('push_notifications'), desc: t('push_notifications_desc'), icon: Smartphone },
                { key: 'courseUpdates', label: t('course_updates'), desc: t('course_updates_desc'), icon: Bell },
                { key: 'communityUpdates', label: t('community_updates'), desc: t('community_updates_desc'), icon: Bell },
                { key: 'marketingEmails', label: t('marketing_emails'), desc: t('marketing_emails_desc'), icon: Mail }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className="text-white/70" />
                    <div>
                      <div className="font-medium text-white">{item.label}</div>
                      <div className="text-sm text-white/70">{item.desc}</div>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings] ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield size={20} />
              {t('privacy_settings')}
            </h4>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg">
                <div className="font-medium text-white mb-2">{t('profile_visibility')}</div>
                <div className="space-y-2">
                  {['public', 'friends', 'private'].map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={option}
                        checked={settings.profileVisibility === option}
                        onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-white capitalize">{t(option)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {[
                { key: 'showEmail', label: t('show_email'), desc: t('show_email_desc') },
                { key: 'showProgress', label: t('show_progress'), desc: t('show_progress_desc') },
                { key: 'dataCollection', label: t('data_collection'), desc: t('data_collection_desc') }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-sm text-white/70">{item.desc}</div>
                  </div>
                  <motion.button
                    onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings] ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Palette size={20} />
              {t('appearance_settings')}
            </h4>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg">
                <div className="font-medium text-white mb-3">{t('theme')}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: t('light'), icon: Sun },
                    { value: 'dark', label: t('dark'), icon: Moon },
                    { value: 'system', label: t('system'), icon: Monitor }
                  ].map((theme) => (
                    <motion.button
                      key={theme.value}
                      onClick={() => handleSettingChange('theme', theme.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        settings.theme === theme.value 
                          ? 'border-blue-500 bg-blue-500/20' 
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <theme.icon size={20} className="text-white" />
                      <span className="text-sm text-white">{theme.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/10 rounded-lg">
                <div className="font-medium text-white mb-3">{t('font_size')}</div>
                <div className="grid grid-cols-3 gap-3">
                  {['small', 'medium', 'large'].map((size) => (
                    <motion.button
                      key={size}
                      onClick={() => handleSettingChange('fontSize', size)}
                      className={`p-3 rounded-lg border-2 transition-colors capitalize ${
                        settings.fontSize === size 
                          ? 'border-blue-500 bg-blue-500/20' 
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-white">{t(size)}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                <div>
                  <div className="font-medium text-white">{t('animations')}</div>
                  <div className="text-sm text-white/70">{t('animations_desc')}</div>
                </div>
                <motion.button
                  onClick={() => handleSettingChange('animations', !settings.animations)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.animations ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full"
                    animate={{ x: settings.animations ? 26 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe size={20} />
              {t('language_settings')}
            </h4>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/10 rounded-lg">
                <div className="font-medium text-white mb-3">{t('interface_language')}</div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database size={20} />
              {t('data_management')}
            </h4>
            
            <div className="space-y-4">
              {[
                { key: 'autoSave', label: t('auto_save'), desc: t('auto_save_desc') },
                { key: 'offlineMode', label: t('offline_mode'), desc: t('offline_mode_desc') }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-white/10 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-sm text-white/70">{item.desc}</div>
                  </div>
                  <motion.button
                    onClick={() => handleSettingChange(item.key, !settings[item.key as keyof typeof settings])}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings] ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      animate={{ x: settings[item.key as keyof typeof settings] ? 26 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>
              ))}

              <div className="space-y-3">
                <motion.button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={16} />
                  {t('export_data')}
                </motion.button>

                <motion.button
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
    <AnimatedBackground>
      <div className="min-h-screen p-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/30 rounded-full blur-xl"
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
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings size={20} />
                    {t('settings')}
                  </h3>
                  
                  <nav className="space-y-2">
                    {tabs.map((tab) => (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                        whileHover={{ x: activeTab === tab.id ? 0 : 4 }}
                        transition={{ duration: 0.1 }}
                      >
                        <tab.icon size={18} />
                        {tab.label}
                      </motion.button>
                    ))}
                  </nav>
                </div>
              </div>
            </motion.div>

            {/* Settings Content */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-blue-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    className="absolute -bottom-4 -left-4 w-20 h-20 bg-emerald-500/30 rounded-full blur-xl"
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
                </div>

                <div className="relative z-10">
                  {renderTabContent()}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
