import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface RelationFieldOptions extends BaseFieldOptions {
  collection: string;
}

/**
 * Creates a relation field schema validation referencing another collection.
 */
export function relation(opts: RelationFieldOptions): z.ZodTypeAny {
  // Stored as string containing the ID of the referenced document.
  let schema: z.ZodTypeAny = z.string();

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'relation',
    label: opts.label,
    placeholder: opts.placeholder,
    description: opts.description,
    required: opts.required !== false,
    hidden: opts.hidden,
    readOnly: opts.readOnly,
    defaultValue: opts.defaultValue,
    access: opts.access,
    collection: opts.collection,
  });
}
