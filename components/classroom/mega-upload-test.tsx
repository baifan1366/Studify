"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { uploadToMegaClient } from '@/lib/mega-client';

interface UploadResult {
  success: boolean;
  url?: string;
  size?: number;
  type?: string;
  error?: string;
}

export function MegaUploadTest() {
  const t = useTranslations('MegaUploadTest');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const uploadResult = await uploadToMegaClient(file, {
        onProgress: (progress) => {
          setProgress(progress);
        }
      });

      setResult({
        success: true,
        url: uploadResult.url,
        size: uploadResult.size,
        type: uploadResult.type
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          MEGA Upload Test
        </CardTitle>
        <CardDescription>
          Test client-side file upload to MEGA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div>
          <Input
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        {/* Selected File Info */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('uploading')} {progress}%
            </div>
            <Progress value={progress} className="w-full" />
          </motion.div>
        )}

        {/* Upload Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                {result.success ? (
                  <div>
                    <p className="font-medium text-green-800 mb-1">{t('upload_success')}</p>
                    <p className="text-sm text-green-700 mb-2">File uploaded to MEGA</p>
                    <div className="space-y-1 text-xs text-green-600">
                      <p><strong>Size:</strong> {((result.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>Type:</strong> {result.type}</p>
                      <p className="break-all"><strong>URL:</strong> {result.url}</p>
                    </div>
                    {result.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => window.open(result.url, '_blank')}
                      >
                        {t('open_file')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-red-800 mb-1">{t('upload_failed')}</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('uploading')}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {t('upload')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
