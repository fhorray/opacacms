import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

export interface TextFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
}

/**
 * Creates a text field schema validation.
 */
export function text(opts: TextFieldOptions = {}): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.string();
  if (opts.minLength !== undefined) {
    schema = (schema as z.ZodString).min(opts.minLength);
  }
  if (opts.maxLength !== undefined) {
    schema = (schema as z.ZodString).max(opts.maxLength);
  }

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'text',
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

/**
 * Creates a textarea field schema validation.
 */
export function textarea(opts: TextFieldOptions = {}): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.string();
  if (opts.minLength !== undefined) {
    schema = (schema as z.ZodString).min(opts.minLength);
  }
  if (opts.maxLength !== undefined) {
    schema = (schema as z.ZodString).max(opts.maxLength);
  }

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'textarea',
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
