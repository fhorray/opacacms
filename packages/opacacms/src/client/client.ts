import { atom, map } from 'nanostores';
import ky from "ky"

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
        const res = await ky.get(`${baseURL}/__admin/collections`);
        const data = await res.json() as any; // TODO: type it better
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
        const res = await ky.get(`${baseURL}/${collection}`);
        const data = await res.json() as any; // TODO: type it better
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
        const res = await ky.get(`${baseURL}/${collection}/${id}`);
        return await res.json() as any; // TODO: type it better
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
        const res = await ky.post(`${baseURL}/${collection}`, {
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
        const res = await ky.patch(`${baseURL}/${collection}/${id}`, {
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
        const res = await ky.delete(`${baseURL}/${collection}/${id}`);
        return await res.json();
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
