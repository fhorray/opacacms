import type { Context } from 'hono';
import type { OpacaConfig, Collection } from '../types';
import { generateSchemaForCollection } from '../validator';

export function createHandlers(config: OpacaConfig, collection: Collection) {
  const { db } = config;

  return {
    async find(c: Context) {
      const queries = c.req.query();

      const page = queries.page ? parseInt(queries.page) : 1;
      const limit = queries.limit ? parseInt(queries.limit) : 10;
      const sort = queries.sort as string;

      // Extract filter query (exclude limit, page, sort)
      const filter: any = {};
      for (const [key, value] of Object.entries(queries)) {
        if (['page', 'limit', 'sort'].includes(key)) continue;

        // Handle advanced filters encoded like ?where[age][gt]=18
        // Hono query parsing is simple, might return nested objects if using specialized middleware or qs,
        // but default c.req.query() returns Record<string, string>.
        // For complex queries standard practice often involves parsing JSON in a specific param like ?where={...}
        // OR using qs-like syntax support.
        // Hono's default query parser doesn't auto-expand [].
        // So for simplicity in this iteration, we assume direct equality or simple filters.
        // If the user wants advanced filters, they might need to send a `where` JSON string or we parse brackets manually.

        // Implements basic bracket parsing support for one level: field[op]=value
        // Regex to check for field[op]
        const match = key.match(/^([^\[]+)\[([^\]]+)\]$/);
        if (match) {
          const field = match[1] as string;
          const op = match[2] as string;
          if (!filter[field]) filter[field] = {};
          filter[field][op] = value;
        } else {
          filter[key] = value;
        }
      }

      const results = await db.find(collection.slug, filter, { page, limit, sort });
      return c.json(results);
    },

    async findOne(c: Context) {
      const id = c.req.param('id');
      const doc = await db.findOne(collection.slug, { id });
      if (!doc) return c.json({ message: 'Not found' }, 404);
      return c.json(doc);
    },

    async create(c: Context) {
      const body = await c.req.json();

      const schema = generateSchemaForCollection(collection);
      const validation = schema.safeParse(body);

      if (!validation.success) {
        return c.json({
          message: 'Validation Error',
          errors: validation.error
        }, 400);
      }

      // Hooks: beforeCreate
      let data = validation.data;
      if (collection.hooks?.beforeCreate) {
        data = await collection.hooks.beforeCreate(data);
      }

      const doc = await db.create(collection.slug, data);

      // Hooks: afterCreate
      if (collection.hooks?.afterCreate) {
        await collection.hooks.afterCreate(doc);
      }

      return c.json(doc, 201);
    },

    async update(c: Context) {
      const id = c.req.param('id');
      const body = await c.req.json();

      const schema = generateSchemaForCollection(collection, true);
      const validation = schema.safeParse(body);

      if (!validation.success) {
        return c.json({
          message: 'Validation Error',
          errors: validation.error
        }, 400);
      }

      // Hooks: beforeUpdate
      let data = validation.data;
      if (collection.hooks?.beforeUpdate) {
        data = await collection.hooks.beforeUpdate(data);
      }

      const doc = await db.update(collection.slug, { id }, data);

      // Hooks: afterUpdate
      if (collection.hooks?.afterUpdate) {
        await collection.hooks.afterUpdate(doc);
      }

      return c.json(doc);
    },

    async delete(c: Context) {
      const id = c.req.param('id');

      // Hooks: beforeDelete
      if (collection.hooks?.beforeDelete) {
        await collection.hooks.beforeDelete(id);
      }

      await db.delete(collection.slug, { id });

      // Hooks: afterDelete
      if (collection.hooks?.afterDelete) {
        await collection.hooks.afterDelete(id);
      }

      return c.json({ success: true });
    },
  };
}
