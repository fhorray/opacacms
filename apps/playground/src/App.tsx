import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $router } from './stores/router';
import { $session, $needsSetup, $isLoading, $error } from './stores/auth';
import { redirectPage } from '@nanostores/router';
import { SetupPage } from './pages/Setup';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CollectionsPage } from './pages/Collections';
import { DocumentsPage } from './pages/Documents';
import { DocumentEditor } from './pages/DocumentEditor';
import { Layout } from './components/opaca/Layout';

export default function App() {
  const page = useStore($router);
  const session = useStore($session);
  const needsSetup = useStore($needsSetup);
  const isLoading = useStore($isLoading);
  const error = useStore($error);

  useEffect(() => {
    if (!isLoading && needsSetup === true && page?.route !== 'setup') {
      redirectPage($router, 'setup');
    }
    if (!isLoading && needsSetup === false && page?.route === 'setup') {
      redirectPage($router, 'home');
    }
  }, [needsSetup, page, isLoading]);

  if (isLoading || needsSetup === null) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">
          Loading OpacaCMS...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full p-6 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Backend Error</h2>
          <p className="text-sm opacity-90 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (needsSetup === true) return <SetupPage />;

  if (!page)
    return (
      <div className="flex items-center justify-center min-h-screen text-center flex-col gap-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Button onClick={() => redirectPage($router, 'home')}>Go Home</Button>
      </div>
    );

  if (!session && page.route !== 'login') {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (page.route) {
      case 'home':
      case 'dashboard':
        return <Dashboard />;
      case 'collections':
        return <CollectionsPage />;
      case 'collection':
        return <DocumentsPage />;
      case 'newDocument':
      case 'editDocument':
        return <DocumentEditor />;
      case 'setup':
        return <SetupPage />;
      case 'login':
        return <LoginPage />;
      default:
        return <div>404</div>;
    }
  };

  const isFullPage = ['setup', 'login'].includes(page.route);

  if (isFullPage) return renderContent();

  return <Layout>{renderContent()}</Layout>;
}

// Internal Button copy if Shadcn button hasn't been imported/fixed in App.tsx context
function Button({ children, onClick, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity ${className}`}
    >
      {children}
    </button>
  );
}
