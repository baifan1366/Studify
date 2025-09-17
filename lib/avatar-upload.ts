import { v2 as cloudinary } from 'cloudinary';

// Simple avatar upload utility without the complex CloudinaryManager
export class AvatarUploader {
  constructor() {
    // Configure Cloudinary with primary account
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME_1,
      api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY_1,
      api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET_1,
    });
  }

  async uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            public_id: `avatar_${userId}_${Date.now()}`,
            folder: 'studify/avatars',
            transformation: [
              { width: 200, height: 200, crop: 'fill', gravity: 'face' },
              { quality: 'auto', format: 'auto' }
            ],
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

      return uploadResult.secure_url;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw new Error('Failed to upload avatar to Cloudinary');
    }
  }
}

export const avatarUploader = new AvatarUploader();
