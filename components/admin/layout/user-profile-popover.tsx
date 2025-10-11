"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, ChevronRight, UserCircle, Users, Check, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/profile/use-user';
import { useLogout } from '@/hooks/profile/use-logout';
import { useAccountSwitcher } from '@/hooks/auth/use-account-switcher';
import Image from 'next/image';

interface UserProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export default function UserProfilePopover({ isOpen, onClose, triggerRef }: UserProfilePopoverProps) {
  const t = useTranslations('UserProfile');
  const router = useRouter();
  const pathname = usePathname();
  const { data: userData } = useUser();
  const logoutMutation = useLogout();
  const {
    storedAccounts,
    currentAccountId,
    switchToAccount,
    removeAccount,
    addAccount,
    isSwitching,
    switchError
  } = useAccountSwitcher();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const user = userData;
  const profile = user?.profile;
  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || '';
  const userEmail = user?.email || '';
  const userName = userDisplayName || userEmail?.split('@')[0] || 'Unknown User';
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';


  // Get accounts from the hook - includes current and stored accounts
  const allAccounts = storedAccounts.map(account => ({
    id: account.id,
    email: account.email,
    name: account.display_name || account.email.split('@')[0],
    avatar: account.avatar_url || '',
    isCurrent: account.id === currentAccountId,
    role: account.role
  }));

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleProfileClick = () => {
    const locale = pathname.split('/')[1] || 'en';
    router.push(`/${locale}/admin/profile`);
    onClose();
  };

  const handleSettingsClick = () => {
    const locale = pathname.split('/')[1] || 'en';
    router.push(`/${locale}/admin/settings`);
    onClose();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  const handleAccountSwitch = () => {
    setShowAccountSwitcher(!showAccountSwitcher);
  };

  const handleSwitchToAccount = (accountId: string) => {
    if (accountId === currentAccountId || isSwitching) {
      return; // Already current account or currently switching
    }
    
    const targetAccount = allAccounts.find(acc => acc.id === accountId);
    if (targetAccount) {
      switchToAccount(accountId, targetAccount.email);
      onClose();
    }
  };

  const handleRemoveAccount = (accountId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (accountId !== currentAccountId) {
      removeAccount(accountId);
    }
  };

  const handleAddAccount = () => {
    addAccount();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-slate-600/30 overflow-hidden z-50"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* User Info Section */}
          <div className="p-5 bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
            
            <div className="relative flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-lg">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt="Profile"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <UserCircle size={36} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {userDisplayName && userDisplayName.trim() && userDisplayName !== 'x' ? (
                  <>
                    <h3 className="font-bold text-lg truncate text-white drop-shadow-sm">{userDisplayName}</h3>
                    <p className="text-white/90 text-sm truncate">{userEmail}</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-lg truncate text-white drop-shadow-sm">{userEmail?.split('@')[0] || 'User'}</h3>
                    <p className="text-white/90 text-sm truncate">{userEmail}</p>
                  </>
                )}
                {profile?.role && (
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mt-2 capitalize border border-white/20">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
            {/* Profile */}
            <motion.button
              onClick={handleProfileClick}
              className="w-full flex items-center justify-between px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 rounded-lg transition-all duration-200 group"
              whileHover={{ x: 2, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <User size={16} className="text-white" />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{t('profile')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            </motion.button>

            {/* Settings */}
            <motion.button
              onClick={handleSettingsClick}
              className="w-full flex items-center justify-between px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 rounded-lg transition-all duration-200 group"
              whileHover={{ x: 2, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Settings size={16} className="text-white" />
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{t('settings')}</span>
              </div>
              <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            </motion.button>

            {/* Divider */}
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>

            {/* Account Switcher */}
            <motion.button
              onClick={handleAccountSwitch}
              className="w-full flex items-center justify-between px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/20 rounded-lg transition-all duration-200 group"
              whileHover={{ x: 2, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <Users size={16} className="text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{t('switch_account') || 'Switch Account'}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('account_count', { count: allAccounts.length })}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: showAccountSwitcher ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </motion.div>
            </motion.button>

            {/* Account Switcher Dropdown */}
            <AnimatePresence>
              {showAccountSwitcher && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 backdrop-blur-sm rounded-lg mx-2 mt-2 border border-slate-200/50 dark:border-slate-600/30"
                >
                  <div className="p-3">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 px-2 uppercase tracking-wider">
                      {t('accounts')}
                    </div>
                    
                    {/* Show switching loading state */}
                    {isSwitching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="text-blue-500 animate-spin" />
                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                          {t('switching_account')}
                        </span>
                      </div>
                    )}

                    {/* Show error if any */}
                    {switchError && (
                      <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400">{switchError}</p>
                      </div>
                    )}
                    
                    {allAccounts.map((account) => (
                      <motion.div
                        key={account.id}
                        className="relative group"
                        whileHover={{ x: 2, scale: 1.02 }}
                      >
                        <button
                          onClick={() => handleSwitchToAccount(account.id)}
                          disabled={isSwitching}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                            account.isCurrent 
                              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 ring-2 ring-emerald-200 dark:ring-emerald-700' 
                              : 'hover:bg-white/80 dark:hover:bg-slate-600/50'
                          } ${isSwitching ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-600 flex items-center justify-center ring-2 ring-white/50">
                            {account.avatar ? (
                              <Image
                                src={account.avatar}
                                alt={account.name}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <UserCircle size={16} className="text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {account.name}
                              </div>
                              {account.role && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  account.role === 'admin' 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                    : account.role === 'tutor'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                  {account.role}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
                              <div
                                onClick={(e) => handleRemoveAccount(account.id, e)}
                                className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                                title={t('remove_account')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleRemoveAccount(account.id, e as any);
                                  }
                                }}
                              >
                                <X size={12} className="text-red-500" />
                              </div>
                            )}
                          </div>
                        </button>
                      </motion.div>
                    ))}
                    
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent my-3"></div>
                    <motion.button
                      onClick={handleAddAccount}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 transition-all duration-200 text-blue-600 dark:text-blue-400 group"
                      whileHover={{ x: 2, scale: 1.02 }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold">{t('add_account')}</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-4 py-3 text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 rounded-lg transition-all duration-200 group"
              whileHover={{ x: 2, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              disabled={logoutMutation.isPending}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <LogOut size={16} className="text-white" />
                </div>
                <span className="font-semibold text-red-700 dark:text-red-400">
                  {logoutMutation.isPending ? t('signing_out') : t('sign_out')}
                </span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
