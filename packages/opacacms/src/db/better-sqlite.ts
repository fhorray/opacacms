import Database from 'better-sqlite3';
import { BaseDatabaseAdapter } from './adapter';
import type { Collection } from '../types';

export class BetterSQLiteAdapter extends BaseDatabaseAdapter {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(path: string) {
    super();
    this.dbPath = path;
  }

  get name() {
    return 'better-sqlite3';
  }

  async connect(): Promise<void> {
    this.db = new Database(this.dbPath);
  }

  async disconnect(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private sanitizeValues(values: any[]): any[] {
    return values.map(v => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'undefined') return null;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v;
    });
  }

  async migrate(collections: Collection[]): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    for (const collection of collections) {
      const columns = collection.fields.map((field) => {
        let type = 'TEXT';
        if (field.type === 'number') type = 'REAL';
        if (field.type === 'boolean') type = 'INTEGER';
        return `${field.name} ${type}`;
      });

      if (collection.timestamps) {
        columns.push('createdAt TEXT', 'updatedAt TEXT');
      }

      const sql = `CREATE TABLE IF NOT EXISTS ${collection.slug} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columns.join(', ')})`;
      this.db.exec(sql);
    }
  }

  async create<T>(collection: string, data: Partial<T>): Promise<T> {
    if (!this.db) throw new Error('Database not connected');

    const keys = Object.keys(data);
    const values = this.sanitizeValues(Object.values(data));
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = this.db.prepare(sql).run(...values);

    return { id: result.lastInsertRowid, ...data } as T;
  }

  async find<T>(collection: string, query?: any): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');

    let sql = `SELECT * FROM ${collection}`;
    const params: any[] = [];

    if (query && Object.keys(query).length > 0) {
      const conditions = Object.entries(query).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const sanitizedParams = this.sanitizeValues(params);
    return this.db.prepare(sql).all(...sanitizedParams) as T[];
  }

  async findOne<T>(collection: string, query: any): Promise<T | null> {
    if (!this.db) throw new Error('Database not connected');

    let sql = `SELECT * FROM ${collection}`;
    const params: any[] = [];

    if (typeof query === 'object' && query !== null) {
      const conditions = Object.entries(query).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    } else {
      sql += ` WHERE id = ?`;
      params.push(query);
    }

    sql += ' LIMIT 1';

    const sanitizedParams = this.sanitizeValues(params);
    return (this.db.prepare(sql).get(...sanitizedParams) as T) || null;
  }

  async update<T>(collection: string, query: any, data: Partial<T>): Promise<T> {
    if (!this.db) throw new Error('Database not connected');

    const keys = Object.keys(data);
    const updates = keys.map((key) => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const params: any[] = [];

    let sql = `UPDATE ${collection} SET ${updates}`;

    if (typeof query === 'object' && query !== null) {
      const conditions = Object.entries(query).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    } else {
      sql += ` WHERE id = ?`;
      params.push(query);
    }

    const finalValues = this.sanitizeValues([...values, ...params]);
    this.db.prepare(sql).run(...finalValues);

    const id = (typeof query === 'object' && query !== null) ? query.id : query;
    return this.findOne(collection, id);
  }

  async delete(collection: string, query: any): Promise<boolean> {
    if (!this.db) throw new Error('Database not connected');

    let sql = `DELETE FROM ${collection}`;
    const params: any[] = [];

    if (typeof query === 'object' && query !== null) {
      const conditions = Object.entries(query).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    } else {
      sql += ` WHERE id = ?`;
      params.push(query);
    }

    const sanitizedParams = this.sanitizeValues(params);
    const result = this.db.prepare(sql).run(...sanitizedParams);
    return result.changes > 0;
  }
}

export function createBetterSQLiteAdapter(path: string): BetterSQLiteAdapter {
  return new BetterSQLiteAdapter(path);
}
