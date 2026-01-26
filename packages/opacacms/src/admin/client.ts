import { atom, map } from 'nanostores';

// Types
export interface CollectionMeta {
  slug: string;
  fields: FieldMeta[];
  timestamps: boolean;
}

export interface FieldMeta {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

export interface AdminClientConfig {
  apiURL: string;
}

// Stores
export const $adminConfig = atom<AdminClientConfig | null>(null);
export const $collections = atom<CollectionMeta[]>([]);
export const $currentCollection = atom<string | null>(null);
export const $documents = map<Record<string, any[]>>({});
export const $loading = atom<boolean>(false);
export const $error = atom<string | null>(null);

// Admin Client
export function createAdminClient(config: AdminClientConfig) {
  $adminConfig.set(config);

  const baseURL = config.apiURL;

  return {
    async fetchCollections() {
      $loading.set(true);
      try {
        const res = await fetch(`${baseURL}/__admin/collections`);
        const data = await res.json();
        $collections.set(data.collections);
        return data.collections as CollectionMeta[];
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    async find(collection: string) {
      $loading.set(true);
      try {
        const res = await fetch(`${baseURL}/${collection}`);
        const data = await res.json();
        $documents.setKey(collection, data.docs);
        return data.docs;
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    async findOne(collection: string, id: string) {
      $loading.set(true);
      try {
        const res = await fetch(`${baseURL}/${collection}/${id}`);
        return await res.json();
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    async create(collection: string, data: any) {
      $loading.set(true);
      try {
        const res = await fetch(`${baseURL}/${collection}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return await res.json();
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    async update(collection: string, id: string, data: any) {
      $loading.set(true);
      try {
        const res = await fetch(`${baseURL}/${collection}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        return await res.json();
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    async delete(collection: string, id: string) {
      $loading.set(true);
      try {
        await fetch(`${baseURL}/${collection}/${id}`, { method: 'DELETE' });
        return true;
      } catch (e: any) {
        $error.set(e.message);
        throw e;
      } finally {
        $loading.set(false);
      }
    },

    setCurrentCollection(slug: string) {
      $currentCollection.set(slug);
    },
  };
}
