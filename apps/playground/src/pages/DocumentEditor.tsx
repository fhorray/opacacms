import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $router } from '../stores/router';
import { $collections } from '../stores/collections';
import { redirectPage } from '@nanostores/router';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/src/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export const DocumentEditor = () => {
  const page = useStore($router);
  const collections = useStore($collections);

  const isNew = page?.route === 'newDocument';
  const slug = (page?.params as any)?.slug;
  const id = !isNew ? (page?.params as any)?.id : null;
  const collection = collections.find((c) => c.slug === slug);

  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew && id && slug) {
      loadDocument();
    }
  }, [id, slug, isNew]);

  const loadDocument = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/${slug}/${id}`);
      const data = (await res.json()) as any;
      setFormData(data.doc || {});
    } catch (e) {
      setError('Failed to load document');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = isNew ? `/api/${slug}` : `/api/${slug}/${id}`;
    const method = isNew ? 'POST' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        redirectPage($router, 'collection', { slug: slug! });
      } else {
        const data = (await res.json()) as any;
        setError(data.message || 'Failed to save document');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (!collection)
    return <div className="p-8 text-destructive">Collection not found</div>;
  if (fetching)
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => redirectPage($router, 'collection', { slug: slug! })}
        className="flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors group mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />{' '}
        Back to List
      </button>

      <form onSubmit={handleSubmit}>
        <Card className="border-border/30 bg-card/20 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight">
              {isNew ? 'Create New' : 'Edit'}{' '}
              <span className="text-primary capitalize">{slug}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {collection.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label
                    htmlFor={field.name}
                    className="capitalize font-bold text-foreground"
                  >
                    {field.name}{' '}
                    {field.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>

                  {field.type === 'richtext' ? (
                    <Textarea
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${field.name}...`}
                      className="min-h-32 bg-background/50"
                      required={field.required}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={formData[field.name] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${field.name}...`}
                      className="bg-background/50 h-11"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-border/10 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                redirectPage($router, 'collection', { slug: slug! })
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-32 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save {slug}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
