export interface Document {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface QueryOptions {
  where?: Record<string, any>; // simple equality filters, e.g. { authorId: "123" }
  limit?: number;
  offset?: number;
  sort?: { field: string; direction: 'asc' | 'desc' };
  locale?: string;
  draft?: boolean;
}

export interface Session {
  id: string; // SHA-256 hash of the session token
  userId: string;
  expiresAt: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

/**
 * Universal Database Adapter interface for OpacaCMS.
 */
export interface DatabaseAdapter {
  // Collection CRUD operations
  find(collection: string, query?: QueryOptions): Promise<Document[]>;
  findById(collection: string, id: string): Promise<Document | null>;
  create(collection: string, data: Record<string, unknown>): Promise<Document>;
  update(
    collection: string,
    id: string,
    data: Partial<Record<string, unknown>>
  ): Promise<Document>;
  delete(collection: string, id: string): Promise<void>;
  count(collection: string, query?: QueryOptions): Promise<number>;

  // Globals management
  findGlobal(slug: string): Promise<Record<string, unknown> | null>;
  updateGlobal(slug: string, value: Record<string, unknown>): Promise<Record<string, unknown>>;

  // Versions management
  createVersion(collection: string, documentId: string, version: Record<string, unknown>): Promise<void>;
  findVersions(collection: string, documentId: string): Promise<Document[]>;

  // Session management operations for Oslo.js auth
  createSession(session: Session): Promise<Session>;
  findSession(sessionId: string): Promise<{ session: Session; user: User } | null>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void>;

  // User management operations for auth
  createUser(user: User): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUser(userId: string): Promise<User | null>;
  hasUsers(): Promise<boolean>;

  // Optional schema synchronization
  syncSchema?(): void;
}
export default DatabaseAdapter;

