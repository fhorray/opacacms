import { Hono } from 'hono';
import type { OpacaConfig } from '../types';
import { createAPIRouter } from '../server/router';

export function createWorkersHandler(config: OpacaConfig) {
  const app = new Hono();

  // API Router
  const apiRouter = createAPIRouter(config);
  app.route('/api', apiRouter);

  return {
    async fetch(request: Request, env: any, ctx: any) {
      // Set the DB adapter if it's dynamic or needs env
      // But usually it's passed during defineConfig

      // Auto-migrate in Workers is tricky, usually done via wrangler d1 migrations
      // but we can have an internal "init" endpoint if needed.

      return app.fetch(request, env, ctx);
    },
  };
}
