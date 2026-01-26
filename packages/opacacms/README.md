# OpacaCMS

OpacaCMS is a lightweight, headless CMS library built for the modern web. It is database-agnostic (currently shipping with SQLite) and built on top of [Hono](https://hono.dev/) and [Zod](https://zod.dev/).

## Features

- **Database Agnostic**: Comes with SQLite adapter.
- **Type-Safe**: Built with TypeScript and Zod.
- **Headless API**: Auto-generated REST API for your content.
- **Flexible Content Modeling**: Define collections with typed fields.
- **Validation**: Automatic request validation based on your schemas.
- **Pagination & Filtering**: Built-in support for paginated results and advanced query filters.

## Installation

```bash
bun add opacacms
```

## Quick Start

1. **Create your configuration**

```typescript
import { createAPIRouter, createSQLiteAdapter } from 'opacacms';
import type { OpacaConfig } from 'opacacms';
import { Hono } from 'hono';

// Define your collections
const posts = {
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richtext' },
    { name: 'views', type: 'number', defaultValue: 0 },
    { name: 'published', type: 'boolean', defaultValue: false }
  ],
  timestamps: true
};

// Configure OpacaCMS
const config: OpacaConfig = {
  db: createSQLiteAdapter('mydb.sqlite'),
  collections: [posts]
};

// Initialize the API
const app = new Hono();
const api = createAPIRouter(config);

// Mount the API
app.route('/api', api);

// Start the server (Bun)
export default app;
```

2. **Run your server**

```bash
bun run index.ts
```

## API Usage

Once your server is running, you can interact with your collections via the API.

### Create a Document

```http
POST /api/posts
Content-Type: application/json

{
  "title": "Hello World",
  "content": "This is my first post",
  "published": true
}
```

### Get Documents (with Pagination)

```http
GET /api/posts?page=1&limit=10
```

Response:
```json
{
  "docs": [...],
  "totalDocs": 50,
  "limit": 10,
  "totalPages": 5,
  "page": 1,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### Filtering

You can filter results using query parameters.

**Simple Equality:**
```http
GET /api/posts?published=1
```

**Advanced Operators:**
(Supported operators: `gt`, `gte`, `lt`, `lte`, `like`, `ne`)

Find posts with more than 100 views:
```http
GET /api/posts?views[gt]=100
```

### Sorting

Sort by a field. Use `-` for descending order.

```http
GET /api/posts?sort=-createdAt
```

## Configuration Options

### Collection Fields

Supported field types:
- `text`
- `number`
- `boolean`
- `date`
- `richtext`
- `select`
- `relationship`
- `array`

### Hooks

You can define hooks for your collections to execute logic before/after operations.

```typescript
const posts = {
  slug: 'posts',
  fields: [...],
  hooks: {
    beforeCreate: (data) => {
      return { ...data, slug: generateSlug(data.title) };
    }
  }
};
```
