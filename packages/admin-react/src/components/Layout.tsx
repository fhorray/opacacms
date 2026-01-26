import { useStore } from '@nanostores/react';
import { $collections, $router, navigateTo } from 'opacacms';

export function Layout({ children }: { children?: React.ReactNode }) {
  const collections = useStore($collections);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">OpacaCMS</h1>
        </div>
        <nav className="p-4">
          <h2 className="text-xs uppercase text-gray-500 mb-3">Collections</h2>
          <ul className="space-y-1">
            {collections.map((col) => (
              <li key={col.slug}>
                <a
                  href={`/${col.slug}`}
                  className="block px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  {col.slug}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
