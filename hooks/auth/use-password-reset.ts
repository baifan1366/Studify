import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ResetPasswordRequestData {
  email: string;
  captchaToken: string;
  captchaType?: 'recaptcha' | 'hcaptcha';
}

interface ResetPasswordData {
  token?: string;
  password: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Request password reset
export function useRequestPasswordReset() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ResetPasswordRequestData) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request password reset');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '重置邮件已发送',
        description: data.message || '如果该邮箱存在账户，重置链接已发送到您的邮箱。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '发送失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Reset password with token
export function useResetPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '密码重置成功',
        description: '您的密码已更新，请使用新密码登录。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '重置失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Change password for authenticated user
export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '密码更新成功',
        description: '您的密码已更新。',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '密码更新失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
