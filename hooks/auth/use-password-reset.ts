import { useMutation } from '@tanstack/react-query';

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
// Note: Toast messages should be handled in the component using translations
export function useRequestPasswordReset() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
  });
}

// Reset password with token
// Note: Toast messages should be handled in the component using translations
export function useResetPassword() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
  });
}

// Change password for authenticated user
// Note: Toast messages should be handled in the component using translations
export function useChangePassword() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
  });
}
