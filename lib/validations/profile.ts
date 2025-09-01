import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().max(100, 'Display name must be less than 100 characters').optional().nullable(),
  email: z.string().email('Must be a valid email').optional().nullable(),
});

export const profileUpdateSchema = profileSchema.partial();