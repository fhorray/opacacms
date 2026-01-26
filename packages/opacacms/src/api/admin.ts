import type { Context } from 'hono';
import type { OpacaConfig } from '../types';

export function createAdminHandlers(config: OpacaConfig) {
  return {
    async getCollections(c: Context) {
      const collections = config.collections.map(col => ({
        slug: col.slug,
        fields: col.fields.map(f => ({
          name: f.name,
          type: f.type,
          label: f.label || f.name,
          required: !!f.required,
        })),
        timestamps: !!col.timestamps,
      }));
      return c.json({ collections });
    },

    async getConfig(c: Context) {
      return c.json({
        serverURL: config.serverURL,
        admin: config.admin,
      });
    },
  };
}
