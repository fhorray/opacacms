import React, { useState } from 'react';
import { $needsSetup, fetchSession, checkSetupStatus } from '../stores/auth';
import { redirectPage } from '@nanostores/router';
import { $router } from '../stores/router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

export const SetupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        await checkSetupStatus();
        await fetchSession();
        redirectPage($router, 'dashboard');
      } else {
        const data = (await res.json()) as any;
        setError(data.message || 'Failed to create admin user');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-vh-100 p-4">
      <Card className="w-full !w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Setup OpacaCMS</CardTitle>
          <CardDescription>
            Create the first administrator user to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="setup-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm font-medium text-red-600 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            form="setup-form"
            className="w-full font-bold"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
