import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $router } from '../stores/router';
import {
  $collections,
  $currentDocuments,
  fetchDocuments,
} from '../stores/collections';
import { redirectPage } from '@nanostores/router';
import { Button } from '@/src/components/ui/button';
import { Plus, Edit2, Trash2, Calendar, User } from 'lucide-react';

export const DocumentsPage = () => {
  const page = useStore($router);
  const collections = useStore($collections);
  const docs = useStore($currentDocuments);

  const slug = page?.route === 'collection' ? page.params.slug : '';
  const collection = collections.find((c) => c.slug === slug);

  useEffect(() => {
    if (slug) fetchDocuments(slug);
  }, [slug]);

  if (!collection) return null;

  return (
    <div className="p-8 space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs mb-1">
            <span className="w-4 h-[2px] bg-primary"></span>
            Management
          </div>
          <h1 className="text-4xl font-black capitalize tracking-tight">
            {slug}
          </h1>
        </div>
        <Button
          onClick={() => redirectPage($router, 'newDocument', { slug })}
          className="shadow-lg shadow-primary/25"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </header>

      <div className="bg-card/30 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              {collection.fields.map((f) => (
                <th
                  key={f.name}
                  className="p-4 text-xs font-bold uppercase text-muted-foreground"
                >
                  {f.name}
                </th>
              ))}
              {collection.timestamps && (
                <th className="p-4 text-xs font-bold uppercase text-muted-foreground">
                  Date
                </th>
              )}
              <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {docs.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-12 text-center text-muted-foreground italic"
                >
                  No documents found in this collection.
                </td>
              </tr>
            ) : (
              docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-primary/5 transition-colors group"
                >
                  {collection.fields.map((f) => (
                    <td key={f.name} className="p-4">
                      <span className="font-medium">
                        {String(doc[f.name] || '-')}
                      </span>
                    </td>
                  ))}
                  {collection.timestamps && (
                    <td className="p-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  )}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() =>
                          redirectPage($router, 'editDocument', {
                            slug,
                            id: doc.id,
                          })
                        }
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
