import type { DatabaseAdapter, Document } from './adapter';
import type { CollectionConfig } from '../cms';
import { getFieldMeta } from '../fields/utils';

export async function populateDocRelations(
  db: DatabaseAdapter,
  collections: Map<string, CollectionConfig>,
  collectionSlug: string,
  doc: Document,
  depth: number
): Promise<Document> {
  if (depth <= 0) return doc;
  const config = collections.get(collectionSlug);
  if (!config) return doc;

  const shape = config.schema.shape;
  const populated = { ...doc };

  for (const [key, field] of Object.entries(shape)) {
    const meta = getFieldMeta(field as any);
    if (!meta) continue;

    if (meta.fieldType === 'relation' && meta.collection) {
      const val = doc[key];
      if (meta.hasMany) {
        if (Array.isArray(val)) {
          const resolved = [];
          for (const id of val) {
            if (typeof id === 'string') {
              const relDoc = await db.findById(meta.collection, id);
              if (relDoc) {
                const fullyResolved = await populateDocRelations(db, collections, meta.collection, relDoc, depth - 1);
                resolved.push(fullyResolved);
              }
            }
          }
          populated[key] = resolved;
        }
      } else {
        if (typeof val === 'string' && val) {
          const relDoc = await db.findById(meta.collection, val);
          if (relDoc) {
            populated[key] = await populateDocRelations(db, collections, meta.collection, relDoc, depth - 1);
          }
        }
      }
    }
  }

  return populated;
}
