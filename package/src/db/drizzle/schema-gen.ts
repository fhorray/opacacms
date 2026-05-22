import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type { z } from 'zod';
import { getFieldMeta } from '../../fields/utils';

/**
 * Maps a field's metadata to a Drizzle SQLite column builder.
 */
function mapFieldToColumn(name: string, meta: any) {
  let builder: any;

  switch (meta.fieldType) {
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'select':
    case 'date':
    case 'relation':
    case 'multiselect':
    case 'accordion':
    case 'group':
    case 'array':
    case 'row':
    case 'tabs':
    case 'sidebar':
      builder = text(name);
      break;

    case 'number':
      builder = real(name);
      break;

    case 'checkbox':
      // Store boolean as 0 or 1 integer in SQLite
      builder = integer(name, { mode: 'boolean' });
      break;

    default:
      builder = text(name);
  }

  // Enforce notNull constraint if the field is required
  if (meta.required) {
    builder = builder.notNull();
  }

  return builder;
}

/**
 * Dynamically generates a Drizzle SQLite table schema based on a Zod schema shape.
 */
export function generateTableSchema(
  collectionSlug: string,
  schemaShape: Record<string, z.ZodTypeAny>
) {
  const columns: Record<string, any> = {
    id: text('id').primaryKey(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  };

  for (const [key, field] of Object.entries(schemaShape)) {
    // Skip reserved system fields
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }

    const meta = getFieldMeta(field);
    if (!meta) continue;

    columns[key] = mapFieldToColumn(key, meta);
  }

  return sqliteTable(collectionSlug, columns);
}
