import { Hono } from 'hono';
import type { OpacaConfig } from '../types';
import { createHandlers } from './handlers';
import { createAdminHandlers } from './admin';

export function createAPIRouter(config: OpacaConfig): Hono {
  const router = new Hono();

  // Admin Meta API
  const adminHandlers = createAdminHandlers(config);
  router.get('/__admin/collections', adminHandlers.getCollections);
  router.get('/__admin/config', adminHandlers.getConfig);

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
