import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface DateFieldOptions extends BaseFieldOptions {}

/**
 * Creates a date field schema validation.
 */
export function date(opts: DateFieldOptions = {}): z.ZodTypeAny {
  // Dates are validated and stored as ISO-8601 string formats in APIs/DBs.
  let schema: z.ZodTypeAny = z.string();

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'date',
    label: opts.label,
    placeholder: opts.placeholder,
    description: opts.description,
    required: opts.required !== false,
    hidden: opts.hidden,
    readOnly: opts.readOnly,
    defaultValue: opts.defaultValue,
    access: opts.access,
  });
}
