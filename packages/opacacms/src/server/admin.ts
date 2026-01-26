import type { Context } from 'hono';
import type { OpacaConfig } from '../types';

export function createAdminHandlers(config: OpacaConfig) {
  const getCollections = (c: Context) => {
    // Return collections with field details simplified if needed, or full config
    // For now returning config.collections directly. 
    // Ideally we might strip internal server-only properties if any.
    return c.json({
      collections: config.collections,
      globals: config.globals,
    });
  };

  const getConfig = async (c: Context) => {
    return c.json({
      serverURL: config.serverURL,
      admin: config.admin,
    });
  };

  const getSetupStatus = (c: Context) => {
    let hasUsers = false;
    try {
      // Use raw DB access for speed/simplicity since we know it's SQLite usually or we adapt
      // This relies on (config.db as any).db being the Bun/SQLite instance.
      // In future refactors, this should use a proper `count` method on DatabaseAdapter.
      if ((config.db as any).db) {
        const stmt = (config.db as any).db.prepare("SELECT 1 FROM users LIMIT 1");
        hasUsers = !!stmt.get();
      }
    } catch (e) {
      // Tables might not exist yet, so no users.
      hasUsers = false;
    }

    return c.json({
      isSetup: hasUsers
    });
  };

  return {
    getCollections,
    getConfig,
    getSetupStatus
  };
}
