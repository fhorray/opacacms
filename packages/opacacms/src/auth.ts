import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import type { Database } from "bun:sqlite";

import type { OpacaConfig } from "./types";

export function createAuth(config: OpacaConfig) {
  const db = (config.db as any).db;
  const userAuth = config.auth || {};

  // 1. Generate Statement based on Collections
  const resources: Record<string, string[]> = {
    // System resources
    user: ['create', 'read', 'update', 'delete', 'ban', 'impersonate'],
    session: ['read', 'revoke', 'delete'],
    // We can add more system resources here
  };

  for (const collection of config.collections) {
    // Each collection gets standard CRUD permissions
    resources[collection.slug] = ['create', 'read', 'update', 'delete'];
  }

  // Cast to const to satisfy AC type expectations if needed, but for dynamic keys we usually use the object directly
  // better-auth might expect specific types, so we rely on its inference or loose typing for dynamic AC.
  const statement = resources as any;
  const ac = createAccessControl(statement);

  // 2. Define Standard Roles
  const adminRole = ac.newRole({
    user: ['create', 'read', 'update', 'delete', 'ban', 'impersonate'],
    session: ['read', 'revoke', 'delete'],
  });

  // Grant full access to all collections for admin
  for (const collection of config.collections) {
    // @ts-ignore - dynamic assignment
    adminRole[collection.slug] = ['create', 'read', 'update', 'delete'];
  }

  const userRole = ac.newRole({
    // Default permissions for "user" role
  });

  // 3. Create Custom Roles from Config
  const contentRoles: Record<string, any> = {
    admin: adminRole,
    user: userRole
  };

  if (config.access?.roles) {
    for (const [roleName, permissions] of Object.entries(config.access.roles)) {
      contentRoles[roleName] = ac.newRole(permissions as any);
    }
  }

  return betterAuth({
    ...userAuth,
    database: db,
    baseURL: userAuth.baseURL || config.serverURL,
    // Ensure Admin plugin is always present and likely first or merged properly
    plugins: [
      admin({
        ac,
        roles: contentRoles
      }),
      ...(userAuth.plugins || [])
    ],
    // Defaults that can be overridden by userAuth if they really want, 
    // but we set them here as base. 
    // If we want to ENFORCE them, we put them after ...userAuth.
    // If we want to allow override, we put them before.
    // Let's enforce table names for consistency with CMS structure unless explicitly overridden?
    // Actually, user provided config should probably take precedence for customizations,
    // BUT 'admin' plugin is core to OpacaCMS, so we forced it above.
    // base path might be critical too.
    basePath: userAuth.basePath || "/api/auth",

    user: userAuth.user || {
      modelName: "users",
    },
    databaseHooks: {
      user: {
        create: {
          before: async (ctx) => {
            try {
              const countQuery = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
              if (countQuery && countQuery.count === 0) {
                console.log("[OpacaAuth] First user detected! Assigning 'admin' role.");
                return {
                  data: {
                    ...(ctx.data as any),
                    role: "admin"
                  }
                };
              }
            } catch (err) {
              console.error("[OpacaAuth] First user check failed", err);
            }
          }
        }
      }
    },
    session: userAuth.session || {
      modelName: "sessions",
    },
    account: userAuth.account || {
      modelName: "accounts",
    },
    verification: userAuth.verification || {
      modelName: "verifications",
    },

    advanced: {
      ...userAuth.advanced,
      database: {
        ...userAuth.advanced?.database
      }
    }
  });
}

export type Auth = ReturnType<typeof createAuth>;
