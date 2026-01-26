import React from 'react';
import { useStore } from '@nanostores/react';
import { $collections } from '../stores/collections';
import { redirectPage } from '@nanostores/router';
import { $router } from '../stores/router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/components/ui/card';
import { Database, ArrowRight } from 'lucide-react';

export const CollectionsPage = () => {
  const collections = useStore($collections);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Content Collections
        </h1>
        <p className="text-muted-foreground text-lg italic">
          Manage your content structures and entries here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((coll) => (
          <Card
            key={coll.slug}
            className="cursor-pointer group hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 bg-card/50"
            onClick={() =>
              redirectPage($router, 'collection', { slug: coll.slug })
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold capitalize">
                {coll.slug}
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Database className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Contains {coll.fields.length} schema fields
              </CardDescription>
              <div className="flex items-center text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                Explore Documents <ArrowRight className="ml-2 size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
