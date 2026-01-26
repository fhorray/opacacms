import type { BetterAuthOptions } from "better-auth";

export type FieldType =
  | 'text'
  | 'number'
  | 'richtext'
  | 'relationship'
  | 'select'
  | 'date'
  | 'boolean'
  | 'array';

export interface Field {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: any;
  validate?: (value: any) => boolean | string;
  access?: AccessConfig;
}

export interface AccessConfig {
  read?: boolean | ((args: any) => boolean);
  create?: boolean | ((args: any) => boolean);
  update?: boolean | ((args: any) => boolean);
  delete?: boolean | ((args: any) => boolean);
}

export interface CollectionHooks {
  beforeCreate?: (data: any) => Promise<any> | any;
  afterCreate?: (doc: any) => Promise<void> | void;
  beforeUpdate?: (data: any) => Promise<any> | any;
  afterUpdate?: (doc: any) => Promise<void> | void;
  beforeDelete?: (id: string) => Promise<void> | void;
  afterDelete?: (id: string) => Promise<void> | void;
}

export interface Collection {
  slug: string;
  fields: Field[];
  timestamps?: boolean;
  auth?: boolean;
  hooks?: CollectionHooks;
  access?: AccessConfig;
}

export interface Global {
  slug: string;
  fields: Field[];
  access?: AccessConfig;
}

export interface OpacaConfig<Resource extends string = string> {
  collections: Collection[];
  globals?: Global[];
  db: DatabaseAdapter;
  admin?: AdminConfig;
  serverURL?: string;
  /**
   * Better Auth configuration options.
   * Plugins specified here will be merged with internal plugins (like admin).
   */
  auth?: BetterAuthOptions;
  /**
   * Role-Based Access Control configuration.
   */
  access?: OpacaAccessConfig<Resource>;
}

export interface OpacaAccessConfig<Resource extends string = string> {
  /**
   * Define roles and their permissions.
   * Key is the role name (e.g., 'editor').
   * Value is a map of resource names to allowed actions.
   */
  roles: Record<string, Partial<Record<Resource | 'user' | 'session', string[]>>>;
}

export interface AdminConfig {
  userCollection?: string;
  disableAdmin?: boolean;
  route?: string;
}

export interface FindOptions {
  limit?: number;
  page?: number;
  sort?: string;
}

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface DatabaseAdapter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // CRUD
  create<T>(collection: string, data: Partial<T>): Promise<T>;
  find<T>(collection: string, query?: any, options?: FindOptions): Promise<PaginatedResult<T>>;
  findOne<T>(collection: string, query: any): Promise<T | null>;
  update<T>(collection: string, query: any, data: Partial<T>): Promise<T>;
  delete(collection: string, query: any): Promise<boolean>;

  // Schema management
  migrate(collections: Collection[]): Promise<void>;
}
