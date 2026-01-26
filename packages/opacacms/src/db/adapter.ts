import type { Collection, DatabaseAdapter } from '../types';

/**
 * BaseDatabaseAdapter is an abstract class that implements the DatabaseAdapter interface.
 * It provides a foundation for database adapters and enforces the implementation of required methods.
 */
export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  abstract name: string;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract create<T>(collection: string, data: Partial<T>): Promise<T>;
  abstract find<T>(collection: string, query?: any): Promise<T[]>;
  abstract findOne<T>(collection: string, query: any): Promise<T | null>;
  abstract update<T>(collection: string, query: any, data: Partial<T>): Promise<T>;
  abstract delete(collection: string, query: any): Promise<boolean>;

  abstract migrate(collections: Collection[]): Promise<void>;
}
