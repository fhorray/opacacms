import { z } from 'zod';
import { getFieldMeta } from '../../fields/utils';

// Helper to set nested value in object/array
function setPath(obj: Record<string, unknown> | unknown[], path: string[], value: unknown) {
  let current: any = obj;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    
    // Check if next key is an array index (numeric)
    const isNextNumeric = nextKey !== undefined && /^\d+$/.test(nextKey);
    
    if (nextKey === undefined) {
      current[key] = value;
    } else {
      if (current[key] === undefined) {
        current[key] = isNextNumeric ? [] : {};
      }
      current = current[key];
    }
  }
}

// Helper to get nested value from object/array
function getPath(obj: Record<string, unknown> | unknown[], path: string[]): unknown {
  let current: any = obj;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Parses flat URL-encoded form data into a nested JSON structure.
 * Coerces types and handles checkboxes missing from POST request payload.
 */
export function parseFormBody(flatBody: Record<string, unknown>, schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const nestedData: Record<string, unknown> = {};

  // 1. Convert flat keys (e.g., "seo.metaTitle") to nested properties
  for (const [key, value] of Object.entries(flatBody)) {
    const parts = key.split('.');
    setPath(nestedData, parts, value);
  }

  // 2. Walk the schema to coerce checkboxes and numbers
  coerceSchema(schema, [], nestedData);

  return nestedData;
}

function coerceSchema(schema: any, path: string[], nestedData: Record<string, unknown>) {
  if (!schema) return;

  const meta = getFieldMeta(schema);

  // If this schema has custom field metadata, apply coercion first before unwrapping
  if (meta) {
    if (meta.fieldType === 'checkbox') {
      const val = getPath(nestedData, path);
      if (val === 'on' || val === 'true' || val === true) {
        setPath(nestedData, path, true);
      } else {
        setPath(nestedData, path, false);
      }
      return;
    }
    if (meta.fieldType === 'number') {
      const val = getPath(nestedData, path);
      if (val === '' || val === undefined || val === null) {
        setPath(nestedData, path, undefined);
      } else if (typeof val === 'string') {
        const num = Number(val);
        setPath(nestedData, path, isNaN(num) ? val : num);
      }
      return;
    }
    if (meta.fieldType === 'relation' && meta.hasMany) {
      const val = getPath(nestedData, path);
      if (val === undefined || val === null || val === '') {
        setPath(nestedData, path, []);
      } else if (!Array.isArray(val)) {
        setPath(nestedData, path, [val]);
      }
      return;
    }
    if (meta.fieldType === 'multiselect') {
      const val = getPath(nestedData, path);
      if (val === undefined || val === null || val === '') {
        setPath(nestedData, path, []);
      } else if (!Array.isArray(val)) {
        setPath(nestedData, path, [val]);
      }
      return;
    }
  }

  // Unwrap wrapper schemas (Optional, Nullable, Default, Effects, etc.)
  const typeName = schema.constructor?.name;
  const def = (schema as any)._def;
  if (def && def.innerType) {
    coerceSchema(def.innerType, path, nestedData);
    return;
  }
  if (def && def.schema) {
    coerceSchema(def.schema, path, nestedData);
    return;
  }

  // Recurse into containers
  if (typeName === 'ZodObject') {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    for (const key of Object.keys(shape)) {
      coerceSchema(shape[key], [...path, key], nestedData);
    }
  } else if (typeName === 'ZodArray') {
    const elementSchema = (schema as z.ZodArray<any>).element as z.ZodTypeAny;
    const arrayVal = getPath(nestedData, path);
    if (Array.isArray(arrayVal)) {
      for (let i = 0; i < arrayVal.length; i++) {
        coerceSchema(elementSchema, [...path, String(i)], nestedData);
      }
    }
  }
}

