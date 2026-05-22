import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface NumberFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
}

/**
 * Creates a number field schema validation.
 */
export function number(opts: NumberFieldOptions = {}): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.number();
  if (opts.min !== undefined) {
    schema = (schema as z.ZodNumber).min(opts.min);
  }
  if (opts.max !== undefined) {
    schema = (schema as z.ZodNumber).max(opts.max);
  }

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'number',
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
