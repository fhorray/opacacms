import { z } from 'zod';
import { registerField } from '../utils';
import type { BaseFieldOptions } from '../types';

export interface UIFieldOptions extends BaseFieldOptions {
  component: string;
}

/**
 * Creates a visual-only UI field configuration that does not store data in the database.
 */
export function ui(opts: UIFieldOptions): z.ZodTypeAny {
  const schema = z.any().optional();

  return registerField(schema, {
    fieldType: 'text',
    label: opts.label,
    placeholder: opts.placeholder,
    description: opts.description,
    required: false,
    hidden: false,
    readOnly: true,
    defaultValue: undefined,
  });
}
