import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface RichTextFieldOptions extends BaseFieldOptions {}

/**
 * Creates a richtext field schema validation.
 */
export function richtext(opts: RichTextFieldOptions = {}): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.string();

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'richtext',
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
