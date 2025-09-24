'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MFAVerificationFormProps {
  email: string;
  password: string;
  onVerificationSuccess: (data: any) => void;
  onBack: () => void;
  mode?: string;
  redirectUrl?: string;
}

export default function MFAVerificationForm({
  email,
  password,
  onVerificationSuccess,
  onBack,
  mode,
  redirectUrl
}: MFAVerificationFormProps) {
  const [totpCode, setTotpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const { toast } = useToast();
  const t = useTranslations();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!totpCode.trim()) {
      toast({
        title: t('error'),
        description: t('verification_code_required'),
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          totpCode: totpCode.trim(),
          isBackupCode: useBackupCode,
          mode,
          redirectUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('login_successful'),
          variant: 'default',
        });
        onVerificationSuccess(data);
      } else {
        toast({
          title: t('error'),
          description: data.message || t('verification_failed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      toast({
        title: t('error'),
        description: t('something_went_wrong'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit length
    const cleanValue = value.replace(/\D/g, '').slice(0, useBackupCode ? 8 : 6);
    setTotpCode(cleanValue);
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setTotpCode('');
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('two_factor_verification')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {useBackupCode 
            ? t('enter_backup_code_description')
            : t('enter_verification_code_description')
          }
        </p>
      </div>

      <form onSubmit={handleVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="totp-code">
            {useBackupCode ? t('backup_code') : t('verification_code')}
          </Label>
          <Input
            id="totp-code"
            type="text"
            value={totpCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={useBackupCode ? '12345678' : '123456'}
            maxLength={useBackupCode ? 8 : 6}
            className="text-center text-xl tracking-widest"
            disabled={isVerifying}
            autoComplete="one-time-code"
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {useBackupCode 
              ? t('backup_code_hint')
              : t('totp_code_hint')
            }
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || totpCode.length < (useBackupCode ? 8 : 6)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('verify_and_continue')
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={toggleBackupCode}
            className="w-full"
            disabled={isVerifying}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {useBackupCode ? t('use_authenticator_code') : t('use_backup_code')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full"
            disabled={isVerifying}
          >
            {t('back_to_login')}
          </Button>
        </div>
      </form>

      <div className="text-center mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('mfa_help_text')}
        </p>
      </div>
    </div>
  );
}
