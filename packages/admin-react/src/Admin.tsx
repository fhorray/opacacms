import { useStore } from '@nanostores/react';
import {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  $collections,
  $loading,
  createAdminClient,
  createAdminRouter,
  navigateTo,
  getPath,
  type CollectionMeta,
  type FieldMeta,
} from 'opacacms';

// ============ Context ============
interface AdminContextValue {
  client: ReturnType<typeof createAdminClient>;
  router: ReturnType<typeof createAdminRouter>;
  apiURL: string;
  basePath: string;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within Admin');
  return ctx;
}

export function useCollections() {
  return useStore($collections);
}

// ============ Icons ============
const Icons = {
  folder: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  plus: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  edit: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  trash: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  back: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
  check: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

// ============ Link Component ============
function Link({ href, className, children, route, params, ...props }: any) {
  const { router } = useAdmin();

  const handleClick = (e: React.MouseEvent) => {
    if (route) {
      e.preventDefault();
      navigateTo(router, route, params || {});
    } else if (href && href.startsWith('/')) {
      e.preventDefault();
      // If we only have href, we can try to find the route or just push state
      // But better to always use route/params for internal links
      window.history.pushState(null, '', href);
      // Force popstate to notify nanostores if needed, or just let it be.
      // Better way: use router.openPage for external-like internal links?
    }
  };

  return (
    <a href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

// ============ Sidebar ============
function Sidebar() {
  const collections = useCollections();
  const { router, basePath } = useAdmin();
  const page = useStore(router);

  return (
    <aside className="w-72 bg-slate-900/50 backdrop-blur border-r border-white/5 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link route="home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">OpacaCMS</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </Link>
        </div>
      </div>
      <nav className="flex-1 p-4 overflow-auto">
        <h2 className="text-xs uppercase text-slate-500 font-semibold mb-4 px-3 tracking-wider font-sans">
          Collections
        </h2>
        <ul className="space-y-1">
          {collections.map((col) => (
            <li key={col.slug}>
              <Link
                route="collection"
                params={{ collection: col.slug }}
                href={getPath(router, 'collection', { collection: col.slug })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  page?.route === 'collection' &&
                  page?.params?.collection === col.slug
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span
                  className={
                    page?.route === 'collection' &&
                    page?.params?.collection === col.slug
                      ? 'text-blue-400'
                      : 'text-slate-500'
                  }
                >
                  {Icons.folder}
                </span>
                <span className="font-medium capitalize font-sans">
                  {col.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="text-xs text-slate-500 text-center font-sans">
          Powered by OpacaCMS
        </div>
      </div>
    </aside>
  );
}

// ============ Collection List ============
function CollectionList() {
  const { client, router } = useAdmin();
  const page = useStore(router);
  const collections = useCollections();

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const collection = page?.params?.collection;
  const meta = useMemo(
    () => collections.find((c: CollectionMeta) => c.slug === collection),
    [collections, collection],
  );

  useEffect(() => {
    if (collection) {
      setLoading(true);
      client.find(collection).then((data) => {
        setDocs(data);
        setLoading(false);
      });
    }
  }, [collection, client]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    await client.delete(collection!, id);
    setDocs(docs.filter((d) => d.id !== id));
  };

  if (!meta) return null;

  return (
    <div className="animate-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold capitalize font-sans">
            {collection}
          </h1>
          <p className="text-slate-400 mt-1 font-sans">
            {docs.length} documents
          </p>
        </div>
        <Link
          route="documentCreate"
          params={{ collection: collection! }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25 font-sans"
        >
          {Icons.plus}
          Create New
        </Link>
      </div>

      <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-sans">
            Loading...
          </div>
        ) : docs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
              {Icons.folder}
            </div>
            <p className="text-slate-400 font-sans">No documents yet</p>
            <Link
              route="documentCreate"
              params={{ collection: collection! }}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm block font-sans"
            >
              Create your first document →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
                  ID
                </th>
                {meta.fields.slice(0, 2).map((f) => (
                  <th
                    key={f.name}
                    className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans"
                  >
                    {f.label || f.name}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">
                    #{doc.id}
                  </td>
                  {meta.fields.slice(0, 2).map((f) => (
                    <td key={f.name} className="px-6 py-4 text-sm font-sans">
                      {String(doc[f.name] ?? '').slice(0, 40)}
                      {String(doc[f.name] ?? '').length > 40 ? '...' : ''}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        route="documentEdit"
                        params={{ collection: collection!, id: doc.id }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Edit"
                      >
                        {Icons.edit}
                      </Link>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============ Document Form ============
function DocumentForm() {
  const { client, router } = useAdmin();
  const page = useStore(router);
  const collections = useCollections();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const collection = page?.params?.collection;
  const editId = page?.params?.id;
  const isEdit = editId !== undefined && editId !== 'create';
  const meta = useMemo(
    () => collections.find((c) => c.slug === collection),
    [collections, collection],
  );

  useEffect(() => {
    if (isEdit && collection && editId) {
      setLoading(true);
      client.findOne(collection, editId).then((data) => {
        setFormData(data);
        setLoading(false);
      });
    }
  }, [collection, editId, isEdit, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!collection) return;

    if (isEdit && editId) {
      await client.update(collection, editId, formData);
    } else {
      await client.create(collection, formData);
    }
    setLoading(false);
    navigateTo(router, 'collection', { collection });
  };

  if (!meta) return null;

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <Link
        route="collection"
        params={{ collection: collection! }}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors font-sans"
      >
        {Icons.back}
        Back to list
      </Link>

      <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-white/10 p-8 shadow-2xl">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-3 font-sans">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm">
            {isEdit ? Icons.edit : Icons.plus}
          </span>
          {isEdit ? `Edit ${collection}` : `Create ${collection}`}
        </h1>

        {loading && isEdit ? (
          <div className="text-slate-400 font-sans">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {meta.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-2 font-sans">
                    {field.label || field.name}
                    {field.required && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </label>
                  {field.type === 'boolean' ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData[field.name]}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [field.name]: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </label>
                  ) : field.type === 'richtext' ? (
                    <textarea
                      value={formData[field.name] ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      rows={6}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none text-white font-sans"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.name] ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-white font-sans"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 font-sans"
              >
                {Icons.check}
                {isEdit ? 'Update' : 'Create'}
              </button>
              <Link
                route="collection"
                params={{ collection: collection! }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors border border-white/10 flex items-center justify-center text-center font-sans"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============ Welcome Screen ============
function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center h-full animate-in">
      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-xl">
          <span className="text-5xl">🚀</span>
        </div>
        <h1 className="text-3xl font-bold mb-3 font-sans">
          Welcome to OpacaCMS
        </h1>
        <p className="text-slate-400 max-w-md font-sans">
          Select a collection from the sidebar to view and manage your content.
        </p>
      </div>
    </div>
  );
}

// ============ Router Component ============
function AdminRouter() {
  const { router } = useAdmin();
  const page = useStore(router);

  if (!page || page.route === 'home') {
    return <WelcomeScreen />;
  }

  if (page.route === 'collection') {
    return <CollectionList />;
  }

  if (page.route === 'documentEdit' || page.route === 'documentCreate') {
    return <DocumentForm />;
  }

  return <WelcomeScreen />;
}

// ============ Main Admin Component ============
export interface AdminProps {
  apiURL: string;
  basePath?: string;
}

export function Admin({ apiURL, basePath = '' }: AdminProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const client = useMemo(() => createAdminClient({ apiURL }), [apiURL]);
  const router = useMemo(
    () =>
      createAdminRouter({
        basePath,
        links: true, // Enable links now that we have a custom Link component
      }),
    [basePath],
  );

  useEffect(() => {
    if (mounted) {
      client.fetchCollections();
    }
  }, [client, mounted]);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-slate-950 text-white font-sans items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-xl" />
          <div className="w-32 h-4 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ client, router, apiURL, basePath }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .font-sans { font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }
        @keyframes animate-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: animate-in 0.3s ease-out; }
      `}</style>

      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <AdminRouter />
        </main>
      </div>
    </AdminContext.Provider>
  );
}

export default Admin;
