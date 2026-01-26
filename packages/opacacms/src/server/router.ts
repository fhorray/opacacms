import { Hono } from 'hono';
import type { OpacaConfig } from '../types';
import { createHandlers } from './handlers';
import { createAdminHandlers } from './admin';

import { createAuth } from '../auth';
import { runAuthMigrations } from '../auth/migrations';

export function createAPIRouter(config: OpacaConfig): Hono {
  const router = new Hono().basePath('/api');

  // Integrated Better Auth
  let auth: any; // We'll type this dynamically or use 'any' to avoid circular/complex type drill-down for now
  if (config.db.name === 'sqlite' && (config.db as any).db) {
    auth = createAuth(config);

    // Mount Auth Routes handled by Better Auth
    router.on(['POST', 'GET'], '/auth/*', (c) => {
      return auth.handler(c.req.raw);
    });

    // Run Migrations (Fire & Forget for simplicity in this integration)
    // Ideally this should be awaited in the server startup
    runAuthMigrations(auth).catch((err: any) => console.error("[OpacaAuth] Migration failed", err));
  }

  // Admin Meta API
  const adminHandlers = createAdminHandlers(config);

  // Protect Admin Routes
  const adminMiddleware = async (c: any, next: any) => {
    if (auth) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      // Check for admin role if using admin plugin
      if (session.user.role !== 'admin' && !session.user.role?.includes('admin')) {
        return c.json({ message: "Forbidden" }, 403);
      }
    }
    await next();
  };

  router.get('/__admin/collections', adminMiddleware, adminHandlers.getCollections);
  router.get('/__admin/config', adminMiddleware, adminHandlers.getConfig);
  router.get('/__admin/setup', adminHandlers.getSetupStatus);

  for (const collection of config.collections) {
    const handlers = createHandlers(config, collection);
    const path = `/${collection.slug}`;

    router.get(path, handlers.find);
    router.get(`${path}/:id`, handlers.findOne);
    router.post(path, handlers.create);
    router.patch(`${path}/:id`, handlers.update);
    router.delete(`${path}/:id`, handlers.delete);
  }

  return router;
}
