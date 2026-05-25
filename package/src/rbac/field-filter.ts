import type { z } from 'zod';
import type { AdminUser } from '../fields/types';
import { getFieldMeta } from '../fields/utils';
import { resolveAccess } from './resolver';

/**
 * Filter document fields before returning them to the user (Read operations).
 * Strips out fields where the user does not have 'read' permissions.
 */
export async function filterFieldsForRead(
  schemaShape: Record<string, any>,
  doc: Record<string, any>,
  user: AdminUser | null
): Promise<Record<string, any>> {
  const filtered: Record<string, any> = { ...doc };

  // System fields are always allowed
  const systemFields = ['id', 'createdAt', 'updatedAt'];

  for (const [key, value] of Object.entries(doc)) {
    if (systemFields.includes(key)) {
      continue;
    }

    const field = schemaShape[key];
    if (!field) {
      delete filtered[key];
      continue;
    }

    const meta = getFieldMeta(field);
    if (!meta) {
      continue;
    }

    const canRead = await resolveAccess(meta.access?.read, { user, doc });
    if (!canRead) {
      delete filtered[key];
    } else {
      // Recursively filter group fields
      if (meta.fieldType === 'group' && meta.shape && typeof value === 'object' && value !== null) {
        filtered[key] = await filterFieldsForRead(meta.shape, value, user);
      }
      // Recursively filter array elements
      else if (meta.fieldType === 'array' && meta.shape && Array.isArray(value)) {
        filtered[key] = await Promise.all(
          value.map(async (item) => {
            if (typeof item === 'object' && item !== null) {
              return filterFieldsForRead(meta.shape!, item, user);
            }
            return item;
          })
        );
      }
    }
  }

  return filtered;
}

/**
 * Filter input data fields before writing them to the database (Create/Update operations).
 * Strips out fields where the user does not have 'update' permissions.
 */
export async function filterFieldsForWrite(
  schemaShape: Record<string, any>,
  data: Record<string, any>,
  existingDoc: Record<string, any> | undefined,
  user: AdminUser | null
): Promise<Record<string, any>> {
  const filtered: Record<string, any> = { ...data };

  // System fields cannot be written manually
  delete filtered.id;
  delete filtered.createdAt;
  delete filtered.updatedAt;

  for (const key of Object.keys(data)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }

    const field = schemaShape[key];
    if (!field) {
      delete filtered[key];
      continue;
    }

    const meta = getFieldMeta(field);
    if (!meta) {
      continue;
    }

    // Read-only fields cannot be written
    if (meta.readOnly) {
      delete filtered[key];
      continue;
    }

    const canWrite = await resolveAccess(meta.access?.update, {
      user,
      doc: existingDoc,
      data,
    });

    if (!canWrite) {
      delete filtered[key];
    } else {
      // Recursively filter group fields
      if (meta.fieldType === 'group' && meta.shape && typeof data[key] === 'object' && data[key] !== null) {
        const existingGroup = existingDoc?.[key];
        filtered[key] = await filterFieldsForWrite(
          meta.shape,
          data[key],
          typeof existingGroup === 'object' ? existingGroup : undefined,
          user
        );
      }
      // Recursively filter array elements
      else if (meta.fieldType === 'array' && meta.shape && Array.isArray(data[key])) {
        const existingArray = Array.isArray(existingDoc?.[key]) ? existingDoc?.[key] : [];
        filtered[key] = await Promise.all(
          data[key].map(async (item: any, idx: number) => {
            if (typeof item === 'object' && item !== null) {
              return filterFieldsForWrite(
                meta.shape!,
                item,
                existingArray[idx],
                user
              );
            }
            return item;
          })
        );
      }
    }
  }

  return filtered;
}
