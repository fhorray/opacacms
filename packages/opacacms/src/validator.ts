import { z } from 'zod';
import type { Collection, Field } from './types';

export function generateSchemaForCollection(collection: Collection, isUpdate: boolean = false) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of collection.fields) {
    let schema = mapFieldToZod(field);

    if (field.required && !isUpdate) {
      // If required, we don't make it optional (it is required by default in Zod)
    } else {
      // If not required, or if it's an update (patch), everything is optional
      schema = schema.optional();
    }

    // Add default value if exists and not update
    if (field.defaultValue !== undefined && !isUpdate) {
        schema = schema.default(field.defaultValue);
    }

    shape[field.name] = schema;
  }

  return z.object(shape);
}

function mapFieldToZod(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'richtext':
    case 'relationship': // IDs are usually strings
      return z.string();

    case 'number':
      return z.number();

    case 'boolean':
      return z.boolean();

    case 'date':
      return z.string().datetime().or(z.date());

    case 'select':
      // TODO: If we add options to Field definition, we can use z.enum here
      return z.string();

    case 'array':
      return z.array(z.any());

    default:
      return z.any();
  }
}
