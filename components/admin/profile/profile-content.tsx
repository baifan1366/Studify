"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Edit3, Save, X, Mail, Calendar, MapPin, Award, BookOpen, Users, Settings, Shield, Key, Crown, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { useFullProfile, useUpdateProfile } from '@/hooks/profile/use-profile';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useAdminRolesById, useAdminRolesWithDetails } from '@/hooks/role-based/use-admin-roles';

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
  const { data: adminRolesData } = useAdminRolesById(userData?.id || '');
  const { data: adminRolesWithDetails, isLoading: adminRolesLoading } = useAdminRolesWithDetails(userData?.id);

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
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
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

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8">
          {/* Profile Card */}
          <motion.div
            className="w-full lg:w-80 lg:flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="inline-block mb-4 relative">
                  <div className="w-24 sm:w-32 h-24 sm:h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto border-4 border-gray-200 dark:border-gray-600">
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
                      <User size={48} className="text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <motion.button
                    onClick={handleAvatarChange}
                    className="absolute bottom-1 right-1 w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera size={14} className="sm:w-4 sm:h-4" />
                  </motion.button>
                </div>

                {/* User Info */}
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {userName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base break-all">{userEmail}</p>
                
                {profile?.role && (
                  <span className="inline-block px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-full text-sm font-medium text-blue-800 dark:text-blue-200 capitalize mb-4">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="flex-1 min-w-0 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={20} />
                  {t('personal_info')}
                </h3>
                {!isEditing ? (
                  <motion.button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Edit3 size={16} />
                    {t('edit')}
                  </motion.button>
                ) : (
                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
                      whileHover={{ scale: updateProfileMutation.isPending ? 1 : 1.02 }}
                      whileTap={{ scale: updateProfileMutation.isPending ? 1 : 0.98 }}
                    >
                      <Save size={16} />
                      {updateProfileMutation.isPending ? 'Saving...' : t('save')}
                    </motion.button>
                    <motion.button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X size={16} />
                      {t('cancel')}
                    </motion.button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('display_name')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                      placeholder={t('display_name_placeholder')}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {profile?.display_name || t('not_set')}
                    </div>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('full_name')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                      placeholder={t('full_name_placeholder')}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {(profile as any)?.full_name || t('not_set')}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail size={16} className="inline mr-1" />
                    {t('email')}
                  </label>
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 break-all">
                    {userEmail}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin size={16} className="inline mr-1" />
                    {t('timezone')}
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.timezone}
                      onChange={(e) => setEditForm({...editForm, timezone: e.target.value})}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                    >
                      <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                      <option value="Asia/Jakarta">Asia/Jakarta</option>
                      <option value="Asia/Bangkok">Asia/Bangkok</option>
                      <option value="UTC">UTC</option>
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {(profile as any)?.timezone || 'Asia/Kuala_Lumpur'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Role & Permissions Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Shield size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('admin_role_section')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('admin_role_section_subtitle')}
                  </p>
                </div>
              </div>

              {adminRolesLoading || !userData?.id ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              ) : !adminRolesWithDetails || adminRolesWithDetails.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                    <Crown size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('no_admin_role')}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('no_admin_role_desc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-2">
                        <Award size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {adminRolesWithDetails?.length || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('role_count')}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-2">
                        <Key size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {adminRolesWithDetails?.filter(role => !role.is_deleted).length || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('active')} {t('admin_roles')}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-2">
                        <CheckCircle size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set(adminRolesWithDetails?.map(role => role.rolePermissionDetails?.permission?.title).filter(Boolean) || []).size}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('total_permissions')}
                      </div>
                    </div>
                  </div>

                  {/* Role Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={20} />
                      {t('role_permissions')}
                    </h4>
                    
                    <div className="grid gap-4">
                      {(adminRolesWithDetails || []).map((roleData, index) => (
                        <motion.div
                          key={roleData.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index, duration: 0.4 }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                                  <Award size={16} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white">
                                    {roleData.rolePermissionDetails?.role?.title || `${t('role')} #${index + 1}`}
                                  </h5>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Key size={12} />
                                    <span>
                                      {roleData.rolePermissionDetails?.permission?.title || t('permission')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} />
                                  <span>
                                    {t('assigned_at')}: {new Date(roleData.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                !roleData.is_deleted 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700' 
                                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
                              }`}>
                                <CheckCircle size={12} className="mr-1" />
                                {!roleData.is_deleted ? t('active') : t('inactive')}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
