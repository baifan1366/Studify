"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Edit3, Save, X, Mail, Calendar, MapPin, Award, BookOpen, Users, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile, useUpdateProfile } from '@/hooks/profile/use-profile';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function ProfileContent() {
  const t = useTranslations('ProfileContent');
  const { data: userData } = useUser();
  const { data: fullProfileData, isLoading: profileLoading } = useFullProfile(userData?.id || '');
  const updateProfileMutation = useUpdateProfile(userData?.id || '');
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    full_name: '',
    bio: '',
    timezone: '',
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
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

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
                      {t('interests')} {/* You may need to add this to translations */}
                    </h3>

                    <div className="space-y-4">
                      {broadField && (
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            {t('main_interest')} {/* You may need to add this to translations */}
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
                            {t('specific_interests')} {/* You may need to add this to translations */}
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
            </motion.div>
          </div>
        </div>
      </div>
  );
}
