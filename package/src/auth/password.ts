import { hash, verify } from '@node-rs/argon2';

/**
 * Hashes a plain-text password using the Argon2id algorithm.
 */
export async function hashPassword(password: string): Promise<string> {
  // Use secure defaults provided by @node-rs/argon2
  return hash(password);
}

/**
 * Verifies a plain-text password against a hashed Argon2id password string.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
