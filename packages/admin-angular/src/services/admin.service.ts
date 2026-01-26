import { Injectable, signal } from '@angular/core';
import { createAdminClient, type AdminClientConfig, type CollectionMeta } from 'opacacms';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private client!: ReturnType<typeof createAdminClient>;

  collections = signal<CollectionMeta[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  initialize(config: AdminClientConfig) {
    this.client = createAdminClient(config);
    this.fetchCollections();
  }

  async fetchCollections() {
    this.loading.set(true);
    try {
      const cols = await this.client.fetchCollections();
      this.collections.set(cols);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async find(collection: string) {
    this.loading.set(true);
    try {
      return await this.client.find(collection);
    } catch (e: any) {
      this.error.set(e.message);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async findOne(collection: string, id: string) {
    return await this.client.findOne(collection, id);
  }

  async create(collection: string, data: any) {
    return await this.client.create(collection, data);
  }

  async update(collection: string, id: string, data: any) {
    return await this.client.update(collection, id, data);
  }

  async delete(collection: string, id: string) {
    return await this.client.delete(collection, id);
  }
}
