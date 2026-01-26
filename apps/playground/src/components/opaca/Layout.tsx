import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $router } from '../../stores/router';
import { $session } from '../../stores/auth';
import { $collections, fetchCollections } from '../../stores/collections';
import { redirectPage } from '@nanostores/router';
import {
  LayoutDashboard,
  Database,
  LogOut,
  ChevronRight,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const page = useStore($router);
  const session = useStore($session);
  const collections = useStore($collections);

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.reload();
  };

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' },
    { label: 'Collections', icon: Database, route: 'collections' },
  ];

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-lg shadow-primary/20">
              O
            </div>
            <span className="font-bold text-xl tracking-tight">OpacaCMS</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Main Menu
            </p>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.route}
                  onClick={() => redirectPage($router, item.route as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group ${
                    page?.route === item.route
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`size-4 ${page?.route === item.route ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {page?.route === item.route && (
                    <ChevronRight className="size-4 opacity-50" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Collections
              </p>
              <PlusCircle className="size-3 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            </div>
            <div className="space-y-1">
              {collections.map((coll) => (
                <button
                  key={coll.slug}
                  onClick={() =>
                    redirectPage($router, 'collection', { slug: coll.slug })
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group ${
                    (page?.route === 'collection' ||
                      page?.route === 'newDocument' ||
                      page?.route === 'editDocument') &&
                    page.params.slug === coll.slug
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
                    <span className="font-medium capitalize">{coll.slug}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">
              {session?.user.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {session?.user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/50 backdrop-blur-sm relative">
        {children}
      </main>
    </div>
  );
};
