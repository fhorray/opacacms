# OpacaCMS: Future Roadmap & Enhancements (PayloadCMS Inspired)

This document outlines the strategic roadmap for OpacaCMS, heavily inspired by the architecture and developer experience of **PayloadCMS**. The goal is to transform OpacaCMS into a fully-featured, deeply extensible, code-first CMS.

---

## 1. Local API & Multi-Protocol APIs
PayloadCMS's superpower is its ability to run natively inside a Node.js/Next.js application without HTTP overhead.

- **Local API**: Provide a set of backend functions that bypass the REST layer entirely. This is essential for Next.js Server Components.

**Future Code Example:**
```typescript
import { getPayload } from 'opacacms';

// Fetching directly in a Next.js Server Component without fetch()
export default async function Page() {
  const opaca = await getPayload();
  
  const posts = await opaca.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' },
      'author.role': { in: ['admin', 'editor'] }
    },
    sort: '-createdAt',
    limit: 10,
  });

  return <PostList posts={posts.docs} />
}
```

## 2. Globals (Singletons)
Currently, OpacaCMS only supports "Collections" (arrays of documents).
- **Global Configurations**: Introduce `globals`, which are singleton documents (e.g., "Site Settings").

**Future Code Example:**
```typescript
export const SiteSettings = {
  slug: 'site-settings',
  type: 'global', // Instead of 'collection'
  label: 'Site Settings',
  schema: z.object({
    siteName: z.text({ label: 'Site Name', required: true }),
    maintenanceMode: z.checkbox({ label: 'Maintenance Mode', defaultValue: false }),
    contactEmail: z.text({ label: 'Contact Email' })
  }),
};

// Fetching a global
const settings = await opaca.findGlobal({ slug: 'site-settings' });
```

## 3. Advanced Fields & The "Blocks" Pattern
To handle rich, dynamic page building.

- **Blocks Field (Matrix)**: Allow developers to define reusable layout blocks that editors can arbitrarily stack and reorder.

**Future Code Example:**
```typescript
// Define reusable blocks
const HeroBlock = z.object({
  heading: z.text({ label: 'Heading' }),
  backgroundImage: z.upload({ collection: 'media' })
});

const QuoteBlock = z.object({
  quote: z.textarea({ label: 'Quote Text' }),
  author: z.text({ label: 'Author' })
});

// Use in a collection
export const Pages = {
  slug: 'pages',
  schema: z.object({
    title: z.text({ required: true }),
    // The magical blocks field
    layout: z.blocks('Layout', [
      { slug: 'hero', schema: HeroBlock },
      { slug: 'quote', schema: QuoteBlock }
    ])
  })
};
```

## 4. Deep Extensibility via Lifecycle Hooks
Payload relies heavily on Hooks to execute business logic without hacking the core.

**Future Code Example:**
```typescript
export const Users = {
  slug: 'users',
  schema: z.object({
    email: z.text({ required: true }),
    password: z.text({ required: true }),
  }),
  hooks: {
    // Hash password before saving to the database
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create' || data.password) {
          data.password = await hashPassword(data.password);
        }
        return data; // Return mutated data
      }
    ],
    // Send welcome email after user is created
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          await sendWelcomeEmail(doc.email);
        }
      }
    ]
  }
};
```

## 5. Granular Access Control (Function-based RBAC)
Instead of just string-based roles, access control properties should accept asynchronous functions.

**Future Code Example:**
```typescript
export const Posts = {
  slug: 'posts',
  schema: z.object({
    title: z.text(),
    author: z.relation({ collection: 'users' }),
  }),
  access: {
    // Anyone can read
    read: () => true,
    
    // Only logged in users can create
    create: ({ req }) => Boolean(req.user),
    
    // You can only update the post if you are the author OR an admin
    update: ({ req, id, data }) => {
      if (req.user?.role === 'admin') return true;
      
      // Return a query constraint! Only updates where author matches req.user.id
      return {
        author: { equals: req.user?.id }
      };
    }
  }
};
```

## 6. Document Versions, Drafts & Autosave
First-class support for `_status: 'draft' | 'published'` and version history.

**Future Code Example:**
```typescript
export const Posts = {
  slug: 'posts',
  versions: {
    drafts: true, // Enables saving as draft
    maxPerDoc: 50 // Keep last 50 versions for history/rollback
  },
  schema: z.object({ ... })
};

// Querying drafts requires special flags
const publishedPosts = await opaca.find({ collection: 'posts' }); // Defaults to published
const allPosts = await opaca.find({ collection: 'posts', draft: true }); // Includes drafts
```

## 7. Field-Level Localization (i18n)
Instead of creating separate documents for different languages, allow developers to mark specific fields as `localized: true`.

**Future Code Example:**
```typescript
const app = await new OpacaCMS({
  localization: {
    locales: ['en', 'pt-BR', 'es'],
    defaultLocale: 'en',
    fallback: true,
  },
  collections: [
    {
      slug: 'posts',
      schema: z.object({
        title: z.text({ localized: true }), // Will be stored as a JSON object of locales in DB
        date: z.date({ localized: false }), // Same date for all locales
      })
    }
  ]
}).init();

// Fetching localized content via Local API
const ptPosts = await opaca.find({
  collection: 'posts',
  locale: 'pt-BR' // Resolves localized fields automatically
});
```

## 8. Admin UI Customization (UI Fields)
A field type that doesn't save any data to the database but allows developers to inject pure custom React/Vanilla UI components into the admin panel.

**Future Code Example:**
```typescript
export const Orders = {
  slug: 'orders',
  schema: z.object({
    totalAmount: z.number(),
    
    // Inject a custom React component into the form
    printInvoiceButton: z.ui({
      label: 'Actions',
      component: 'src/admin/components/PrintInvoiceButton.tsx'
    })
  })
};
```

## 9. Type-Safe Client SDK
Just like PayloadCMS provides a robust way to query the CMS from the frontend, OpacaCMS should provide a strongly-typed Client SDK.

- **Frontend Integration**: A dedicated NPM package (e.g., `@opacacms/client`) that allows developers to easily connect their React, Vue, or Svelte frontends to the CMS API.
- **End-to-End Type Safety**: The SDK should automatically infer types from the OpacaCMS schema configuration. This means developers get full autocomplete and compile-time checks when querying data on the client side, without ever having to manually write TypeScript interfaces.

**Future Code Example:**
```typescript
// On the client-side (e.g., React component or Vue script)
import { createClient } from '@opacacms/client';
import type { Config } from '../opaca.config'; // Import the inferred types from your backend

const opaca = createClient<Config>({
  serverURL: 'https://api.mycms.com'
});

async function fetchPosts() {
  // The 'posts' string and the return type of 'data' are fully type-safe!
  const { data, totalDocs } = await opaca.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' }
    },
    depth: 2 // Automatically resolve relations up to 2 levels deep
  });

  // Autocomplete works perfectly here based on the Zod schema!
  console.log(data[0].title); 
}
```
