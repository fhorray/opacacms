import { createAPIRouter, createBetterSQLiteAdapter } from 'opacacms/api';
import { defineConfig } from 'opacacms';

// Configuration with example collections
const config = defineConfig({
  serverURL: 'http://localhost:3000',
  db: createBetterSQLiteAdapter('./cms.db'),
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'content', type: 'richtext', label: 'Content' },
        { name: 'author', type: 'text', label: 'Author' },
        { name: 'published', type: 'boolean', label: 'Published' },
      ],
      timestamps: true,
    },
    {
      slug: 'categories',
      fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'description', type: 'text', label: 'Description' },
      ],
    },
    {
      slug: 'users',
      fields: [
        { name: 'email', type: 'text', label: 'Email', required: true },
        { name: 'name', type: 'text', label: 'Full Name' },
        { name: 'role', type: 'text', label: 'Role' },
      ],
      timestamps: true,
    },
  ],
});

// Initialize database once
let initialized = false;
async function initDB() {
  if (!initialized) {
    await config.db.connect();
    await config.db.migrate(config.collections);
    initialized = true;
    console.log('✅ OpacaCMS DB initialized');
  }
}

// Create API router
const apiRouter = createAPIRouter(config);

// Helper to handle requests
async function handleRequest(request: Request, params: { path: string[] }) {
  await initDB();

  const pathname = '/' + (params.path?.join('/') || '');
  const url = new URL(request.url);
  const newUrl = new URL(pathname, url.origin);

  // Clone request with new URL
  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.text()
    : undefined;

  const newRequest = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body,
  });

  return apiRouter.fetch(newRequest);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, await params);
}
