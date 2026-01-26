# Authentication & RBAC Roadmap

## Overview

We will leverage [better-auth](https://better-auth.com/) and its **Admin Plugin** to provide a fully integrated Role-Based Access Control (RBAC) system within OpacaCMS. Unlike the previous approach where the user had full control, OpacaCMS will manage the `better-auth` instance to ensure tight integration with the CMS's permission system.

## Goals

1.  **Integrated RBAC**: Use `better-auth/plugins/admin` to manage roles and permissions.
2.  **Configuration Driven**: Users define roles and permissions in their `opacacms.config.ts`, and OpacaCMS translates this to `better-auth` logic.
3.  **Automatic Mapping**: Collections defined in the CMS automatically become "Resources" in the RBAC system.

## Implementation Details

### 1. Internal Configuration

OpacaCMS will internally initialize `better-auth` with the Admin plugin. The user provides the database adapter and specific overrides, but the core plugin structure is fixed.

```typescript
// packages/opacacms/src/auth/index.ts

import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';

export function setupAuth(config: OpacaConfig) {
  // 1. Generate Statement based on Collections
  const resources = {};

  for (const collection of config.collections) {
    // Each collection gets standard CRUD permissions
    resources[collection.slug] = ['create', 'read', 'update', 'delete'];
  }

  // Add system resources
  resources['users'] = [
    'create',
    'read',
    'update',
    'delete',
    'ban',
    'impersonate',
  ];
  resources['media'] = ['create', 'read', 'update', 'delete'];

  const statement = resources as const;
  const ac = createAccessControl(statement);

  // 2. Define Standard Roles (mapped from Config if needed)
  // Users can extend these in their config
  const adminRole = ac.newRole({
    users: ['create', 'read', 'update', 'delete', 'ban'],
    // admin has access to everything by default?
    // Or we iterate and grant all.
  });

  const userRole = ac.newRole({
    // default permissions
  });

  return betterAuth({
    ...config.auth, // Allow database overrides
    plugins: [
      admin({
        roles: {
          admin: adminRole,
          user: userRole,
          // ... inject custom roles from config
        },
      }),
    ],
  });
}
```

### 2. User Configuration

The user defines roles in `OpacaConfig`.

```typescript
// opacacms.config.ts

export default {
  collections: [
    { slug: 'posts', fields: [...] }
  ],
  access: {
    roles: {
      editor: {
        posts: ['create', 'read', 'update'], // Can't delete
        media: ['create', 'read']
      }
    }
  }
}
```

### 3. Middleware & Access Control

We intercept requests and check permissions using the generated Access Control logic.

```typescript
// packages/opacacms/src/api/middleware/auth.ts

app.use('/api/:collection/*', async (c, next) => {
  const collection = c.req.param('collection');
  const action = mapMethodToAction(c.req.method); // POST -> create, GET -> read

  const session = await auth.api.getSession({ headers: c.req.header() });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Check permission via better-auth admin plugin
  // Note: better-auth admin plugin usually attaches to client,
  // but on server we might check role directly or use internal helper.

  const hasAccess =
    session.user.role === 'admin' ||
    checkRolePermission(session.user.role, collection, action);

  if (!hasAccess) return c.json({ error: 'Forbidden' }, 403);

  await next();
});
```

### 4. Admin UI Integration

The Admin UI will use the `authClient` with the admin plugin to show/hide elements.

```typescript
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

const authClient = createAuthClient({
  plugins: [
    adminClient()
  ]
})

// In React Component
const { data: permission } = authClient.admin.hasPermission({
  permission: { posts: ["delete"] }
})

if (permission) {
  <DeleteButton />
}
```

## Migration

OpacaCMS will provide a CLI command to run the necessary `better-auth` migrations (adding `role`, `permissions` tables).

```bash
opaca auth:migrate
```
