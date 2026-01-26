import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $collections, $router, navigateTo, createAdminClient } from 'opacacms';
import { useAdmin } from '../AdminProvider';

export function CollectionList() {
  const page = useStore($router);
  const { client } = useAdmin();
  const collections = useStore($collections);
  const [docs, setDocs] = useState<any[]>([]);

  const collection =
    page?.route === 'collection' ? page.params.collection : null;
  const meta = collections.find((c) => c.slug === collection);

  useEffect(() => {
    if (collection) {
      client.find(collection).then(setDocs);
    }
  }, [collection]);

  if (!meta) {
    return (
      <div className="text-gray-400">Select a collection from the sidebar</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{meta.slug}</h1>
        <a
          href={`/${collection}/create`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          + Create
        </a>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
              {meta.fields.slice(0, 3).map((f) => (
                <th
                  key={f.name}
                  className="px-4 py-3 text-left text-sm font-medium"
                >
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-gray-400">{doc.id}</td>
                {meta.fields.slice(0, 3).map((f) => (
                  <td key={f.name} className="px-4 py-3">
                    {String(doc[f.name] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/${collection}/${doc.id}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {docs.length === 0 && (
          <div className="p-8 text-center text-gray-500">No documents yet</div>
        )}
      </div>
    </div>
  );
}
