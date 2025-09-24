"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  Download,
  QrCode,
  Key,
  Shield
} from 'lucide-react';
import { useMFASetup, useMFAVerify } from '@/hooks/auth/use-mfa';
import { useToast } from '@/hooks/use-toast';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [setupData, setSetupData] = useState<any>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  
  const mfaSetup = useMFASetup();
  const mfaVerify = useMFAVerify();
  const { toast } = useToast();

  const handleSetup = async () => {
    try {
      const data = await mfaSetup.mutateAsync();
      setSetupData(data);
      setStep('verify');
    } catch (error) {
      console.error('Setup error:', error);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: '验证码错误',
        description: '请输入6位验证码',
        variant: 'destructive',
      });
      return;
    }

    try {
      await mfaVerify.mutateAsync({ code: verifyCode });
      setStep('success');
    } catch (error) {
      console.error('Verify error:', error);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast({
        title: '密钥已复制',
        description: '密钥已复制到剪贴板',
      });
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backupCodes) {
      const content = `Studify 双重验证备用代码\n生成时间: ${new Date().toLocaleString()}\n\n${setupData.backupCodes.join('\n')}\n\n请妥善保存这些代码，每个代码只能使用一次。`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'studify-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      setBackupCodesSaved(true);
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
    setStep('setup');
    setSetupData(null);
    setVerifyCode('');
    setBackupCodesSaved(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-blue-500" />
              设置双重验证
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'setup' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Smartphone size={48} className="mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    启用双重验证
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    使用验证器应用（如 Google Authenticator、Authy）为您的账户添加额外安全保护
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">推荐应用：</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Google Authenticator</li>
                    <li>• Microsoft Authenticator</li>
                    <li>• Authy</li>
                    <li>• 1Password</li>
                  </ul>
                </div>

                <motion.button
                  onClick={handleSetup}
                  disabled={mfaSetup.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {mfaSetup.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <QrCode size={16} />
                  )}
                  开始设置
                </motion.button>
              </div>
            )}

            {step === 'verify' && setupData && (
              <div className="space-y-6">
                <div className="text-center">
                  <QrCode size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    扫描二维码
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    在验证器应用中扫描二维码或手动输入密钥
                  </p>
                </div>

                {/* TODO: Display actual QR code when qrcode library is installed */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <QrCode size={120} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500">二维码显示区域</p>
                  <p className="text-xs text-gray-400 mt-2">需要安装 qrcode 库才能显示</p>
                </div>

                {/* Manual secret */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    手动输入密钥：
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={setupData.secret}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono"
                    />
                    <motion.button
                      onClick={copySecret}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      whileTap={{ scale: 0.95 }}
                    >
                      {copiedSecret ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </motion.button>
                  </div>
                </div>

                {/* Verification code input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    输入验证码：
                  </label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="输入6位验证码"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center text-lg font-mono tracking-wider"
                  />
                </div>

                <motion.button
                  onClick={handleVerify}
                  disabled={mfaVerify.isPending || verifyCode.length !== 6}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {mfaVerify.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Key size={16} />
                  )}
                  验证并启用
                </motion.button>
              </div>
            )}

            {step === 'success' && setupData && (
              <div className="space-y-6">
                <div className="text-center">
                  <Check size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    双重验证已启用
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    您的账户现在受到双重验证保护
                  </p>
                </div>

                {/* Backup codes */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                        重要：保存备用代码
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        这些备用代码可以在您无法使用验证器应用时访问账户。请妥善保存，每个代码只能使用一次。
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono bg-white dark:bg-gray-800 p-3 rounded border">
                        {setupData.backupCodes?.map((code: string, index: number) => (
                          <div key={index} className="py-1">{code}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={downloadBackupCodes}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Download size={16} />
                  下载备用代码
                </motion.button>

                <motion.button
                  onClick={handleComplete}
                  disabled={!backupCodesSaved}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  完成设置
                </motion.button>

                {!backupCodesSaved && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    请先下载备用代码再完成设置
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
