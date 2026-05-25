# 🖤 OpacaCMS

**A lightweight, headless CMS toolkit that lives inside your own Hono or Next.js application.**

No external servers, no heavyweight admin panels, no vendor lock-in. OpacaCMS gives you a **REST API**, a **dark minimalist admin UI**, and a **RBAC system** that all run as regular routes in your existing Hono app — fully under your control. 🚀

---

## 📋 Table of Contents

- [Why OpacaCMS?](#-why-opacacms)
- [Installation](#-installation)
- [Core Concepts](#-core-concepts)
- [Getting Started](#-getting-started)
  - [Standalone Hono App](#1-standalone-hono-app)
  - [Next.js App Router Integration](#2-nextjs-app-router-integration)
- [Fields Reference](#-fields-reference)
  - [Common Options](#common-options-all-fields-share-these)
  - [text](#-text)
  - [textarea](#-textarea)
  - [number](#-number)
  - [checkbox](#-checkbox)
  - [select](#-select)
  - [multiselect](#️-multiselect)
  - [date](#-date)
  - [richtext](#-richtext)
  - [relation](#-relation)
  - [group](#-group)
  - [array](#-array)
  - [accordion](#-accordion)
- [Database Adapters](#-database-adapters)
  - [MemoryDatabaseAdapter](#memorydatabaseadapter)
  - [SQLiteDrizzleAdapter](#sqlitedrizzleadapter)
  - [Custom Adapter](#custom-adapter)
- [Role-Based Access Control](#-role-based-access-control)
  - [Collection-Level Access](#collection-level-access)
  - [Field-Level Access](#field-level-access)
  - [Custom Access Functions](#custom-access-functions)
- [REST API Reference](#-rest-api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [Collection Endpoints](#collection-endpoints)
  - [Query Parameters](#query-parameters)
- [Admin UI](#-admin-ui)
- [TypeScript Support](#-typescript-support)

---

## 🤔 Why OpacaCMS?

Most CMS solutions are a separate service you run alongside your app. OpacaCMS is different — it's a **library** that you embed directly into your application. This means:

- ✅ **Zero infrastructure overhead** — No extra Docker containers, no managed services.
- ✅ **Your database, your rules** — Bring your own SQLite file or swap in any custom adapter.
- ✅ **Full TypeScript** — Schema types flow from your collection definitions to your API responses.
- ✅ **Framework-native** — Runs as a standard Hono sub-application. Works anywhere Hono works: Node.js, Bun, Next.js, Vercel, Cloudflare Workers.

---

## 📦 Installation

```bash
# Bun (recommended)
bun add opacacms hono drizzle-orm better-sqlite3

# npm
npm install opacacms hono drizzle-orm better-sqlite3

# pnpm
pnpm add opacacms hono drizzle-orm better-sqlite3
```

> **Note:** `better-sqlite3` is only required if you are using the built-in `SQLiteDrizzleAdapter`. If you're using `MemoryDatabaseAdapter` or a custom adapter, you can skip it.

---

## 🧠 Core Concepts

Before jumping into the code, here are the three pillars of OpacaCMS:

| Concept | Description |
|---|---|
| **Collection** | A content type you define (e.g. `posts`, `products`). Each has a Zod-based schema, access rules, and a dedicated table in your database. |
| **Adapter** | The bridge between OpacaCMS and your database. Choose from the built-in adapters or implement your own. |
| **Access Rule** | A rule that controls who can read, create, update, or delete documents in a collection — or even individual fields. |

---

## 🚀 Getting Started

### 1. Standalone Hono App

This is the simplest way to boot up OpacaCMS with an in-memory database (perfect for prototyping):

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { OpacaCMS, MemoryDatabaseAdapter } from 'opacacms';
import { z } from 'opacacms/fields';

// 1. Create a database adapter (in-memory for quick start)
const adapter = new MemoryDatabaseAdapter();

// 2. Instantiate the CMS with declarative collections and automatic admin seeding
const cms = new OpacaCMS({
  db: adapter,
  admin: {
    email: 'admin@example.com',
    password: 'secret123',
  },
  collections: [
    {
      slug: 'posts',
      schema: z.object({
        title: z.text({ label: 'Title', required: true }),
        content: z.textarea({ label: 'Content' }).optional(),
        published: z.checkbox({ label: 'Published', defaultValue: false }),
      }),
      access: {
        read: 'public',
        create: 'authenticated',
        update: 'authenticated',
        delete: ['admin'],
      },
    },
  ],
});

// 3. Initialize the CMS (syncs schemas and seeds users asynchronously)
const app = await cms.init();

// Optional: redirect root to the admin panel
app.get('/', (c) => c.redirect('/admin'));

serve({ fetch: app.fetch, port: 3000 });
console.log('CMS running at http://localhost:3000');
```

> The CMS mounts two route groups automatically:
> - 📡 **`/api`** — REST API for all collections + auth endpoints.
> - 🖥️ **`/admin`** — Dark-themed admin web panel.

---

### 2. Next.js App Router Integration

Create a catch-all route at `src/app/[[...route]]/route.ts` to let Hono handle everything:

```ts
import { handle } from 'hono/vercel';
import { OpacaCMS, SQLiteDrizzleAdapter } from 'opacacms';
import { z } from 'opacacms/fields';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// 1. Initialize SQLite database
const sqliteDb = new Database('cms.db');
const db = drizzle(sqliteDb);

// 2. Boot up the CMS (built-in/collection tables and admin seeding are handled automatically)
const app = await new OpacaCMS({
  db: new SQLiteDrizzleAdapter(db, { sqliteDb }),
  admin: {
    email: 'admin@example.com',
    password: 'secret123',
  },
  collections: [
    {
      slug: 'posts',
      schema: z.object({
        title: z.text({ label: 'Title', required: true }),
        content: z.textarea({ label: 'Content' }).optional(),
        published: z.checkbox({ label: 'Published', defaultValue: false }),
      }),
      access: {
        read: 'public',
        create: 'authenticated',
        update: 'authenticated',
        delete: ['admin'],
      },
    },
  ],
}).init();

// Redirect root to admin panel
app.get('/', (c) => c.redirect('/admin'));

// Export Next.js App Router handlers
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
```

> ⚠️ **Windows + Bun Tip:** If your `next dev` script fails with a `"git clone"` error, update your `package.json` scripts to use Node directly:
> ```json
> "dev": "node node_modules/next/dist/bin/next dev"
> ```
> This is a known Bun bug on Windows when resolving local monorepo paths.

---

## 🔒 First-time Setup & Production Security

OpacaCMS features a secure, automatic setup flow to prevent hardcoded administrator credentials from leaking into production.

### Development Seeding
During local development, you can use the `admin` option in the `OpacaCMS` constructor to automatically seed an administrator user on startup:
```ts
const cms = new OpacaCMS({
  db: adapter,
  admin: {
    email: 'admin@example.com',
    password: 'secretpassword123',
  },
  collections: [...]
});
```

### Production Setup (Recommended)
In **production** (when `process.env.NODE_ENV === 'production'`), the `admin` seeding configuration option is **completely disabled** for security reasons.

Instead, when you first deploy OpacaCMS and no users exist in the database:
1. Navigating to the Admin Panel (`/admin`) will automatically redirect you to the **First-time Setup Screen** at `/admin/setup`.
2. This setup page allows you to securely enter the administrator's email and password.
3. Once completed, your administrator account is hashed and saved, and you are automatically logged in.
4. The setup routes are then locked, and the Admin Panel redirects to `/admin/login` for subsequent authentication.

> [!IMPORTANT]
> The register endpoint `/api/auth/register` is also secured. If the database is empty, it allows registration (acting as the API-equivalent of the setup page). Once at least one user is present in the database, any subsequent registrations via `/api/auth/register` are locked down and **require the caller to be authenticated as an `admin`**.

---

## 🧩 Fields Reference

All field definitions come from `opacacms/fields`. Import the extended `z` namespace:

```ts
import { z } from 'opacacms/fields';
```

This `z` is a drop-in replacement for the standard `zod` `z` — it includes all of Zod's built-in types **plus** the OpacaCMS field creators below.

---

### Common Options (all fields share these)

Every field creator accepts a base set of options:

| Option | Type | Description |
|---|---|---|
| `label` | `string` | Human-readable label displayed in the admin UI. |
| `description` | `string` | Helper text shown below the field in the form. |
| `placeholder` | `string` | Input placeholder text. |
| `required` | `boolean` | Whether the field is required. Defaults to `true`. |
| `hidden` | `boolean` | Hides the field from the admin UI entirely. |
| `readOnly` | `boolean` | Prevents writes to the field through the API. |
| `defaultValue` | `any` | Default value pre-filled in the form. |
| `access` | `FieldAccess` | Per-field read/write access rules (see [Field-Level Access](#field-level-access)). |

---

### 📝 `text`

A single-line text input.

```ts
z.text({
  label: 'Post Title',
  required: true,
  minLength: 3,
  maxLength: 120,
  placeholder: 'Enter a title...',
})
```

| Extra Option | Type | Description |
|---|---|---|
| `minLength` | `number` | Minimum string length (validated by Zod). |
| `maxLength` | `number` | Maximum string length (validated by Zod). |

---

### 📄 `textarea`

A multi-line text input. Accepts the same options as `text`.

```ts
z.textarea({
  label: 'Post Content',
  required: false,
  placeholder: 'Write your content here...',
})
```

---

### 🔢 `number`

A numeric input field.

```ts
z.number({
  label: 'Price',
  min: 0,
  max: 9999,
  required: true,
})
```

| Extra Option | Type | Description |
|---|---|---|
| `min` | `number` | Minimum allowed value. |
| `max` | `number` | Maximum allowed value. |

---

### ✅ `checkbox`

A boolean toggle (true/false).

```ts
z.checkbox({
  label: 'Is Featured?',
  defaultValue: false,
})
```

---

### 📌 `select`

A single-choice dropdown. Requires at least one option.

```ts
// Simple string options
z.select({
  label: 'Status',
  options: ['draft', 'published', 'archived'],
})

// Or with custom labels
z.select({
  label: 'Status',
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
  ],
})
```

---

### 🗂️ `multiselect`

A multi-choice field that stores an array of selected string values.

```ts
z.multiselect({
  label: 'Tags',
  options: ['tech', 'design', 'business', 'culture'],
})
```

---

### 📅 `date`

A date picker. Values are stored as **ISO-8601 strings** (e.g. `"2024-01-15"`).

```ts
z.date({
  label: 'Published At',
  required: false,
})
```

---

### ✍️ `richtext`

A rich text / markdown field. Stored as a raw string.

```ts
z.richtext({
  label: 'Article Body',
  required: true,
})
```

---

### 🔗 `relation`

A reference to a document in another collection. Stored as the ID string of the related document.

```ts
z.relation({
  label: 'Author',
  collection: 'authors', // the slug of the related collection
  required: true,
})
```

---

### 📦 `group`

Nests a set of fields under a common label. Stored as a serialized JSON object in the database.

```ts
z.group('SEO Metadata', {
  metaTitle: z.text({ label: 'Meta Title' }),
  metaDescription: z.textarea({ label: 'Meta Description', required: false }),
  canonicalUrl: z.text({ label: 'Canonical URL', required: false }),
})
```

**Signature:** `z.group(label: string, shape: Record<string, ZodTypeAny>)`

---

### 🔁 `array`

A repeatable list of structured rows. Each row is defined by a `shape`. Stored as JSON.

```ts
z.array('FAQ Items', {
  question: z.text({ label: 'Question', required: true }),
  answer: z.textarea({ label: 'Answer', required: true }),
}, { required: false })
```

**Signature:** `z.array(label: string, shape: Record<string, ZodTypeAny>, opts?: BaseFieldOptions)`

The admin UI renders an "Add Row" button for arrays, allowing editors to add/remove rows dynamically.

---

### 🪗 `accordion`

Visual-only field container that renders as a collapsible section in the admin UI. Behaves identically to `group` in terms of storage.

```ts
z.accordion('Advanced Settings', {
  customCss: z.textarea({ label: 'Custom CSS', required: false }),
  embedCode: z.textarea({ label: 'Embed Code', required: false }),
})
```

**Signature:** `z.accordion(label: string, shape: Record<string, ZodTypeAny>)`

---

## 💾 Database Adapters

OpacaCMS is storage-agnostic. All database operations go through the `DatabaseAdapter` interface, so you can swap backends without changing any application code.

### `MemoryDatabaseAdapter`

Stores everything in-memory. Data is **lost when the process restarts**. Ideal for prototyping, testing, and development.

```ts
import { MemoryDatabaseAdapter } from 'opacacms';

const adapter = new MemoryDatabaseAdapter();
const cms = new OpacaCMS({ db: adapter });
```

---

### `SQLiteDrizzleAdapter`

Persists data to a local SQLite file via Drizzle ORM. Best for production deployments on a single server, edge functions, or serverless environments.

```ts
import { SQLiteDrizzleAdapter } from 'opacacms';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqliteDb = new Database('./my-cms.db');
const db = drizzle(sqliteDb);

// Pass sqliteDb to enable auto schema synchronization on initialization
const adapter = new SQLiteDrizzleAdapter(db, { sqliteDb });
```

The adapter automatically:
- Creates the built-in system tables (`opaca_users`, `opaca_sessions`) if they do not exist.
- Creates the collection tables dynamically based on their schema shapes.
- Automatically adds columns for any new fields you define in your collection schemas without throwing errors on pre-existing rows (uses additive `ALTER TABLE ADD COLUMN` queries without `NOT NULL` constraints, relying on Zod for validation at the app level).

The adapter also automatically handles:
- Serializing complex field types (`group`, `array`, `accordion`, `relation`) as JSON in the database.
- Deserializing them back to JavaScript objects when reading.

---

### Custom Adapter

Implement the `DatabaseAdapter` interface to connect to any backend (PostgreSQL, MongoDB, an external API, etc.):

```ts
import type { DatabaseAdapter, Document, QueryOptions, Session, User } from 'opacacms';

class MyPostgresAdapter implements DatabaseAdapter {
  // Collection CRUD
  async find(collection: string, query?: QueryOptions): Promise<Document[]> { /* ... */ }
  async findById(collection: string, id: string): Promise<Document | null> { /* ... */ }
  async create(collection: string, data: Record<string, unknown>): Promise<Document> { /* ... */ }
  async update(collection: string, id: string, data: Partial<Record<string, unknown>>): Promise<Document> { /* ... */ }
  async delete(collection: string, id: string): Promise<void> { /* ... */ }
  async count(collection: string, query?: QueryOptions): Promise<number> { /* ... */ }

  // Session management
  async createSession(session: Session): Promise<Session> { /* ... */ }
  async findSession(sessionId: string): Promise<{ session: Session; user: User } | null> { /* ... */ }
  async deleteSession(sessionId: string): Promise<void> { /* ... */ }
  async updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void> { /* ... */ }

  // User management
  async createUser(user: User): Promise<User> { /* ... */ }
  async findUserByEmail(email: string): Promise<User | null> { /* ... */ }
  async findUser(userId: string): Promise<User | null> { /* ... */ }
}
```

---

## 🛡️ Role-Based Access Control

Access control in OpacaCMS is configured at two levels: **collection-level** (who can CRUD entire collections) and **field-level** (which fields specific roles can see or edit).

### Collection-Level Access

Pass an `access` object when defining a collection configuration inside the `collections` array:

```ts
const productCollection = {
  slug: 'products',
  schema: productSchema,
  access: {
    read: 'public',              // No auth needed to read
    create: 'authenticated',     // Any logged-in user can create
    update: ['admin', 'editor'], // Only users with role 'admin' or 'editor'
    delete: ['admin'],           // Only admins
  },
};
```

### Access Rule Types

| Rule | Behavior |
|---|---|
| `undefined` | Defaults to **allow** (no restriction). |
| `'public'` | Always allowed, even for unauthenticated users. |
| `'authenticated'` | Requires any logged-in user (any role). |
| `string[]` | Allows only users whose `role` is in the array (e.g. `['admin', 'manager']`). |
| `function` | Custom async function — you decide the logic. |

### Field-Level Access

You can restrict **read** and **write** access on individual fields:

```ts
const userCollection = {
  slug: 'users',
  schema: z.object({
    name: z.text({ label: 'Name' }),

    // Only 'admin' role can see the internal notes field
    internalNotes: z.textarea({
      label: 'Internal Notes',
      required: false,
      access: {
        read: ['admin'],
        update: ['admin'],
      },
    }),

    // Password hash is always hidden from reads
    passwordHash: z.text({
      label: 'Password Hash',
      hidden: true,
      readOnly: true,
    }),
  }),
};
```

### Custom Access Functions

For complex logic, pass an async function instead of a string:

```ts
access: {
  // Only allow a user to update their own documents
  update: async ({ user, doc }) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return doc?.authorId === user.id;
  },

  // Only allow deletion of archived items
  delete: async ({ user, doc }) => {
    return user?.role === 'admin' && doc?.status === 'archived';
  },
},
```

The `AccessContext` object passed to your function has:

| Property | Type | Description |
|---|---|---|
| `user` | `AdminUser \| null` | The currently authenticated user, or `null` if unauthenticated. |
| `doc` | `Record<string, unknown> \| undefined` | The existing document (available on update/delete). |
| `data` | `Record<string, unknown> \| undefined` | The incoming request data (available on create/update). |

---

## 📡 REST API Reference

After calling `cms.init()`, the following API routes are available under the `/api` prefix:

### Auth Endpoints

| Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create a new admin/editor user. |
| `POST` | `/api/auth/login` | No | Log in and receive a session cookie. |
| `POST` | `/api/auth/logout` | No | Log out and clear the session cookie. |
| `GET` | `/api/auth/me` | No | Get the currently authenticated user. |

**Login example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "secret123"}'
```

**Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Authentication uses **HTTP-only session cookies** (`opaca_session`) with a 30-day sliding expiration window. The session token is stored as a SHA-256 hash in the database for security.

---

### Collection Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/collections/:slug` | List all documents in a collection. |
| `GET` | `/api/collections/:slug/:id` | Get a single document by ID. |
| `POST` | `/api/collections/:slug` | Create a new document. |
| `PATCH` | `/api/collections/:slug/:id` | Update an existing document (partial). |
| `DELETE` | `/api/collections/:slug/:id` | Delete a document. |

**Fetch posts (public access):**
```bash
curl http://localhost:3000/api/collections/posts
```

**Create a post (requires auth cookie):**
```bash
curl -X POST http://localhost:3000/api/collections/posts \
  -H "Content-Type: application/json" \
  -b "opaca_session=<your-token>" \
  -d '{"title": "Hello World", "content": "My first post.", "published": true}'
```

**Response:**
```json
{
  "id": "uuid-here",
  "title": "Hello World",
  "content": "My first post.",
  "published": true,
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

All read responses automatically filter out fields the current user doesn't have read access to. All write requests automatically strip out read-only or restricted fields before validating and saving.

---

### Query Parameters

The list endpoint (`GET /api/collections/:slug`) supports these query parameters:

| Parameter | Example | Description |
|---|---|---|
| `limit` | `?limit=10` | Maximum number of results to return. |
| `offset` | `?offset=20` | Number of results to skip (for pagination). |
| `sortField` | `?sortField=createdAt` | Field name to sort by. |
| `sortOrder` | `?sortOrder=desc` | Sort direction: `asc` (default) or `desc`. |
| Any field | `?status=published` | Simple equality filter on any collection field. |

**Example — paginated, filtered, sorted request:**
```bash
curl "http://localhost:3000/api/collections/posts?published=true&limit=5&offset=0&sortField=createdAt&sortOrder=desc"
```

---

## 🖥️ Admin UI

OpacaCMS ships with a built-in web admin panel, mounted at `/admin`. It's a **server-rendered HTML interface** — no JS framework, no bundle, no external CDN dependencies.

Key pages:

| Route | Description |
|---|---|
| `/admin/login` | Login form. |
| `/admin` | Dashboard listing all registered collections. |
| `/admin/collections/:slug` | List all documents in a collection. |
| `/admin/collections/:slug/new` | Create a new document form. |
| `/admin/collections/:slug/:id` | Edit an existing document form. |

The UI generates input elements dynamically based on your collection's Zod schema. Field types are automatically mapped to the correct HTML inputs (`<input>`, `<textarea>`, `<select>`, `<input type="checkbox">`, etc.). Array fields include a dynamic "Add Row" / "Remove Row" mechanism.

**Design principles:**
- 🖤 Near-black `#0a0a0a` background — easy on the eyes.
- 📐 Minimal 4px border radius — no bubbly UI.
- ⚡ Zero JavaScript animations — loads and navigates instantly.
- 🧩 Pure HTML/CSS — no client-side framework required.

---

## 🔷 TypeScript Support

OpacaCMS is written in TypeScript. You can infer the shape of your collection documents:

```ts
import { z } from 'opacacms/fields';

const postSchema = z.object({
  title: z.text({ label: 'Title' }),
  published: z.checkbox({ label: 'Published' }),
});

// Infer the TypeScript type from your schema
type Post = z.infer<typeof postSchema>;
// { title: string; published: boolean }
```

The `z` namespace from `opacacms/fields` re-exports Zod's `infer`, `ZodTypeAny`, and `ZodRawShape` types so your existing Zod usage continues to work normally.

---

## 🚀 Advanced Roadmap Features & Enhancements

OpacaCMS includes premium architecture patterns inspired by code-first CMS design principles:

### 1. Local API & Relationship Population Depth
Interact directly with the database programmatically bypassing HTTP entirely, with support for populating relation fields to any arbitrary nesting level.

```typescript
import { getPayload } from 'opacacms';

const opaca = await getPayload();

// Querying posts with relationship population depth of 2
const posts = await opaca.find({
  collection: 'posts',
  depth: 2,
});
```

### 2. Globals (Singletons)
Store single instance configurations such as Site Settings, Navigation Menus, and Layout configurations.

```typescript
import { z } from 'opacacms/fields';

export const SiteSettings = {
  slug: 'site-settings',
  label: 'Site Settings',
  schema: z.object({
    siteName: z.text({ label: 'Site Name', required: true }),
    maintenanceMode: z.checkbox({ label: 'Maintenance Mode', defaultValue: false }),
  })
};

// Retrieve Site Settings
const settings = await opaca.findGlobal({ slug: 'site-settings' });
```

### 3. Blocks Field (Layout Matrix)
Allow editors to build dynamic page layouts with reusable visual component blocks.

```typescript
import { z } from 'opacacms/fields';

const Pages = {
  slug: 'pages',
  schema: z.object({
    title: z.text({ required: true }),
    layout: z.blocks('Layout Matrix', [
      { slug: 'hero', schema: HeroBlockSchema },
      { slug: 'quote', schema: QuoteBlockSchema }
    ])
  })
};
```

### 4. Lifecycle Hooks
Run asynchronous hooks before or after operations to hash passwords, trigger emails, or synchronize with third-party webhooks.

```typescript
export const Users = {
  slug: 'users',
  schema: userSchema,
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && data.password) {
          data.password = await hashPassword(data.password);
        }
        return data;
      }
    ]
  }
};
```

### 5. Granular Access Control
Allow functions to return logical boolean criteria or filter constraints to conditionally restrict CRUD operations.

```typescript
export const Posts = {
  slug: 'posts',
  access: {
    read: () => true,
    update: ({ user }) => {
      if (user?.role === 'admin') return true;
      return { authorId: user?.id }; // restricts update to own posts
    }
  }
};
```

### 6. Document Versions & Drafts
Enables rollback history, drafts status (`_status: 'draft' | 'published'`), and version tracking across collection types.

```typescript
export const Posts = {
  slug: 'posts',
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  schema: postSchema,
};
```

### 7. Field-Level Localization (i18n)
Configure specific fields to hold translated content. OpacaCMS automatically resolves values based on requested locales.

```typescript
const postSchema = z.object({
  title: z.text({ localized: true }), // Stores localized strings in database
});

const doc = await opaca.find({ collection: 'posts', locale: 'pt-BR' });
```

### 8. Custom UI Fields
Inject custom interface components directly into the admin edit dashboard form layouts.

```typescript
const orderSchema = z.object({
  total: z.number(),
  invoiceButton: z.ui({
    label: 'Actions',
    component: 'components/InvoiceButton.tsx'
  })
});
```

### 9. Enhanced Multi-Relation Support
Relation fields support selecting multiple items concurrently via the `hasMany` configuration flag.

```typescript
z.relation({
  label: 'Tags',
  collection: 'tags',
  hasMany: true, // Stores reference IDs as array
})
```

---

## 🤝 Contributing

Pull requests are welcome. Keep code comments in English, write tests for new features, and make sure existing tests pass before submitting. Have fun! 🖤
