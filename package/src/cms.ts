import { Hono } from 'hono';
import type { DatabaseAdapter, Document } from './db/adapter';
import type { CollectionAccess } from './fields/types';
import { createApiRouter } from './api/router';
import { createAdminRouter } from './admin/router';
import { hashPassword } from './auth/password';
import type { z } from 'zod';
import crypto from 'crypto';
import { getFieldMeta } from './fields/utils';
import { populateDocRelations } from './db/populate';

import type * as LucideIcons from 'lucide-react';

export type LucideIconName = keyof typeof LucideIcons;

export interface HookContext {
  data?: Record<string, unknown>;
  req?: any;
  operation: 'create' | 'update' | 'delete' | 'read';
  doc?: Record<string, unknown>;
  id?: string;
}

export type BeforeChangeHook = (ctx: HookContext) => any | Promise<any>;
export type AfterChangeHook = (ctx: HookContext) => void | Promise<void>;
export type BeforeDeleteHook = (ctx: HookContext) => void | Promise<void>;
export type AfterDeleteHook = (ctx: HookContext) => void | Promise<void>;

export interface CollectionHooks {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeDelete?: BeforeDeleteHook[];
  afterDelete?: AfterDeleteHook[];
}

export interface CollectionConfig<T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  slug: string;
  schema: T;
  access?: CollectionAccess;
  label?: string;
  icon?: LucideIconName;
  hooks?: CollectionHooks;
  versions?: {
    drafts?: boolean;
    maxPerDoc?: number;
  };
}

export interface GlobalConfig<T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  slug: string;
  schema: T;
  label?: string;
  access?: CollectionAccess;
}

export interface CMSOptions {
  db: DatabaseAdapter;
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
  admin?: {
    email: string;
    password: string;
    role?: string;
  };
  localization?: {
    locales: string[];
    defaultLocale: string;
    fallback?: boolean;
  };
}

let globalPayload: OpacaCMS | null = null;

export async function getPayload(): Promise<OpacaCMS> {
  if (!globalPayload) {
    throw new Error('OpacaCMS is not initialized yet. Call await new OpacaCMS(...).init() first.');
  }
  return globalPayload;
}

/**
 * Main orchestrator class for OpacaCMS.
 * Manages collections, dynamic database adapter configuration, and mounts the REST API.
 */
export class OpacaCMS {
  public db: DatabaseAdapter;
  public collections = new Map<string, CollectionConfig>();
  public globals = new Map<string, GlobalConfig>();
  public app: Hono;
  public localization?: {
    locales: string[];
    defaultLocale: string;
    fallback?: boolean;
  };
  private adminConfig?: {
    email: string;
    password: string;
    role?: string;
  };

  constructor(options: CMSOptions) {
    this.db = options.db;
    this.app = new Hono();
    this.adminConfig = options.admin;
    this.localization = options.localization;

    if (options.collections) {
      for (const config of options.collections) {
        if (this.collections.has(config.slug)) {
          throw new Error(`Collection with slug "${config.slug}" is already registered.`);
        }
        this.collections.set(config.slug, config);

        if (typeof (this.db as any).registerCollection === 'function') {
          (this.db as any).registerCollection(config.slug, config.schema.shape);
        }
      }
    }

    if (options.globals) {
      for (const config of options.globals) {
        if (this.globals.has(config.slug)) {
          throw new Error(`Global with slug "${config.slug}" is already registered.`);
        }
        this.globals.set(config.slug, config);
      }
    }
  }

  /**
   * Initializes the CMS asynchronously.
   * Auto-creates/syncs tables and seeds the admin user if configured.
   */
  async init(): Promise<Hono> {
    // 1. Sync database schema if supported
    if (typeof this.db.syncSchema === 'function') {
      this.db.syncSchema();
    }

    // 2. Seed admin user if configured
    if (this.adminConfig) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'WARNING: Hardcoded "admin" seed configuration is disabled in production (process.env.NODE_ENV === "production") for security reasons. Please use the first-time setup page (/admin/setup) instead.'
        );
      } else {
        const existing = await this.db.findUserByEmail(this.adminConfig.email);
        if (!existing) {
          const hash = await hashPassword(this.adminConfig.password);
          await this.db.createUser({
            id: crypto.randomUUID(),
            email: this.adminConfig.email,
            passwordHash: hash,
            role: this.adminConfig.role ?? 'admin',
            createdAt: new Date(),
          });
        }
      }
    }

    // Register this instance globally
    globalPayload = this;

    // 3. Mount routers
    const apiRouter = createApiRouter(this.db, this.collections);
    this.app.route('/api', apiRouter);

    const adminRouter = createAdminRouter(this.db, this.collections);
    this.app.route('/admin', adminRouter);

    return this.app;
  }

  // --- Local API Operations ---

  async find(options: {
    collection: string;
    where?: Record<string, unknown>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
    depth?: number;
    locale?: string;
    draft?: boolean;
  }): Promise<Document[]> {
    const depth = options.depth ?? 1;
    let docs = await this.db.find(options.collection, {
      where: options.where as any,
      limit: options.limit,
      offset: options.offset,
      sort: options.sort,
      draft: options.draft,
      locale: options.locale,
    });

    if (options.locale) {
      docs = docs.map(doc => this.resolveLocalization(options.collection, doc, options.locale!));
    }

    if (depth > 0) {
      docs = await Promise.all(
        docs.map(doc => populateDocRelations(this.db, this.collections, options.collection, doc, depth))
      );
    }

    return docs;
  }

  async findById(options: {
    collection: string;
    id: string;
    depth?: number;
    locale?: string;
    draft?: boolean;
  }): Promise<Document | null> {
    const depth = options.depth ?? 1;
    let doc = await this.db.findById(options.collection, options.id);
    if (!doc) return null;

    if (options.locale) {
      doc = this.resolveLocalization(options.collection, doc, options.locale);
    }

    if (depth > 0) {
      doc = await populateDocRelations(this.db, this.collections, options.collection, doc, depth);
    }

    return doc;
  }

  async create(options: {
    collection: string;
    data: Record<string, unknown>;
    locale?: string;
  }): Promise<Document> {
    const config = this.collections.get(options.collection);
    let data = { ...options.data };

    if (config?.hooks?.beforeChange) {
      for (const hook of config.hooks.beforeChange) {
        data = await hook({ data, operation: 'create' });
      }
    }

    let doc = await this.db.create(options.collection, data);

    if (config?.versions) {
      await this.db.createVersion(options.collection, doc.id, doc);
    }

    if (config?.hooks?.afterChange) {
      for (const hook of config.hooks.afterChange) {
        await hook({ doc, operation: 'create' });
      }
    }

    if (options.locale) {
      doc = this.resolveLocalization(options.collection, doc, options.locale);
    }

    return doc;
  }

  async update(options: {
    collection: string;
    id: string;
    data: Partial<Record<string, unknown>>;
    locale?: string;
  }): Promise<Document> {
    const config = this.collections.get(options.collection);
    let data = { ...options.data };

    if (config?.hooks?.beforeChange) {
      for (const hook of config.hooks.beforeChange) {
        data = await hook({ data: data as any, operation: 'update', id: options.id });
      }
    }

    let doc = await this.db.update(options.collection, options.id, data);

    if (config?.versions) {
      await this.db.createVersion(options.collection, doc.id, doc);
    }

    if (config?.hooks?.afterChange) {
      for (const hook of config.hooks.afterChange) {
        await hook({ doc, operation: 'update', id: options.id });
      }
    }

    if (options.locale) {
      doc = this.resolveLocalization(options.collection, doc, options.locale);
    }

    return doc;
  }

  async delete(options: {
    collection: string;
    id: string;
  }): Promise<void> {
    const config = this.collections.get(options.collection);

    if (config?.hooks?.beforeDelete) {
      for (const hook of config.hooks.beforeDelete) {
        await hook({ operation: 'delete', id: options.id });
      }
    }

    await this.db.delete(options.collection, options.id);

    if (config?.hooks?.afterDelete) {
      for (const hook of config.hooks.afterDelete) {
        await hook({ operation: 'delete', id: options.id });
      }
    }
  }

  // --- Local API - Globals ---

  async findGlobal(options: {
    slug: string;
    locale?: string;
  }): Promise<Record<string, unknown> | null> {
    let globalDoc = await this.db.findGlobal(options.slug);
    if (!globalDoc) return null;

    if (options.locale) {
      globalDoc = this.resolveGlobalLocalization(options.slug, globalDoc, options.locale);
    }

    return globalDoc;
  }

  async updateGlobal(options: {
    slug: string;
    data: Record<string, unknown>;
    locale?: string;
  }): Promise<Record<string, unknown>> {
    let doc = await this.db.updateGlobal(options.slug, options.data);
    
    if (options.locale) {
      doc = this.resolveGlobalLocalization(options.slug, doc, options.locale);
    }
    
    return doc;
  }

  // --- Localization Helpers ---

  private resolveLocalization(collection: string, doc: Document, locale: string): Document {
    const config = this.collections.get(collection);
    if (!config) return doc;
    const resolved = { ...doc };
    for (const [key, field] of Object.entries(config.schema.shape)) {
      const meta = getFieldMeta(field as any);
      if (meta?.localized && typeof doc[key] === 'object' && doc[key] !== null) {
        const valObj = doc[key] as Record<string, unknown>;
        resolved[key] = valObj[locale] ?? valObj[this.localization?.defaultLocale ?? 'en'] ?? null;
      }
    }
    return resolved as Document;
  }

  private resolveGlobalLocalization(slug: string, doc: Record<string, unknown>, locale: string): Record<string, unknown> {
    const config = this.globals.get(slug);
    if (!config) return doc;
    const resolved = { ...doc };
    for (const [key, field] of Object.entries(config.schema.shape)) {
      const meta = getFieldMeta(field as any);
      if (meta?.localized && typeof doc[key] === 'object' && doc[key] !== null) {
        const valObj = doc[key] as Record<string, unknown>;
        resolved[key] = valObj[locale] ?? valObj[this.localization?.defaultLocale ?? 'en'] ?? null;
      }
    }
    return resolved;
  }
}
