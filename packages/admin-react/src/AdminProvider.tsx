import { useStore } from '@nanostores/react';
import {
  $collections,
  $loading,
  $error,
  createAdminClient,
  type AdminClientConfig,
} from 'opacacms';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface AdminContextValue {
  client: ReturnType<typeof createAdminClient>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

export function useCollections() {
  return useStore($collections);
}

export function useLoading() {
  return useStore($loading);
}

export function useError() {
  return useStore($error);
}

interface AdminProviderProps {
  apiURL: string;
  children: ReactNode;
}

export function AdminProvider({ apiURL, children }: AdminProviderProps) {
  const client = createAdminClient({ apiURL });

  useEffect(() => {
    client.fetchCollections();
  }, []);

  return (
    <AdminContext.Provider value={{ client }}>{children}</AdminContext.Provider>
  );
}
