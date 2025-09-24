// hooks/auth/use-account-switcher.ts

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AccountStorageManager, StoredAccount } from '@/utils/auth/account-storage';
import { useUser } from '@/hooks/profile/use-user';

interface SwitchAccountParams {
  accountId: string;
  email?: string;
}

const switchAccountAPI = async ({ accountId, email }: SwitchAccountParams) => {
  const response = await fetch('/api/auth/switch-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_user_id: accountId,
      email: email
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to switch account');
  }

  return response.json();
};

export const useAccountSwitcher = () => {
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);
  const { data: currentUser } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Load stored accounts on mount
  useEffect(() => {
    const accounts = AccountStorageManager.getStoredAccounts();
    setStoredAccounts(accounts);
  }, []);

  // Update current account info when user data changes
  useEffect(() => {
    if (currentUser?.profile) {
      const profile = currentUser.profile;
      AccountStorageManager.storeAccount({
        id: profile.user_id,
        email: currentUser.email || '',
        display_name: profile.display_name || undefined,
        avatar_url: profile.avatar_url || undefined,
        role: profile.role as 'student' | 'tutor' | 'admin',
        last_login: new Date().toISOString()
      });

      // Refresh local state
      const accounts = AccountStorageManager.getStoredAccounts();
      setStoredAccounts(accounts);
    }
  }, [currentUser]);

  const switchAccountMutation = useMutation({
    mutationFn: switchAccountAPI,
    onSuccess: async (data) => {
      // Update current account in storage
      AccountStorageManager.setCurrentAccount(data.user.id);
      
      // Clear all cached user data
      queryClient.clear();
      
      // Refresh stored accounts list
      const accounts = AccountStorageManager.getStoredAccounts();
      setStoredAccounts(accounts);

      // Check if the switched user needs onboarding (from API response)
      if (data.needsOnboarding) {
        // Redirect to appropriate onboarding page with locale
        const userRole = data.user.role || 'student';
        const currentLocale = window.location.pathname.split('/')[1] || 'en';
        router.push(`/${currentLocale}/${userRole}`);
      } else {
        // Redirect to home for completed users with locale
        const currentLocale = window.location.pathname.split('/')[1] || 'en';
        router.push(`/${currentLocale}/home`);
      }
      router.refresh();
    },
    onError: (error) => {
      console.error('Account switch failed:', error);
    }
  });

  const switchToAccount = (accountId: string, email?: string) => {
    if (accountId === currentUser?.profile?.user_id || accountId === currentUser?.id) {
      return; // Already current account
    }
    
    switchAccountMutation.mutate({ accountId, email });
  };

  const removeAccount = (accountId: string) => {
    if (accountId === currentUser?.profile?.user_id || accountId === currentUser?.id) {
      // Can't remove current account, user should logout instead
      return;
    }
    
    AccountStorageManager.removeAccount(accountId);
    const accounts = AccountStorageManager.getStoredAccounts();
    setStoredAccounts(accounts);
  };

  const addAccount = () => {
    // Redirect to login with add mode, respecting current locale
    const currentPath = window.location.pathname;
    const currentLocale = window.location.pathname.split('/')[1] || 'en';
    router.push(`/${currentLocale}/sign-in?mode=add&redirect=${encodeURIComponent(currentPath)}`);
  };

  // Handle login success for account addition
  const handleLoginSuccess = (responseData: any) => {
    if (responseData.accountInfo && responseData.mode === 'add') {
      // Store the new account
      const { accountInfo } = responseData;
      AccountStorageManager.storeAccount({
        id: accountInfo.id,
        email: accountInfo.email,
        display_name: accountInfo.display_name,
        avatar_url: accountInfo.avatar_url,
        role: accountInfo.role,
        last_login: accountInfo.last_login
      });

      // Refresh accounts list
      const accounts = AccountStorageManager.getStoredAccounts();
      setStoredAccounts(accounts);
    }
  };

  return {
    storedAccounts,
    currentAccountId: currentUser?.profile?.user_id || currentUser?.id || null,
    switchToAccount,
    removeAccount,
    addAccount,
    handleLoginSuccess,
    isSwitching: switchAccountMutation.isPending,
    switchError: switchAccountMutation.error?.message || null,
  };
};
