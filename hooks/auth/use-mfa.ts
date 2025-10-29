import { useMutation } from '@tanstack/react-query';
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
// Note: Toast messages should be handled in the component using translations
export function useMFASetup() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
  });
}

// Verify and enable MFA
// Note: Toast messages should be handled in the component using translations
export function useMFAVerify() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
  });
}

// Disable MFA
// Note: Toast messages should be handled in the component using translations
export function useMFADisable() {
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
    // onSuccess and onError callbacks removed - handle in component with translations
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
