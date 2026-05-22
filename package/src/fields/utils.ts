import { z } from 'zod';
import type { FieldMeta } from './types';

/**
 * Custom registry for Opaca fields to map Zod schema instances to their metadata.
 * Using a custom class avoids conflicts with Zod's strict JSON-serializable registry constraints.
 */
export class OpacaRegistry {
  private registry = new Map<z.ZodTypeAny, FieldMeta>();

  add(schema: z.ZodTypeAny, meta: FieldMeta): void {
    this.registry.set(schema, meta);
  }

  get(schema: z.ZodTypeAny): FieldMeta | undefined {
    return this.registry.get(schema);
  }
}

export const opacaRegistry = new OpacaRegistry();

/**
 * Registers a schema in the Opaca custom registry and attaches metadata via .meta().
 */
export function registerField<T extends z.ZodTypeAny>(schema: T, meta: FieldMeta): T {
  // Cast to any to avoid internal Zod v4 .meta() type constraints
  const schemaWithMeta = schema.meta(meta as any);
  opacaRegistry.add(schemaWithMeta, meta);
  return schemaWithMeta as unknown as T;
}

/**
 * Checks if a schema represents an optional or nullable type.
 * In Zod v4, constructor name is the most reliable way to check class types without internal kind-checks.
 */
function isSchemaOptionalOrNullable(schema: z.ZodTypeAny): boolean {
  const name = schema.constructor?.name;
  return name === 'ZodOptional' || name === 'ZodNullable';
}

/**
 * Extracts metadata (FieldMeta) from a Zod schema, even if wrapped
 * by common wrappers (optional, nullable, default, effects, etc.).
 * Automatically infers optionality if wrapped in ZodOptional or ZodNullable.
 */
export function getFieldMeta(schema: z.ZodTypeAny): FieldMeta | null {
  // 1. Try registry lookup first
  const registryMeta = opacaRegistry.get(schema);
  
  // 2. Detect if current level is optional or nullable
  const optionalOrNullable = isSchemaOptionalOrNullable(schema);

  // 3. Try direct metadata lookup
  let meta = registryMeta || (schema.meta() as FieldMeta | undefined);

  if (!meta) {
    const def = (schema as any)._def;
    if (def) {
      // Unwrap optional, nullable, default wrappers
      if (def.innerType) {
        meta = getFieldMeta(def.innerType) || undefined;
      }
      // Unwrap transforms and refinements (effects)
      else if (def.schema) {
        meta = getFieldMeta(def.schema) || undefined;
      }
    }
  }

  if (meta) {
    return {
      ...meta,
      required: optionalOrNullable ? false : meta.required,
    };
  }

  return null;
}
