import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryAccount {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
  quotaExceeded: boolean;
  lastUsed?: Date;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  hls_streaming_url?: string;
  format: string;
  resource_type: string;
  bytes: number;
  duration?: number;
}

export interface CloudinaryError extends Error {
  http_code?: number;
  error?: {
    message: string;
    http_code: number;
  };
}

/**
 * CloudinaryManager handles multiple Cloudinary accounts with automatic switching
 * when quota limits are exceeded (HTTP 420/429 errors)
 */
export class CloudinaryManager {
  private accounts: CloudinaryAccount[] = [];
  private currentAccountIndex = 0;
  private maxRetries = 3;

  constructor() {
    this.initializeAccounts();
  }

  /**
   * Initialize Cloudinary accounts from environment variables
   */
  private initializeAccounts(): void {
    const accountConfigs = [
      {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME_1,
        apiKey: process.env.CLOUDINARY_API_KEY_1,
        apiSecret: process.env.CLOUDINARY_API_SECRET_1,
      },
      {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME_2,
        apiKey: process.env.CLOUDINARY_API_KEY_2,
        apiSecret: process.env.CLOUDINARY_API_SECRET_2,
      },
      {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME_3,
        apiKey: process.env.CLOUDINARY_API_KEY_3,
        apiSecret: process.env.CLOUDINARY_API_SECRET_3,
      },
    ];

    this.accounts = accountConfigs
      .filter(config => config.cloudName && config.apiKey && config.apiSecret)
      .map(config => ({
        cloudName: config.cloudName!,
        apiKey: config.apiKey!,
        apiSecret: config.apiSecret!,
        isActive: true,
        quotaExceeded: false,
      }));

    if (this.accounts.length === 0) {
      throw new Error('No valid Cloudinary accounts found. Please set environment variables for at least one account.');
    }

  }

  /**
   * Configure Cloudinary SDK with the current account
   */
  private configureCloudinary(account: CloudinaryAccount): void {
    cloudinary.config({
      cloud_name: account.cloudName,
      api_key: account.apiKey,
      api_secret: account.apiSecret,
      secure: true,
    });
  }

  /**
   * Get the next available account
   */
  private getNextAccount(): CloudinaryAccount | null {
    const availableAccounts = this.accounts.filter(acc => acc.isActive && !acc.quotaExceeded);
    
    if (availableAccounts.length === 0) {
      return null;
    }

    // Find the least recently used account
    const sortedAccounts = availableAccounts.sort((a, b) => {
      if (!a.lastUsed) return -1;
      if (!b.lastUsed) return 1;
      return a.lastUsed.getTime() - b.lastUsed.getTime();
    });

    return sortedAccounts[0];
  }

  /**
   * Switch to the next available account
   */
  private switchAccount(): boolean {
    const nextAccount = this.getNextAccount();
    
    if (!nextAccount) {
      console.error('No available Cloudinary accounts remaining');
      return false;
    }

    const accountIndex = this.accounts.findIndex(acc => acc.cloudName === nextAccount.cloudName);
    this.currentAccountIndex = accountIndex;
    
    return true;
  }

  /**
   * Mark current account as quota exceeded and switch to next account
   */
  private handleQuotaExceeded(): boolean {
    const currentAccount = this.accounts[this.currentAccountIndex];
    if (currentAccount) {
      currentAccount.quotaExceeded = true;
      console.warn(`Account ${currentAccount.cloudName} quota exceeded`);
    }

    return this.switchAccount();
  }

  /**
   * Check if error indicates quota exceeded
   */
  private isQuotaError(error: CloudinaryError): boolean {
    const httpCode = error.http_code || error.error?.http_code;
    return httpCode === 420 || httpCode === 429;
  }

  /**
   * Reset quota status for all accounts (call this periodically, e.g., daily)
   */
  public resetQuotaStatus(): void {
    this.accounts.forEach(account => {
      account.quotaExceeded = false;
    });
  }

  /**
   * Upload video to Cloudinary with automatic HLS processing
   */
  public async uploadVideo(
    buffer: Buffer,
    options: {
      public_id?: string;
      folder?: string;
      resource_type?: 'video' | 'auto';
      transformation?: any[];
    } = {}
  ): Promise<CloudinaryUploadResult> {
    let lastError: CloudinaryError | null = null;
    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      const currentAccount = this.accounts[this.currentAccountIndex];
      
      if (!currentAccount || !currentAccount.isActive || currentAccount.quotaExceeded) {
        if (!this.switchAccount()) {
          throw new Error('No available Cloudinary accounts');
        }
        continue;
      }

      try {
        // Configure Cloudinary with current account
        this.configureCloudinary(currentAccount);
        
        // Update last used timestamp
        currentAccount.lastUsed = new Date();

        // Upload video with HLS streaming enabled
        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: options.resource_type || 'video',
              public_id: options.public_id,
              folder: options.folder || 'studify-videos',
              streaming_profile: 'hd', // Enable HLS streaming
              eager: [
                { streaming_profile: 'hd', format: 'm3u8' }, // Generate HLS playlist
                { width: 1280, height: 720, crop: 'limit', quality: 'auto', format: 'mp4' }, // Fallback MP4
              ],
              eager_async: false, // Wait for processing to complete
              transformation: options.transformation,
              overwrite: true,
              invalidate: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          ).end(buffer);
        });

        // Extract HLS streaming URL
        const hlsUrl = this.extractHlsUrl(uploadResult);

        const result: CloudinaryUploadResult = {
          public_id: uploadResult.public_id,
          secure_url: uploadResult.secure_url,
          hls_streaming_url: hlsUrl,
          format: uploadResult.format,
          resource_type: uploadResult.resource_type,
          bytes: uploadResult.bytes,
          duration: uploadResult.duration,
        };

        return result;

      } catch (error) {
        const cloudinaryError = error as CloudinaryError;
        lastError = cloudinaryError;
        
        console.error(`Upload failed with account ${currentAccount.cloudName}:`, cloudinaryError.message);

        // Check if it's a quota error
        if (this.isQuotaError(cloudinaryError)) {
          console.warn(`Quota exceeded for account ${currentAccount.cloudName}, switching accounts...`);
          
          if (!this.handleQuotaExceeded()) {
            throw new Error('All Cloudinary accounts have exceeded their quota');
          }
          
          retryCount++;
          continue;
        }

        // For non-quota errors, try next account after a few retries
        retryCount++;
        if (retryCount < this.maxRetries) {
          if (!this.switchAccount()) {
            break;
          }
        }
      }
    }

    throw new Error(`Video upload failed after ${this.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Extract HLS streaming URL from Cloudinary upload result
   */
  private extractHlsUrl(uploadResult: any): string | undefined {
    // Check if eager transformations include HLS
    if (uploadResult.eager && Array.isArray(uploadResult.eager)) {
      const hlsTransformation = uploadResult.eager.find((eager: any) => 
        eager.format === 'm3u8' || eager.secure_url?.includes('.m3u8')
      );
      
      if (hlsTransformation) {
        return hlsTransformation.secure_url;
      }
    }

    // Fallback: construct HLS URL manually
    if (uploadResult.public_id) {
      const baseUrl = `https://res.cloudinary.com/${this.accounts[this.currentAccountIndex].cloudName}/video/upload`;
      return `${baseUrl}/sp_hd/${uploadResult.public_id}.m3u8`;
    }

    return undefined;
  }

  /**
   * Delete video from Cloudinary
   */
  public async deleteVideo(publicId: string): Promise<void> {
    const currentAccount = this.accounts[this.currentAccountIndex];
    
    if (!currentAccount) {
      throw new Error('No active Cloudinary account');
    }

    this.configureCloudinary(currentAccount);

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (error) {
      console.error(`Failed to delete video from Cloudinary: ${publicId}`, error);
      throw error;
    }
  }

  /**
   * Get account status information
   */
  public getAccountStatus(): { total: number; active: number; quotaExceeded: number } {
    return {
      total: this.accounts.length,
      active: this.accounts.filter(acc => acc.isActive && !acc.quotaExceeded).length,
      quotaExceeded: this.accounts.filter(acc => acc.quotaExceeded).length,
    };
  }

  /**
   * Get current account information
   */
  public getCurrentAccount(): CloudinaryAccount | null {
    return this.accounts[this.currentAccountIndex] || null;
  }
}

// Export singleton instance
export const cloudinaryManager = new CloudinaryManager();
