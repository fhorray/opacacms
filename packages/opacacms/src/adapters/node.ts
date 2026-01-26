import { serve } from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { OpacaConfig } from '../types';
import { createAPIRouter } from '../server/router';

export interface NodeServerOptions {
  port?: number;
}

export function createNodeServer(config: OpacaConfig) {
  const app = new Hono();

  // Logging
  app.use('*', async (c, next) => {
    console.log(`📡 [${c.req.method}] ${c.req.url}`);
    await next();
  });

  // CORS for frontend admin
  app.use('/*', cors());

  // API Router
  const apiRouter = createAPIRouter(config);
  app.route('/api', apiRouter);

  // Migration on start
  const start = async (options: NodeServerOptions = {}) => {
    console.log('🚀 OpacaCMS starting...');

    await config.db.connect();
    console.log(`📦 Database "${config.db.name}" connected`);

    await config.db.migrate(config.collections);
    console.log('✅ Migrations completed');

    const port = options.port || 3000;
    console.log(`🌐 API ready at http://localhost:${port}/api`);

    return serve({
      fetch: app.fetch,
      port,
    });
  };

  return {
    app,
    start,
  };
}
