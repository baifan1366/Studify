import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/profile/use-user';

interface MFASetupData {
  secret: string;
  totpUrl: string;
  backupCodes: string[];
  message: string;
}

interface MFAVerifyData {
  code: string;
}

interface MFADisableData {
  password: string;
  code?: string;
}

// Setup MFA (generate secret and QR code)
export function useMFASetup() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<MFASetupData> => {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to setup MFA');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'MFA 设置准备就绪',
        description: '请使用验证器应用扫描二维码并输入验证码。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'MFA 设置失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Verify and enable MFA
export function useMFAVerify() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MFAVerifyData) => {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify MFA');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '双重验证已启用',
        description: '您的账户现在受到双重验证保护。请妥善保存备用代码。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '验证失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Disable MFA
export function useMFADisable() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MFADisableData) => {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disable MFA');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '双重验证已关闭',
        description: '您的账户双重验证功能已被禁用。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '禁用失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get current MFA status (from user profile)
export function useMFAStatus() {
  const { data: userData } = useUser();
  
  return {
    isEnabled: userData?.profile?.two_factor_enabled || false,
    isLoading: !userData,
    enabledAt: userData?.profile?.totp_enabled_at,
  };
}
