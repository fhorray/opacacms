import type {
  DatabaseAdapter,
  Document,
  QueryOptions,
  Session,
  User,
} from './adapter';

/**
 * In-memory Database Adapter for local development, rapid prototyping, and testing.
 */
export class MemoryDatabaseAdapter implements DatabaseAdapter {
  private collections = new Map<string, Document[]>();
  private sessions = new Map<string, Session>();
  private users = new Map<string, User>();

  private getCollectionList(name: string): Document[] {
    if (!this.collections.has(name)) {
      this.collections.set(name, []);
    }
    return this.collections.get(name)!;
  }

  // --- Collection CRUD operations ---

  async find(collection: string, query?: QueryOptions): Promise<Document[]> {
    let docs = [...this.getCollectionList(collection)];

    // 1. Apply simple filtering (equality check)
    if (query?.where) {
      const keys = Object.keys(query.where);
      docs = docs.filter(doc => {
        return keys.every(key => doc[key] === query.where![key]);
      });
    }

    // 2. Apply sorting
    if (query?.sort) {
      const { field, direction } = query.sort;
      docs.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        const comparison = valA < valB ? -1 : 1;
        return direction === 'asc' ? comparison : -comparison;
      });
    }

    // 3. Apply pagination (offset and limit)
    const offset = query?.offset ?? 0;
    const limit = query?.limit;

    if (limit !== undefined) {
      return docs.slice(offset, offset + limit);
    }
    return docs.slice(offset);
  }

  async findById(collection: string, id: string): Promise<Document | null> {
    const list = this.getCollectionList(collection);
    const doc = list.find(d => d.id === id);
    return doc ? { ...doc } : null;
  }

  async create(collection: string, data: Record<string, unknown>): Promise<Document> {
    const list = this.getCollectionList(collection);
    const now = new Date().toISOString();

    const doc: Document = {
      ...data,
      id: (data.id as string) || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    list.push(doc);
    return { ...doc };
  }

  async update(
    collection: string,
    id: string,
    data: Partial<Record<string, unknown>>
  ): Promise<Document> {
    const list = this.getCollectionList(collection);
    const docIndex = list.findIndex(d => d.id === id);

    if (docIndex === -1) {
      throw new Error(`Document with ID ${id} not found in collection ${collection}`);
    }

    const existing = list[docIndex]!;
    const updated: Document = {
      ...existing,
      ...data,
      id, // guarantee ID is not modified
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    list[docIndex] = updated;
    return { ...updated };
  }

  async delete(collection: string, id: string): Promise<void> {
    const list = this.getCollectionList(collection);
    const docIndex = list.findIndex(d => d.id === id);

    if (docIndex !== -1) {
      list.splice(docIndex, 1);
    }
  }

  async count(collection: string, query?: QueryOptions): Promise<number> {
    const docs = await this.find(collection, query);
    return docs.length;
  }

  // --- Session management operations ---

  async createSession(session: Session): Promise<Session> {
    this.sessions.set(session.id, { ...session });
    return { ...session };
  }

  async findSession(sessionId: string): Promise<{ session: Session; user: User } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const user = this.users.get(session.userId);
    if (!user) return null;

    return {
      session: { ...session },
      user: { ...user },
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.expiresAt = expiresAt;
      this.sessions.set(sessionId, session);
    }
  }

  // --- User management operations ---

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { ...user };
      }
    }
    return null;
  }

  async findUser(userId: string): Promise<User | null> {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  async hasUsers(): Promise<boolean> {
    return this.users.size > 0;
  }
}
export default MemoryDatabaseAdapter;
