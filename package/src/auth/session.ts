import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import type { DatabaseAdapter, Session, User } from '../db/adapter';

// 30 days in milliseconds
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;
// 15 days in milliseconds (threshold for sliding window renewal)
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15;

/**
 * Generates a secure, 20-byte random session token encoded in base32 (without padding).
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Computes the SHA-256 hash of a session token and returns it in lowercase hexadecimal representation.
 */
export function hashToken(token: string): string {
  const tokenBytes = new TextEncoder().encode(token);
  const hashBytes = sha256(tokenBytes);
  return encodeHexLowerCase(hashBytes);
}

/**
 * Creates a new session in the database for the given user, expiring in 30 days.
 */
export async function createSession(
  token: string,
  userId: string,
  db: DatabaseAdapter
): Promise<Session> {
  const sessionId = hashToken(token);
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  };
  await db.createSession(session);
  return session;
}

/**
 * Validates a session token by retrieving it from the database.
 * Deletes expired sessions and implements sliding window renewal (if < 15 days remain).
 */
export async function validateSessionToken(
  token: string,
  db: DatabaseAdapter
): Promise<{ session: Session; user: User } | { session: null; user: null }> {
  const sessionId = hashToken(token);
  const result = await db.findSession(sessionId);
  if (!result) {
    return { session: null, user: null };
  }

  const { session, user } = result;

  if (Date.now() >= session.expiresAt.getTime()) {
    await db.deleteSession(sessionId);
    return { session: null, user: null };
  }

  // Sliding window: renew the expiration time if less than 15 days remain
  if (Date.now() >= session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    session.expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    await db.updateSessionExpiry(sessionId, session.expiresAt);
  }

  return { session, user };
}

/**
 * Invalidates a session token by deleting it from the database.
 */
export async function invalidateSession(token: string, db: DatabaseAdapter): Promise<void> {
  const sessionId = hashToken(token);
  await db.deleteSession(sessionId);
}
