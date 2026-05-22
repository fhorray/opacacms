import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface SelectFieldOptions extends BaseFieldOptions {
  options: (string | { label: string; value: string })[];
}

/**
 * Creates a select field schema validation.
 */
export function select(opts: SelectFieldOptions): z.ZodTypeAny {
  const values = opts.options.map(o => (typeof o === 'string' ? o : o.value));
  if (values.length === 0) {
    throw new Error('Select field options cannot be empty');
  }

  let schema: z.ZodTypeAny = z.enum(values as [string, ...string[]]);

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'select',
    label: opts.label,
    placeholder: opts.placeholder,
    description: opts.description,
    required: opts.required !== false,
    hidden: opts.hidden,
    readOnly: opts.readOnly,
    defaultValue: opts.defaultValue,
    access: opts.access,
    options: opts.options,
  });
}

/**
 * Creates a multiselect field schema validation.
 */
export function multiselect(opts: SelectFieldOptions): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.array(z.string());

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'multiselect',
    label: opts.label,
    placeholder: opts.placeholder,
    description: opts.description,
    required: opts.required !== false,
    hidden: opts.hidden,
    readOnly: opts.readOnly,
    defaultValue: opts.defaultValue,
    access: opts.access,
    options: opts.options,
  });
}
