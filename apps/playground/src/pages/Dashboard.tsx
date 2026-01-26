import React from 'react';
import { useStore } from '@nanostores/react';
import { $session } from '../stores/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

export const Dashboard = () => {
  const session = useStore($session);

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            OpacaCMS Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user.name}
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-40">
              {JSON.stringify(session, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize badge">
                {session?.user.role}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
