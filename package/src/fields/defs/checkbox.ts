import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface CheckboxFieldOptions extends BaseFieldOptions {}

/**
 * Creates a checkbox field schema validation.
 */
export function checkbox(opts: CheckboxFieldOptions = {}): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.boolean();

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'checkbox',
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
