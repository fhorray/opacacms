import { BaseDatabaseAdapter } from './adapter';
import type { Collection } from '../types';

// D1 Interface for typing without needing the full cloudflare types if not available
interface D1Database {
  prepare(query: string): any;
  batch(statements: any[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export class D1Adapter extends BaseDatabaseAdapter {
  name = 'd1';
  private db: D1Database;

  constructor(db: D1Database) {
    super();
    this.db = db;
  }

  async connect() {
    // Cloudflare D1 is always connected
  }

  async disconnect() {
    // Nothing to disconnect
  }

  async create<T>(collection: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    return await this.db.prepare(query).bind(...values).first() as T;
  }

  async find<T>(collection: string, query?: any): Promise<T[]> {
    let sql = `SELECT * FROM ${collection}`;
    const params: any[] = [];

    if (query && Object.keys(query).length > 0) {
      const filters = Object.entries(query).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      }).join(' AND ');
      sql += ` WHERE ${filters}`;
    }

    const { results } = await this.db.prepare(sql).bind(...params).all();
    return results as T[];
  }

  async findOne<T>(collection: string, query: any): Promise<T | null> {
    const results = await this.find<T>(collection, query);
    return results[0] || null;
  }

  async update<T>(collection: string, query: any, data: Partial<T>): Promise<T> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const setValues = Object.values(data);

    const whereClause = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(query);

    const sql = `UPDATE ${collection} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    return await this.db.prepare(sql).bind(...setValues, ...whereValues).first() as T;
  }

  async delete(collection: string, query: any): Promise<boolean> {
    const whereClause = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(query);

    const sql = `DELETE FROM ${collection} WHERE ${whereClause}`;
    await this.db.prepare(sql).bind(...whereValues).run();
    return true;
  }

  async migrate(collections: Collection[]): Promise<void> {
    // For D1, we usually use wrangler d1 migrations
    // But we can implement a basic migrate to create tables if they don't exist
    const statements: any[] = [];

    for (const collection of collections) {
      const columns = collection.fields.map(field => {
        let type = 'TEXT';
        if (field.type === 'number') type = 'REAL';
        if (field.type === 'boolean') type = 'INTEGER';

        let constraints = '';
        if (field.required) constraints += ' NOT NULL';
        if (field.unique) constraints += ' UNIQUE';
        if (field.defaultValue !== undefined) {
          const val = typeof field.defaultValue === 'string' ? `'${field.defaultValue}'` : field.defaultValue;
          constraints += ` DEFAULT ${val}`;
        }

        return `${field.name} ${type}${constraints}`;
      });

      if (collection.timestamps) {
        columns.push('createdAt TEXT DEFAULT CURRENT_TIMESTAMP');
        columns.push('updatedAt TEXT DEFAULT CURRENT_TIMESTAMP');
      }

      columns.unshift('id INTEGER PRIMARY KEY AUTOINCREMENT');

      const sql = `CREATE TABLE IF NOT EXISTS ${collection.slug} (${columns.join(', ')});`;
      statements.push(this.db.prepare(sql));
    }

    if (statements.length > 0) {
      await this.db.batch(statements);
    }
  }
}

export function createD1Adapter(db: D1Database) {
  return new D1Adapter(db);
}
