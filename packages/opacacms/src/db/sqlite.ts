import { Database } from 'bun:sqlite';
import { BaseDatabaseAdapter } from './adapter';
import type { Collection, FindOptions, PaginatedResult } from '../types';

export class SQLiteAdapter extends BaseDatabaseAdapter {
  name = 'sqlite';
  public readonly db: Database;

  constructor(path: string) {
    super();
    this.db = new Database(path);
  }

  async connect() {
    // Bun:sqlite connect is synchronous but we keep it async for interface compatibility
  }

  async disconnect() {
    this.db.close();
  }

  async create<T>(collection: string, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const query = `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const stmt = this.db.prepare(query);
    return stmt.get(...(values as any[])) as T;
  }

  async find<T>(collection: string, query?: any, options?: FindOptions): Promise<PaginatedResult<T>> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // Advanced Filtering with Operators
    // e.g., { age: { gt: 18 }, name: 'John' }
    if (query && Object.keys(query).length > 0) {
      const filters = Object.entries(query).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle operators: gt, gte, lt, lte, like
          const ops = Object.entries(value as object);
          return ops.map(([op, val]) => {
            params.push(val);
            switch (op) {
              case 'gt': return `${key} > ?`;
              case 'gte': return `${key} >= ?`;
              case 'lt': return `${key} < ?`;
              case 'lte': return `${key} <= ?`;
              case 'like': return `${key} LIKE ?`;
              case 'ne': return `${key} != ?`;
              default: return `${key} = ?`; // Fallback
            }
          }).join(' AND ');
        } else {
          // Simple equality
          params.push(value);
          return `${key} = ?`;
        }
      }).join(' AND ');
      whereClause = ` WHERE ${filters}`;
    }

    // Count Total
    const countSql = `SELECT COUNT(*) as total FROM ${collection}${whereClause}`;
    const totalResult = this.db.query(countSql).get(...(params as any[])) as { total: number };
    const totalDocs = totalResult.total;
    const totalPages = Math.ceil(totalDocs / limit);

    // Fetch Data
    let sql = `SELECT * FROM ${collection}${whereClause}`;

    // Sort
    if (options?.sort) {
      const sortField = options.sort.startsWith('-') ? options.sort.substring(1) : options.sort;
      const order = options.sort.startsWith('-') ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortField} ${order}`;
    } else {
      // Default sort by id desc if available, or rowid
      // Using rowid is safer if ID is not guaranteed but we added ID PRIMARY KEY.
      sql += ` ORDER BY id DESC`;
    }

    sql += ` LIMIT ? OFFSET ?`;
    const docs = this.db.query(sql).all(...[...params, limit, offset]) as T[];

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    };
  }

  async findOne<T>(collection: string, query: any): Promise<T | null> {
    // findOne needs to use find but with limit 1 and we want just the doc
    // But our find() now returns a PaginatedResult.
    // We can just call find with limit 1.
    const result = await this.find<T>(collection, query, { limit: 1 });
    return result.docs[0] || null;
  }

  async update<T>(collection: string, query: any, data: Partial<T>): Promise<T> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const setValues = Object.values(data);

    const whereClause = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(query);

    const sql = `UPDATE ${collection} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const stmt = this.db.prepare(sql);
    return stmt.get(...([...setValues, ...whereValues] as any[])) as T;
  }

  async delete(collection: string, query: any): Promise<boolean> {
    const whereClause = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(query);

    const sql = `DELETE FROM ${collection} WHERE ${whereClause}`;
    this.db.run(sql, ...(whereValues as any[]));
    return true;
  }

  async migrate(collections: Collection[]): Promise<void> {
    for (const collection of collections) {
      const columns = collection.fields.map(field => {
        let type = 'TEXT';
        if (field.type === 'number') type = 'REAL';
        if (field.type === 'boolean') type = 'INTEGER'; // 0 or 1

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

      // Basic ID column
      columns.unshift('id INTEGER PRIMARY KEY AUTOINCREMENT');

      const sql = `CREATE TABLE IF NOT EXISTS ${collection.slug} (${columns.join(', ')});`;
      this.db.run(sql);
    }
  }
}

export function createSQLiteAdapter(path: string) {
  return new SQLiteAdapter(path);
}
