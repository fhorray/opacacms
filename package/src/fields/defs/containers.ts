import { z } from 'zod';
import type { BaseFieldOptions } from '../types';
import { registerField } from '../utils';

/**
 * Creates an accordion visual field container.
 * Validates as a nested object in Zod.
 */
export function accordion(label: string, shape: Record<string, z.ZodTypeAny>): z.ZodTypeAny {
  const schema = z.object(shape);

  return registerField(schema, {
    fieldType: 'accordion',
    label,
    required: true,
    shape,
  });
}

/**
 * Creates a group field container.
 * Validates as a nested object in Zod.
 */
export function group(label: string, shape: Record<string, z.ZodTypeAny>): z.ZodTypeAny {
  const schema = z.object(shape);

  return registerField(schema, {
    fieldType: 'group',
    label,
    required: true,
    shape,
  });
}

/**
 * Creates an array (repeatable list of rows) field container.
 * Validates as an array of nested objects in Zod.
 */
export function array(
  label: string,
  shape: Record<string, z.ZodTypeAny>,
  opts: BaseFieldOptions = {}
): z.ZodTypeAny {
  const rowSchema = z.object(shape);
  let schema: z.ZodTypeAny = z.array(rowSchema);

  if (opts.required === false) {
    schema = schema.optional();
  }

  return registerField(schema, {
    fieldType: 'array',
    label,
    required: opts.required !== false,
    placeholder: opts.placeholder,
    description: opts.description,
    defaultValue: opts.defaultValue,
    access: opts.access,
    shape,
  });
}

/**
 * Creates a row visual field container.
 * Validates as a nested object in Zod.
 */
export function row(label: string, shape: Record<string, z.ZodTypeAny>): z.ZodTypeAny {
  const schema = z.object(shape);

  return registerField(schema, {
    fieldType: 'row',
    label,
    required: true,
    shape,
  });
}

/**
 * Creates a tabbed layout visual field container.
 * Validates as a nested object of sub-objects in Zod.
 */
export function tabs(label: string, tabsShape: Record<string, Record<string, z.ZodTypeAny>>): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [tabKey, tabFields] of Object.entries(tabsShape)) {
    shape[tabKey] = z.object(tabFields);
  }
  const schema = z.object(shape);

  return registerField(schema, {
    fieldType: 'tabs',
    label,
    required: true,
    tabsShape,
  });
}

/**
 * Creates a sidebar visual field container.
 * Validates as a nested object in Zod.
 */
export function sidebar(label: string, shape: Record<string, z.ZodTypeAny>): z.ZodTypeAny {
  const schema = z.object(shape);

  return registerField(schema, {
    fieldType: 'sidebar',
    label,
    required: true,
    shape,
  });
}

