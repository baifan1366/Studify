import crypto from 'crypto';

/**
 * Hash a classroom password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify a classroom password against a hash
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string): boolean {
  const hashedInput = hashPassword(password);
  return hashedInput === hash;
}
