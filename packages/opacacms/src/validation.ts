import { z } from 'zod';

export const FieldSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'number', 'richtext', 'relationship', 'select', 'date', 'boolean', 'array']),
  label: z.string().optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.any().optional(),
  // validate: z.function().optional(), // Zod can't easily validate functions that are complex
}).passthrough();

export const AccessConfigSchema = z.object({
  read: z.union([z.boolean(), z.function()]).optional(),
  create: z.union([z.boolean(), z.function()]).optional(),
  update: z.union([z.boolean(), z.function()]).optional(),
  delete: z.union([z.boolean(), z.function()]).optional(),
});

export const CollectionHooksSchema = z.object({
  beforeCreate: z.function().optional(),
  afterCreate: z.function().optional(),
  beforeUpdate: z.function().optional(),
  afterUpdate: z.function().optional(),
  beforeDelete: z.function().optional(),
  afterDelete: z.function().optional(),
});

export const CollectionSchema = z.object({
  slug: z.string(),
  fields: z.array(FieldSchema),
  timestamps: z.boolean().optional(),
  auth: z.boolean().optional(),
  hooks: CollectionHooksSchema.optional(),
  access: AccessConfigSchema.optional(),
});

export const GlobalSchema = z.object({
  slug: z.string(),
  fields: z.array(FieldSchema),
  access: AccessConfigSchema.optional(),
});

export const OpacaConfigSchema = z.object({
  collections: z.array(CollectionSchema),
  globals: z.array(GlobalSchema).optional(),
  db: z.any(), // Validated at runtime by compatibility
  admin: z.object({
    userCollection: z.string().optional(),
    disableAdmin: z.boolean().optional(),
    route: z.string().optional(),
  }).optional(),
  serverURL: z.string().optional(),
});
