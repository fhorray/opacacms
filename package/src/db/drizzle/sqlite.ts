import { eq, and, asc, desc, sql } from 'drizzle-orm';
import type { DatabaseAdapter, Document, QueryOptions, Session, User } from '../adapter';
import { adminUsersTable, sessionsTable, CREATE_ADMIN_USERS_TABLE_SQL, CREATE_SESSIONS_TABLE_SQL } from './built-in-tables';
import { generateTableSchema } from './schema-gen';
import { getFieldMeta } from '../../fields/utils';
import type { z } from 'zod';

/**
 * SQLite Database Adapter for OpacaCMS using Drizzle ORM.
 * Supports dynamic schema definition for user collection tables.
 */
export class SQLiteDrizzleAdapter implements DatabaseAdapter {
  private db: any; // Drizzle database instance (e.g. BetterSQLite3Database)
  private tables = new Map<string, any>(); // Map to store dynamic Drizzle tables
  private schemaShapes = new Map<string, Record<string, z.ZodTypeAny>>();
  private sqliteDb: any; // Raw sqlite database instance
  private push: boolean;

  constructor(db: any, options?: { sqliteDb?: any; push?: boolean }) {
    this.db = db;
    this.sqliteDb = options?.sqliteDb;
    this.push = options?.push ?? true;
  }


  /**
   * Registers a collection's Zod schema shape, generating and storing its Drizzle table schema.
   */
  registerCollection(slug: string, schemaShape: Record<string, z.ZodTypeAny>) {
    const table = generateTableSchema(slug, schemaShape);
    this.tables.set(slug, table);
    this.schemaShapes.set(slug, schemaShape);
    return table;
  }

  /**
   * Synchronizes database tables with schemas.
   */
  syncSchema() {
    if (!this.sqliteDb || !this.push) {
      return;
    }

    // 1. Ensure built-in tables exist
    this.sqliteDb.exec(CREATE_ADMIN_USERS_TABLE_SQL);
    this.sqliteDb.exec(CREATE_SESSIONS_TABLE_SQL);

    // 2. Ensure registered collections tables exist
    for (const [slug, shape] of this.schemaShapes) {
      const cols = [
        'id TEXT PRIMARY KEY',
        'created_at TEXT NOT NULL',
        'updated_at TEXT NOT NULL',
      ];

      for (const [key, field] of Object.entries(shape)) {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
        const meta = getFieldMeta(field);
        if (!meta) continue;

        const typeStr = this.getSQLiteColumnType(meta);
        let colDef = `${key} ${typeStr}`;
        if (meta.required) {
          colDef += ' NOT NULL';
        }
        cols.push(colDef);
      }

      const createTableSql = `CREATE TABLE IF NOT EXISTS ${slug} (${cols.join(', ')});`;
      this.sqliteDb.exec(createTableSql);

      // 3. Diff check and alter table for new fields
      let rows: any[] = [];
      if (typeof this.sqliteDb.prepare === 'function') {
        rows = this.sqliteDb.prepare(`PRAGMA table_info(${slug})`).all();
      } else if (typeof this.sqliteDb.query === 'function') {
        rows = this.sqliteDb.query(`PRAGMA table_info(${slug})`).all();
      }

      const columnNames = rows.map((r: any) => r.name);

      for (const [key, field] of Object.entries(shape)) {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
        if (!columnNames.includes(key)) {
          const meta = getFieldMeta(field);
          if (!meta) continue;

          const typeStr = this.getSQLiteColumnType(meta);
          // We do not append NOT NULL here to prevent SQLite failure on existing rows
          const alterSql = `ALTER TABLE ${slug} ADD COLUMN ${key} ${typeStr};`;
          this.sqliteDb.exec(alterSql);
        }
      }
    }
  }

  private getSQLiteColumnType(meta: any): string {
    switch (meta.fieldType) {
      case 'number':
        return 'REAL';
      case 'checkbox':
        return 'INTEGER';
      default:
        return 'TEXT';
    }
  }


  /**
   * Helper to retrieve a collection's dynamic Drizzle table schema.
   */
  private getTable(collection: string) {
    const table = this.tables.get(collection);
    if (!table) {
      throw new Error(`Collection table "${collection}" is not registered in SQLiteDrizzleAdapter.`);
    }
    return table;
  }

  /**
   * Serializes complex JS structures (arrays, objects) to JSON strings for SQLite storage.
   */
  private serializeDoc(collection: string, data: Record<string, any>): Record<string, any> {
    const shape = this.schemaShapes.get(collection);
    if (!shape) return data;

    const serialized: Record<string, any> = { ...data };
    for (const [key, field] of Object.entries(shape)) {
      if (key in data) {
        const meta = getFieldMeta(field);
        if (meta) {
          const complexTypes = ['accordion', 'group', 'array', 'relation', 'multiselect', 'row', 'tabs', 'sidebar'];
          if (complexTypes.includes(meta.fieldType)) {
            if (typeof data[key] === 'object' && data[key] !== null) {
              serialized[key] = JSON.stringify(data[key]);
            }
          } else if (meta.fieldType === 'checkbox') {
            if (typeof data[key] === 'boolean') {
              serialized[key] = data[key] ? 1 : 0;
            }
          }
        }
      }
    }
    return serialized;
  }

  /**
   * Deserializes SQLite TEXT representation of arrays/objects back into JS objects.
   */
  private deserializeDoc(collection: string, data: any): Document {
    if (!data) return data;
    const shape = this.schemaShapes.get(collection);
    if (!shape) return data;

    const deserialized: Record<string, any> = { ...data };
    for (const [key, field] of Object.entries(shape)) {
      if (key in data && data[key] !== null && data[key] !== undefined) {
        const meta = getFieldMeta(field);
        if (meta) {
          const complexTypes = ['accordion', 'group', 'array', 'relation', 'multiselect', 'row', 'tabs', 'sidebar'];
          if (complexTypes.includes(meta.fieldType)) {
            if (typeof data[key] === 'string') {
              try {
                deserialized[key] = JSON.parse(data[key]);
              } catch (e) {
                // If it fails to parse, leave as is
              }
            }
          } else if (meta.fieldType === 'checkbox') {
            deserialized[key] = Boolean(data[key]);
          }
        }
      }
    }
    return deserialized as Document;
  }

  // --- Collection CRUD operations ---

  async find(collection: string, query?: QueryOptions): Promise<Document[]> {
    const table = this.getTable(collection);
    let q = this.db.select().from(table);

    const conditions = [];
    if (query?.where) {
      for (const [key, val] of Object.entries(query.where)) {
        if (table[key] !== undefined) {
          conditions.push(eq(table[key], val));
        }
      }
    }

    if (conditions.length > 0) {
      q = q.where(and(...conditions));
    }

    if (query?.sort) {
      const { field, direction } = query.sort;
      if (table[field] !== undefined) {
        const orderFn = direction === 'desc' ? desc : asc;
        q = q.orderBy(orderFn(table[field]));
      }
    }

    if (query?.limit !== undefined) {
      q = q.limit(query.limit);
    }

    if (query?.offset !== undefined) {
      q = q.offset(query.offset);
    }

    const results = await q;
    return results.map((row: any) => this.deserializeDoc(collection, row));
  }

  async findById(collection: string, id: string): Promise<Document | null> {
    const table = this.getTable(collection);
    const results = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    return results[0] ? this.deserializeDoc(collection, results[0]) : null;
  }

  async create(collection: string, data: Record<string, unknown>): Promise<Document> {
    const table = this.getTable(collection);
    const now = new Date().toISOString();
    const docId = (data.id as string) || crypto.randomUUID();

    const rowToInsert = this.serializeDoc(collection, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now,
    });

    const results = await this.db.insert(table).values(rowToInsert).returning();
    if (!results[0]) {
      throw new Error(`Failed to create document in collection ${collection}`);
    }
    return this.deserializeDoc(collection, results[0]);
  }

  async update(
    collection: string,
    id: string,
    data: Partial<Record<string, unknown>>
  ): Promise<Document> {
    const table = this.getTable(collection);
    const now = new Date().toISOString();

    const rowToUpdate = this.serializeDoc(collection, {
      ...data,
      updatedAt: now,
    });

    // Make sure id cannot be modified
    delete rowToUpdate.id;
    delete rowToUpdate.createdAt;

    const results = await this.db
      .update(table)
      .set(rowToUpdate)
      .where(eq(table.id, id))
      .returning();

    if (!results[0]) {
      throw new Error(`Document with ID ${id} not found in collection ${collection}`);
    }
    return this.deserializeDoc(collection, results[0]);
  }

  async delete(collection: string, id: string): Promise<void> {
    const table = this.getTable(collection);
    await this.db.delete(table).where(eq(table.id, id));
  }

  async count(collection: string, query?: QueryOptions): Promise<number> {
    const table = this.getTable(collection);
    let q = this.db.select({ count: sql<number>`count(*)` }).from(table);

    const conditions = [];
    if (query?.where) {
      for (const [key, val] of Object.entries(query.where)) {
        if (table[key] !== undefined) {
          conditions.push(eq(table[key], val));
        }
      }
    }

    if (conditions.length > 0) {
      q = q.where(and(...conditions));
    }

    const results = await q;
    return results[0]?.count ?? 0;
  }

  // --- Session management operations ---

  async createSession(session: Session): Promise<Session> {
    await this.db.insert(sessionsTable).values({
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
    return session;
  }

  async findSession(sessionId: string): Promise<{ session: Session; user: User } | null> {
    const results = await this.db
      .select({
        session: sessionsTable,
        user: adminUsersTable,
      })
      .from(sessionsTable)
      .innerJoin(adminUsersTable, eq(sessionsTable.userId, adminUsersTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (!results[0]) return null;
    const { session, user } = results[0];

    return {
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
      },
      user: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        createdAt: new Date(user.createdAt),
      },
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }

  async updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(sessionsTable)
      .set({ expiresAt })
      .where(eq(sessionsTable.id, sessionId));
  }

  // --- User management operations ---

  async createUser(user: User): Promise<User> {
    await this.db.insert(adminUsersTable).values({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const results = await this.db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);

    if (!results[0]) return null;
    const user = results[0];

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: new Date(user.createdAt),
    };
  }

  async findUser(userId: string): Promise<User | null> {
    const results = await this.db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, userId))
      .limit(1);

    if (!results[0]) return null;
    const user = results[0];

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: new Date(user.createdAt),
    };
  }

  async hasUsers(): Promise<boolean> {
    const results = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsersTable)
      .limit(1);
    const count = results[0]?.count ?? 0;
    return count > 0;
  }
}
