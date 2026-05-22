import { Hono } from 'hono';
import type { DatabaseAdapter } from './db/adapter';
import type { CollectionAccess } from './fields/types';
import { createApiRouter } from './api/router';
import { createAdminRouter } from './admin/router';
import { hashPassword } from './auth/password';
import type { z } from 'zod';
import crypto from 'crypto';

import type * as LucideIcons from 'lucide-react';

export type LucideIconName = keyof typeof LucideIcons;

export interface CollectionConfig<T extends z.ZodObject<any> = z.ZodObject<any>> {
  slug: string;
  schema: T;
  access?: CollectionAccess;
  label?: string;
  icon?: LucideIconName;
}

export interface CMSOptions {
  db: DatabaseAdapter;
  collections?: CollectionConfig[];
  admin?: {
    email: string;
    password: string;
    role?: string;
  };
}

/**
 * Main orchestrator class for OpacaCMS.
 * Manages collections, dynamic database adapter configuration, and mounts the REST API.
 */
export class OpacaCMS {
  public db: DatabaseAdapter;
  public collections = new Map<string, CollectionConfig>();
  public app: Hono;
  private adminConfig?: {
    email: string;
    password: string;
    role?: string;
  };

  constructor(options: CMSOptions) {
    this.db = options.db;
    this.app = new Hono();
    this.adminConfig = options.admin;

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

    // 3. Mount routers
    const apiRouter = createApiRouter(this.db, this.collections);
    this.app.route('/api', apiRouter);

    const adminRouter = createAdminRouter(this.db, this.collections);
    this.app.route('/admin', adminRouter);

    return this.app;
  }
}


