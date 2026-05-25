import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Table storing admin dashboard users
export const adminUsersTable = sqliteTable('opaca_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('editor'),
  createdAt: text('created_at').notNull(), // ISO-8601 string representation
});

// Table storing Oslo.js opaque session mappings
export const sessionsTable = sqliteTable('opaca_sessions', {
  id: text('id').primaryKey(), // SHA-256 hash of session token
  userId: text('user_id').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

// Table storing global singletons
export const globalsTable = sqliteTable('opaca_globals', {
  slug: text('slug').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Table storing document versions history
export const versionsTable = sqliteTable('opaca_versions', {
  id: text('id').primaryKey(),
  collection: text('collection').notNull(),
  documentId: text('document_id').notNull(),
  version: text('version').notNull(), // JSON string of the document state
  createdAt: text('created_at').notNull(),
});

// Raw SQL helper statements to synchronize built-in tables
export const CREATE_ADMIN_USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS opaca_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL
);
`;

export const CREATE_SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS opaca_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`;

export const CREATE_GLOBALS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS opaca_globals (
  slug TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_VERSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS opaca_versions (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  document_id TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;


