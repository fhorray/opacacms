import type { App, InjectionKey } from 'vue';
import { createAdminClient, type AdminClientConfig } from 'opacacms';

export const AdminClientKey: InjectionKey<ReturnType<typeof createAdminClient>> = Symbol('AdminClient');

export function createAdminPlugin(config: AdminClientConfig) {
  const client = createAdminClient(config);

  return {
    install(app: App) {
      app.provide(AdminClientKey, client);
      // Auto-fetch collections on install
      client.fetchCollections();
    },
  };
}
