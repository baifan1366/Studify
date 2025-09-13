"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Edit3, Save, X, Mail, Calendar, MapPin, Award, BookOpen, Users, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';
import Image from 'next/image';

export default function ProfileContent() {
  const t = useTranslations('ProfileContent');
  const { data: userData } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    full_name: '',
    bio: '',
    timezone: ''
  });

  const user = userData;
  const profile = user?.profile;
  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || '';
  const userEmail = user?.email || '';
  const userName = userDisplayName || userEmail?.split('@')[0] || 'Unknown User';
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  React.useEffect(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        full_name: (profile as any)?.full_name || '',
        bio: (profile as any)?.bio || '',
        timezone: (profile as any)?.timezone || 'Asia/Kuala_Lumpur'
      });
    }
  }, [profile]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // TODO: Implement profile update API call
    toast({
      title: t('profile_updated'),
      description: t('profile_updated_desc'),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        full_name: (profile as any)?.full_name || '',
        bio: (profile as any)?.bio || '',
        timezone: (profile as any)?.timezone || 'Asia/Kuala_Lumpur'
      });
    }
  };

  const handleAvatarChange = () => {
    // TODO: Implement avatar upload
    toast({
      title: t('avatar_upload'),
      description: t('avatar_upload_desc'),
    });
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                {/* Animated Background Elements */}
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

                <div className="relative z-10 text-center">
                  {/* Avatar */}
                  <div className="relative inline-block mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 flex items-center justify-center mx-auto">
                      {userAvatar ? (
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
                      className="absolute bottom-2 right-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Camera size={16} />
                    </motion.button>
                  </div>

                  {/* User Info */}
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {userName}
                  </h2>
                  <p className="text-white/70 mb-4">{userEmail}</p>
                  
                  {profile?.role && (
                    <span className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm font-medium text-white capitalize mb-4">
                      {profile.role}
                    </span>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{(profile as any)?.points || 0}</div>
                      <div className="text-xs text-white/70">{t('points')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">12</div>
                      <div className="text-xs text-white/70">{t('courses')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">5</div>
                      <div className="text-xs text-white/70">{t('achievements')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {/* Personal Information */}
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <User size={20} />
                      {t('personal_info')}
                    </h3>
                    {!isEditing ? (
                      <motion.button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Edit3 size={16} />
                        {t('edit')}
                      </motion.button>
                    ) : (
                      <div className="flex gap-2">
                        <motion.button
                          onClick={handleSave}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Save size={16} />
                          {t('save')}
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X size={16} />
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

              {/* Quick Actions */}
              <div className="relative bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-red-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6">
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Settings size={20} />
                    {t('quick_actions')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.button
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <BookOpen size={20} className="text-blue-400" />
                      <div className="text-left">
                        <div className="font-medium">{t('my_courses')}</div>
                        <div className="text-sm text-white/70">{t('view_enrolled')}</div>
                      </div>
                    </motion.button>

                    <motion.button
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Award size={20} className="text-yellow-400" />
                      <div className="text-left">
                        <div className="font-medium">{t('achievements')}</div>
                        <div className="text-sm text-white/70">{t('view_badges')}</div>
                      </div>
                    </motion.button>

                    <motion.button
                      className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Users size={20} className="text-green-400" />
                      <div className="text-left">
                        <div className="font-medium">{t('community')}</div>
                        <div className="text-sm text-white/70">{t('join_groups')}</div>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
