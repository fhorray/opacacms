# Database

Learn how to use a database with Better Auth.

## Adapters

Better Auth connects to a database to store data. The database will be used to store data such as users, sessions, and more. Plugins can also define their own database tables to store data.

You can pass a database connection to Better Auth by passing a supported database instance in the database options. You can learn more about supported database adapters in the [Other relational databases](/docs/adapters/other-relational-databases) documentation.

<Callout type="info">
  Better Auth also works without any database. For more details, see [Stateless Session Management](/docs/concepts/session-management#stateless-session-management).
</Callout>

## CLI

Better Auth comes with a CLI tool to manage database migrations and generate schema.

### Running Migrations

The cli checks your database and prompts you to add missing tables or update existing ones with new columns. This is only supported for the built-in Kysely adapter. For other adapters, you can use the `generate` command to create the schema and handle the migration through your ORM.

```bash
npx @better-auth/cli migrate
```

<Callout type="info">
  For PostgreSQL users: The migrate command supports non-default schemas. It automatically detects your `search_path` configuration and creates tables in the correct schema. See [PostgreSQL adapter](/docs/adapters/postgresql#use-a-non-default-schema) for details.
</Callout>

### Generating Schema

Better Auth also provides a `generate` command to generate the schema required by Better Auth. The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash
npx @better-auth/cli generate
```

See the [CLI](/docs/concepts/cli) documentation for more information on the CLI.

<Callout>
  If you prefer adding tables manually, you can do that as well. The core schema
  required by Better Auth is described below and you can find additional schema
  required by plugins in the plugin documentation.
</Callout>

### Programmatic Migrations

In some environments (like Cloudflare Workers, serverless functions, or custom deployment setups), running the CLI may not be possible or practical. In these cases, you can run migrations programmatically from within your application code.

Better Auth provides a `getMigrations` function that you can use to generate and run migrations programmatically. This is particularly useful when:

- You're deploying to edge environments (Cloudflare Workers, Deno Deploy, etc.)
- Your environment variables are only available at runtime (not at build time)
- You need to run migrations as part of your application startup or through a custom endpoint

#### Using `getMigrations`

The `getMigrations` function is available from `better-auth/db` and works with the built-in Kysely adapter (SQLite, PostgreSQL, MySQL, MSSQL).

```typescript
import { getMigrations } from 'better-auth/db';

const { toBeCreated, toBeAdded, runMigrations, compileMigrations } =
  await getMigrations(authConfig);

// Check what migrations are needed
console.log('Tables to create:', toBeCreated);
console.log('Fields to add:', toBeAdded);

// Run migrations
await runMigrations();

// Or get the SQL to run manually
const sql = await compileMigrations();
console.log(sql);
```

#### Example: Cloudflare Workers Migration Endpoint

For Cloudflare Workers using D1 (SQLite), you can create a migration endpoint that runs when your worker starts or through a manual trigger:

```typescript title="src/index.ts"
import { Hono } from 'hono';
import { auth } from './auth'; // your auth instance
import { getMigrations } from 'better-auth/db';

const app = new Hono<{ Bindings: Env }>();

// Migration endpoint - call this once to set up your database
app.post('/migrate', async (c) => {
  const env = c.env;

  // Create auth config with runtime environment
  const authConfig = {
    database: env.DB, // D1 database binding
    // ... rest of your auth config
  };

  try {
    const { toBeCreated, toBeAdded, runMigrations } =
      await getMigrations(authConfig);

    if (toBeCreated.length === 0 && toBeAdded.length === 0) {
      return c.json({ message: 'No migrations needed' });
    }

    await runMigrations();

    return c.json({
      message: 'Migrations completed successfully',
      created: toBeCreated.map((t) => t.table),
      added: toBeAdded.map((t) => t.table),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

// Your normal auth endpoints
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

export default app;
```

<Callout type="warn">
  **Important Limitations**

Programmatic migrations currently work **only** with:

- Built-in database adapters (SQLite/D1, PostgreSQL, MySQL, MSSQL) using the Kysely adapter
- Does **not** work with Prisma or Drizzle ORM adapters

For Prisma or Drizzle in Cloudflare Workers, see the [Cloudflare Workers](#cloudflare-workers-with-prisma-drizzle) section below.
</Callout>

#### Cloudflare Workers with Prisma/Drizzle

If you're using Prisma or Drizzle with Cloudflare Workers, you have a few options:

1. **Use `cloudflare:workers` import** (Recommended for newer Cloudflare projects):

   Cloudflare now supports importing environment variables from `cloudflare:workers`, which allows you to access `env` at the top level:

   ```typescript title="auth.ts"
   import { env } from 'cloudflare:workers';
   import { drizzle } from 'drizzle-orm/d1';

   export const auth = betterAuth({
     database: drizzle(env.DB),
     // ... rest of config
   });
   ```

   With this approach, you can run the standard CLI commands:

   ```bash
   npx @better-auth/cli migrate
   # or
   npx @better-auth/cli generate
   ```

2. **Use `process.env` with compatibility flag**:

   Add the `nodejs_compat_populate_process_env` compatibility flag to your `wrangler.toml`:

   ```toml title="wrangler.toml"
   compatibility_flags = ["nodejs_compat_populate_process_env"]
   ```

   Then use `process.env` in your auth config:

   ```typescript title="auth.ts"
   import { drizzle } from 'drizzle-orm/d1';

   export const auth = betterAuth({
     database: drizzle(process.env.DB as any),
     // ... rest of config
   });
   ```

   After setting this up, run the CLI commands as normal:

   ```bash
   npx @better-auth/cli generate
   ```

3. **Generate schema locally and push manually**:

   Run the generate command locally with a mock configuration, then use your ORM's push/migrate commands to apply the schema.

<Callout type="info">
  See the [Hono integration documentation](/docs/integrations/hono#cloudflare-workers) for a complete example of using Better Auth with Cloudflare Workers.
</Callout>

## Secondary Storage

Secondary storage in Better Auth allows you to use key-value stores for managing session data, rate limiting counters, etc. This can be useful when you want to offload the storage of this intensive records to a high performance storage or even RAM.

### Implementation

To use secondary storage, implement the `SecondaryStorage` interface:

```typescript
interface SecondaryStorage {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
```

Then, provide your implementation to the `betterAuth` function:

```typescript
betterAuth({
  // ... other options
  secondaryStorage: {
    // Your implementation here
  },
});
```

**Example: Redis Implementation**

Here's a basic example using Redis:

```typescript
import { createClient } from 'redis';
import { betterAuth } from 'better-auth';

const redis = createClient();
await redis.connect();

export const auth = betterAuth({
  // ... other options
  secondaryStorage: {
    get: async (key) => {
      return await redis.get(key);
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, { EX: ttl });
      // or for ioredis:
      // if (ttl) await redis.set(key, value, 'EX', ttl)
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
});
```

This implementation allows Better Auth to use Redis for storing session data and rate limiting counters. You can also add prefixes to the keys names.

## Core Schema

Better Auth requires the following tables to be present in the database. The types are in `typescript` format. You can use corresponding types in your database.

### User

Table Name: `user`

<DatabaseTable
fields={[
{
name: "id",
type: "string",
description: "Unique identifier for each user",
isPrimaryKey: true,
},
{
name: "name",
type: "string",
description: "User's chosen display name",
},
{
name: "email",
type: "string",
description: "User's email address for communication and login",
},
{
name: "emailVerified",
type: "boolean",
description: "Whether the user's email is verified",
},
{
name: "image",
type: "string",
description: "User's image url",
isOptional: true,
},
{
name: "createdAt",
type: "Date",
description: "Timestamp of when the user account was created",
},
{
name: "updatedAt",
type: "Date",
description: "Timestamp of the last update to the user's information",
},
]}
/>

### Session

Table Name: `session`

<DatabaseTable
fields={[
{
name: "id",
type: "string",
description: "Unique identifier for each session",
isPrimaryKey: true,
},
{
name: "userId",
type: "string",
description: "The ID of the user",
isForeignKey: true,
},
{
name: "token",
type: "string",
description: "The unique session token",
isUnique: true,
},
{
name: "expiresAt",
type: "Date",
description: "The time when the session expires",
},
{
name: "ipAddress",
type: "string",
description: "The IP address of the device",
isOptional: true,
},
{
name: "userAgent",
type: "string",
description: "The user agent information of the device",
isOptional: true,
},
{
name: "createdAt",
type: "Date",
description: "Timestamp of when the session was created",
},
{
name: "updatedAt",
type: "Date",
description: "Timestamp of when the session was updated",
},
]}
/>

### Account

Table Name: `account`

<DatabaseTable
fields={[
{
name: "id",
type: "string",
description: "Unique identifier for each account",
isPrimaryKey: true,
},
{
name: "userId",
type: "string",
description: "The ID of the user",
isForeignKey: true,
},
{
name: "accountId",
type: "string",
description:
"The ID of the account as provided by the SSO or equal to userId for credential accounts",
},
{
name: "providerId",
type: "string",
description: "The ID of the provider",
},
{
name: "accessToken",
type: "string",
description: "The access token of the account. Returned by the provider",
isOptional: true,
},
{
name: "refreshToken",
type: "string",
description: "The refresh token of the account. Returned by the provider",
isOptional: true,
},
{
name: "accessTokenExpiresAt",
type: "Date",
description: "The time when the access token expires",
isOptional: true,
},
{
name: "refreshTokenExpiresAt",
type: "Date",
description: "The time when the refresh token expires",
isOptional: true,
},
{
name: "scope",
type: "string",
description: "The scope of the account. Returned by the provider",
isOptional: true,
},
{
name: "idToken",
type: "string",
description: "The ID token returned from the provider",
isOptional: true,
},
{
name: "password",
type: "string",
description:
"The password of the account. Mainly used for email and password authentication",
isOptional: true,
},
{
name: "createdAt",
type: "Date",
description: "Timestamp of when the account was created",
},
{
name: "updatedAt",
type: "Date",
description: "Timestamp of when the account was updated",
},
]}
/>

### Verification

Table Name: `verification`

<DatabaseTable
fields={[
{
name: "id",
type: "string",
description: "Unique identifier for each verification",
isPrimaryKey: true,
},
{
name: "identifier",
type: "string",
description: "The identifier for the verification request",
},
{
name: "value",
type: "string",
description: "The value to be verified",
},
{
name: "expiresAt",
type: "Date",
description: "The time when the verification request expires",
},
{
name: "createdAt",
type: "Date",
description: "Timestamp of when the verification request was created",
},
{
name: "updatedAt",
type: "Date",
description: "Timestamp of when the verification request was updated",
},
]}
/>

## Custom Tables

Better Auth allows you to customize the table names and column names for the core schema. You can also extend the core schema by adding additional fields to the user and session tables.

### Custom Table Names

You can customize the table names and column names for the core schema by using the `modelName` and `fields` properties in your auth config:

```ts title="auth.ts"
export const auth = betterAuth({
  user: {
    modelName: 'users',
    fields: {
      name: 'full_name',
      email: 'email_address',
    },
  },
  session: {
    modelName: 'user_sessions',
    fields: {
      userId: 'user_id',
    },
  },
});
```

<Callout>
  Type inference in your code will still use the original field names (e.g.,
  `user.name`, not `user.full_name`).
</Callout>

To customize table names and column name for plugins, you can use the `schema` property in the plugin config:

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
  plugins: [
    twoFactor({
      schema: {
        user: {
          fields: {
            twoFactorEnabled: 'two_factor_enabled',
            secret: 'two_factor_secret',
          },
        },
      },
    }),
  ],
});
```

### Extending Core Schema

Better Auth provides a type-safe way to extend the `user` and `session` schemas. You can add custom fields to your auth config, and the CLI will automatically update the database schema. These additional fields will be properly inferred in functions like `useSession`, `signUp.email`, and other endpoints that work with user or session objects.

To add custom fields, use the `additionalFields` property in the `user` or `session` object of your auth config. The `additionalFields` object uses field names as keys, with each value being a `FieldAttributes` object containing:

- `type`: The data type of the field (e.g., "string", "number", "boolean").
- `required`: A boolean indicating if the field is mandatory.
- `defaultValue`: The default value for the field (note: this only applies in the JavaScript layer; in the database, the field will be optional).
- `input`: This determines whether a value can be provided when creating a new record (default: `true`). If there are additional fields, like `role`, that should not be provided by the user during signup, you can set this to `false`.

Here's an example of how to extend the user schema with additional fields:

```ts title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: ['user', 'admin'],
        required: false,
        defaultValue: 'user',
        input: false, // don't allow user to set role
      },
      lang: {
        type: 'string',
        required: false,
        defaultValue: 'en',
      },
    },
  },
});
```

Now you can access the additional fields in your application logic.

```ts
//on signup
const res = await auth.api.signUpEmail({
  email: 'test@example.com',
  password: 'password',
  name: 'John Doe',
  lang: 'fr',
});

//user object
res.user.role; // > "admin"
res.user.lang; // > "fr"
```

<Callout>
  See the
  [TypeScript](/docs/concepts/typescript#inferring-additional-fields-on-client)
  documentation for more information on how to infer additional fields on the
  client side.
</Callout>

If you're using social / OAuth providers, you may want to provide `mapProfileToUser` to map the profile data to the user object. So, you can populate additional fields from the provider's profile.

**Example: Mapping Profile to User For `firstName` and `lastName`**

```ts title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: 'YOUR_GITHUB_CLIENT_ID',
      clientSecret: 'YOUR_GITHUB_CLIENT_SECRET',
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.name.split(' ')[0],
          lastName: profile.name.split(' ')[1],
        };
      },
    },
    google: {
      clientId: 'YOUR_GOOGLE_CLIENT_ID',
      clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.given_name,
          lastName: profile.family_name,
        };
      },
    },
  },
});
```

### ID Generation

Better Auth by default will generate unique IDs for users, sessions, and other entities.
You can customize ID generation behavior using the `advanced.database.generateId` option.

#### Option 1: Let Database Generate IDs

Setting `generateId` to `false` allows your database handle all ID generation: (outside of `generateId` being `serial` and some cases of `generateId` being `uuid`)

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  advanced: {
    database: {
      generateId: false, // "serial" for auto-incrementing numeric IDs
    },
  },
});
```

#### Option 2: Custom ID Generation Function

Use a function to generate IDs. You can return `false` or `undefined` from the function to let the database generate the ID for specific models:

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  advanced: {
    database: {
      generateId: (options) => {
        // Let database auto-generate for specific models
        if (options.model === 'user' || options.model === 'users') {
          return false; // Let database generate ID
        }
        // Generate UUIDs for other tables
        return crypto.randomUUID();
      },
    },
  },
});
```

<Callout type="info">
  **Important**: Returning `false` or `undefined` from the `generateId` function lets the database handle ID generation for that specific model. Setting `generateId: false` (without a function) disables ID generation for **all** tables.
</Callout>

#### Option 3: Consistent Custom ID Generator

Generate the same type of ID for all tables:

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});
```

### Numeric IDs

If you prefer auto-incrementing numeric IDs, you can set the `advanced.database.generateId` option to `"serial"`.
Doing this will disable Better-Auth from generating IDs for any table, and will assume your
database will generate the numeric ID automatically.

When enabled, the Better-Auth CLI will generate or migrate the schema with the `id` field as a numeric type for your database
with auto-incrementing attributes associated with it.

```ts
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  advanced: {
    database: {
      generateId: 'serial',
    },
  },
});
```

<Callout type="info">
  Better-Auth will continue to infer the type of the `id` field as a `string` for the database, but will
  automatically convert it to a numeric type when fetching or inserting data from the database.

It's likely when grabbing `id` values returned from Better-Auth that you'll receive a string version of a number,
this is normal. It's also expected that all id values passed to Better-Auth (eg via an endpoint body) is expected to be a string.
</Callout>

### UUIDs

If you prefer UUIDs for the `id` field, you can set the `advanced.database.generateId` option to `"uuid"`.
By default, Better-Auth will generate UUIDs for the `id` field for all tables, except adapters that use `PostgreSQL` where we allow the
database to generate the UUID automatically.

By enabling this option, the Better-Auth CLI will generate or migrate the schema with the `id` field as a UUID type for your database.
If the `uuid` type is not supported, we will generate a normal `string` type for the `id` field.

### Mixed ID Types

If you need different ID types across tables (e.g., integer IDs for users, UUID strings for sessions/accounts/verification), use a `generateId` callback function.

```ts title="auth.ts"
import { betterAuth } from 'better-auth';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  user: {
    modelName: 'users', // PostgreSQL: id serial primary key
  },
  session: {
    modelName: 'session', // PostgreSQL: id text primary key
  },
  advanced: {
    database: {
      // Do NOT set useNumberId - it's global and affects all tables
      generateId: (options) => {
        if (options.model === 'user' || options.model === 'users') {
          return false; // Let PostgreSQL serial generate it
        }
        return crypto.randomUUID(); // UUIDs for session, account, verification
      },
    },
  },
});
```

This configuration allows you to:

- Use database auto-increment (serial, auto_increment, etc.) for the users table
- Generate UUIDs for all other tables (session, account, verification)
- Maintain compatibility with existing schemas that use different ID types

<Callout type="info">
  **Use Case**: This is particularly useful when migrating from other authentication providers (like Clerk) where you have existing users with integer IDs but want UUID strings for new tables.
</Callout>

### Database Hooks

Database hooks allow you to define custom logic that can be executed during the lifecycle of core database operations in Better Auth. You can create hooks for the following models: **user**, **session**, and **account**.

<Callout type="warn">
  Additional fields are supported, however full type inference for these fields isn't yet supported.
  Improved type support is planned.
</Callout>

There are two types of hooks you can define:

#### 1. Before Hook

- **Purpose**: This hook is called before the respective entity (user, session, or account) is created, updated, or deleted.
- **Behavior**: If the hook returns `false`, the operation will be aborted. And If it returns a data object, it'll replace the original payload.

#### 2. After Hook

- **Purpose**: This hook is called after the respective entity is created or updated.
- **Behavior**: You can perform additional actions or modifications after the entity has been successfully created or updated.

**Example Usage**

```typescript title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Modify the user object before it is created
          return {
            data: {
              // Ensure to return Better-Auth named fields, not the original field names in your database.
              ...user,
              firstName: user.name.split(' ')[0],
              lastName: user.name.split(' ')[1],
            },
          };
        },
        after: async (user) => {
          //perform additional actions, like creating a stripe customer
        },
      },
      delete: {
        before: async (user, ctx) => {
          console.log(`User ${user.email} is being deleted`);
          if (user.email.includes('admin')) {
            return false; // Abort deletion
          }

          return true; // Allow deletion
        },
        after: async (user) => {
          console.log(`User ${user.email} has been deleted`);
        },
      },
    },
    session: {
      delete: {
        before: async (session, ctx) => {
          console.log(`Session ${session.token} is being deleted`);
          if (session.userId === 'admin-user-id') {
            return false; // Abort deletion
          }
          return true; // Allow deletion
        },
        after: async (session) => {
          console.log(`Session ${session.token} has been deleted`);
        },
      },
    },
  },
});
```

#### Throwing Errors

If you want to stop the database hook from proceeding, you can throw errors using the `APIError` class imported from `better-auth/api`.

```typescript title="auth.ts"
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (user.isAgreedToTerms === false) {
            // Your special condition.
            // Send the API error.
            throw new APIError('BAD_REQUEST', {
              message: 'User must agree to the TOS before signing up.',
            });
          }
          return {
            data: user,
          };
        },
      },
    },
  },
});
```

#### Using the Context Object

The context object (`ctx`), passed as the second argument to the hook, contains useful information. For `update` hooks, this includes the current `session`, which you can use to access the logged-in user's details.

```typescript title="auth.ts"
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  databaseHooks: {
    user: {
      update: {
        before: async (data, ctx) => {
          // You can access the session from the context object.
          if (ctx.context.session) {
            console.log(
              'User update initiated by:',
              ctx.context.session.userId,
            );
          }
          return { data };
        },
      },
    },
  },
});
```

Much like standard hooks, database hooks also provide a `ctx` object that offers a variety of useful properties. Learn more in the [Hooks Documentation](/docs/concepts/hooks#ctx).

## Plugins Schema

Plugins can define their own tables in the database to store additional data. They can also add columns to the core tables to store additional data. For example, the two factor authentication plugin adds the following columns to the `user` table:

- `twoFactorEnabled`: Whether two factor authentication is enabled for the user.
- `twoFactorSecret`: The secret key used to generate TOTP codes.
- `twoFactorBackupCodes`: Encrypted backup codes for account recovery.

To add new tables and columns to your database, you have two options:

`CLI`: Use the migrate or generate command. These commands will scan your database and guide you through adding any missing tables or columns.
`Manual Method`: Follow the instructions in the plugin documentation to manually add tables and columns.

Both methods ensure your database schema stays up to date with your plugins' requirements.

## Experimental Joins

Since Better-Auth version `1.4` we've introduced experimental database joins support.
This allows Better-Auth to perform multiple database queries in a single request, reducing the number of database roundtrips.
Over 50 endpoints support joins, and we're constantly adding more.

Under the hood, our adapter system supports joins natively, meaning even if you don't enable experimental joins,
it will still fallback to making multiple database queries and combining the results.

To enable joins, update your auth config with the following:

```ts title="auth.ts"
export const auth = betterAuth({
  experimental: { joins: true },
});
```

The Better-Auth `1.4` CLI will generate DrizzleORM and PrismaORM relationships for you so if you do not have those already
be sure to update your schema by running our migrate or generate CLI commands to be up-to-date with the latest required schema.

It's very important to read the documentation regarding experimental joins for your given adapter:

- [DrizzleORM](/docs/adapters/drizzle#joins-experimental)
- [PrismaORM](/docs/adapters/prisma#joins-experimental)
- [SQLite](/docs/adapters/sqlite#joins-experimental)
- [MySQL](/docs/adapters/mysql#joins-experimental)
- [PostgreSQL](/docs/adapters/postgresql#joins-experimental)
- [MSSQL](/docs/adapters/mssql#joins-experimental)
- [MongoDB](/docs/adapters/mongo#joins-experimental)

# ADMIN PLUGIN

# Admin

Admin plugin for Better Auth

The Admin plugin provides a set of administrative functions for user management in your application. It allows administrators to perform various operations such as creating users, managing user roles, banning/unbanning users, impersonating users, and more.

## Installation

<Steps>
  <Step>
    ### Add the plugin to your auth config

    To use the Admin plugin, add it to your auth config.

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { admin } from "better-auth/plugins" // [!code highlight]

    export const auth = betterAuth({
        // ... other config options
        plugins: [
            admin() // [!code highlight]
        ]
    })
    ```

  </Step>

  <Step>
    ### Migrate the database

    Run the migration or generate the schema to add the necessary fields and tables to the database.

    <Tabs items={["migrate", "generate"]}>
      <Tab value="migrate">
        <CodeBlockTabs defaultValue="npm" groupId="persist-install" persist>
          <CodeBlockTabsList>
            <CodeBlockTabsTrigger value="npm">
              npm
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="pnpm">
              pnpm
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="yarn">
              yarn
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="bun">
              bun
            </CodeBlockTabsTrigger>
          </CodeBlockTabsList>

          <CodeBlockTab value="npm">
            ```bash
            npx @better-auth/cli migrate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="pnpm">
            ```bash
            pnpm dlx @better-auth/cli migrate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="yarn">
            ```bash
            yarn dlx @better-auth/cli migrate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="bun">
            ```bash
            bun x @better-auth/cli migrate
            ```
          </CodeBlockTab>
        </CodeBlockTabs>
      </Tab>

      <Tab value="generate">
        <CodeBlockTabs defaultValue="npm" groupId="persist-install" persist>
          <CodeBlockTabsList>
            <CodeBlockTabsTrigger value="npm">
              npm
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="pnpm">
              pnpm
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="yarn">
              yarn
            </CodeBlockTabsTrigger>

            <CodeBlockTabsTrigger value="bun">
              bun
            </CodeBlockTabsTrigger>
          </CodeBlockTabsList>

          <CodeBlockTab value="npm">
            ```bash
            npx @better-auth/cli generate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="pnpm">
            ```bash
            pnpm dlx @better-auth/cli generate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="yarn">
            ```bash
            yarn dlx @better-auth/cli generate
            ```
          </CodeBlockTab>

          <CodeBlockTab value="bun">
            ```bash
            bun x @better-auth/cli generate
            ```
          </CodeBlockTab>
        </CodeBlockTabs>
      </Tab>
    </Tabs>

    See the [Schema](#schema) section to add the fields manually.

  </Step>

  <Step>
    ### Add the client plugin

    Next, include the admin client plugin in your authentication client instance.

    ```ts title="auth-client.ts"
    import { createAuthClient } from "better-auth/client"
    import { adminClient } from "better-auth/client/plugins"

    export const authClient = createAuthClient({
        plugins: [
            adminClient()
        ]
    })
    ```

  </Step>
</Steps>

## Usage

Before performing any admin operations, the user must be authenticated with an admin account. An admin is any user assigned the `admin` role or any user whose ID is included in the `adminUserIds` option.

### Create User

Allows an admin to create a new user.

### Client Side

```ts
const { data, error } = await authClient.admin.createUser({
    email: user@example.com,
    password: some-secure-password,
    name: James Smith,
    role: user, // optional
    data, // optional
});
```

### Server Side

```ts
const newUser = await auth.api.createUser({
    body: {
        email: user@example.com,
        password: some-secure-password,
        name: James Smith,
        role: user, // optional
        data, // optional
    }
});
```

### Type Definition

```ts
type createUser = {
      /**
       * The email of the user.
       */
      email: string = "user@example.com"
      /**
       * The password of the user.
       */
      password: string = "some-secure-password"
      /**
       * The name of the user.
       */
      name: string = "James Smith"
      /**
       * A string or array of strings representing the roles to apply to the new user.
       */
      role?: string | string[] = "user"
      /**
       * Extra fields for the user. Including custom additional fields.
       */
      data?: Record<string, any> = { customField: "customValue"
}
```

### List Users

Allows an admin to list all users in the database.

### Client Side

```ts
const { data, error } = await authClient.admin.listUsers({
    searchValue: some name, // optional
    searchField: name, // optional
    searchOperator: contains, // optional
    limit, // optional
    offset, // optional
    sortBy: name, // optional
    sortDirection: desc, // optional
    filterField: email, // optional
    filterValue: hello@example.com, // optional
    filterOperator: eq, // optional
});
```

### Server Side

```ts
const data = await auth.api.listUsers({
    query: {
        searchValue: some name, // optional
        searchField: name, // optional
        searchOperator: contains, // optional
        limit, // optional
        offset, // optional
        sortBy: name, // optional
        sortDirection: desc, // optional
        filterField: email, // optional
        filterValue: hello@example.com, // optional
        filterOperator: eq, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listUsers = {
    /**
     * The value to search for.
     */
    searchValue?: string = "some name"
    /**
     * The field to search in, defaults to email. Can be `email` or `name`.
     */
    searchField?: "email" | "name" = "name"
    /**
     * The operator to use for the search. Can be `contains`, `starts_with` or `ends_with`.
     */
    searchOperator?: "contains" | "starts_with" | "ends_with" = "contains"
    /**
     * The number of users to return. Defaults to 100.
     */
    limit?: string | number = 100
    /**
     * The offset to start from.
     */
    offset?: string | number = 100
    /**
     * The field to sort by.
     */
    sortBy?: string = "name"
    /**
     * The direction to sort by.
     */
    sortDirection?: "asc" | "desc" = "desc"
    /**
     * The field to filter by.
     */
    filterField?: string = "email"
    /**
     * The value to filter by.
     */
    filterValue?: string | number | boolean = "hello@example.com"
    /**
     * The operator to use for the filter.
     */
    filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" = "eq"

}
```

#### Query Filtering

The `listUsers` function supports various filter operators including `eq`, `contains`, `starts_with`, and `ends_with`.

#### Pagination

The `listUsers` function supports pagination by returning metadata alongside the user list. The response includes the following fields:

```ts
{
  users: User[],   // Array of returned users
  total: number,   // Total number of users after filters and search queries
  limit: number | undefined,   // The limit provided in the query
  offset: number | undefined   // The offset provided in the query
}
```

##### How to Implement Pagination

To paginate results, use the `total`, `limit`, and `offset` values to calculate:

- **Total pages:** `Math.ceil(total / limit)`
- **Current page:** `(offset / limit) + 1`
- **Next page offset:** `Math.min(offset + limit, (total - 1))` – The value to use as `offset` for the next page, ensuring it does not exceed the total number of pages.
- **Previous page offset:** `Math.max(0, offset - limit)` – The value to use as `offset` for the previous page (ensuring it doesn’t go below zero).

##### Example Usage

Fetching the second page with 10 users per page:

```ts title="admin.ts"
const pageSize = 10;
const currentPage = 2;

const users = await authClient.admin.listUsers({
  query: {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  },
});

const totalUsers = users.total;
const totalPages = Math.ceil(totalUsers / pageSize);
```

### Set User Role

Changes the role of a user.

### Client Side

```ts
const { data, error } = await authClient.admin.setRole({
  userId: user - id, // optional
  role: admin,
});
```

### Server Side

```ts
const data = await auth.api.setRole({
  body: {
    userId: user - id, // optional
    role: admin,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type setRole = {
      /**
       * The user id which you want to set the role for.
       */
      userId?: string = "user-id"
      /**
       * The role to set, this can be a string or an array of strings.
       */
      role: string | string[] = "admin"

}
```

### Set User Password

Changes the password of a user.

### Client Side

```ts
const { data, error } = await authClient.admin.setUserPassword({
    newPassword: new-password,
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.setUserPassword({
    body: {
        newPassword: new-password,
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type setUserPassword = {
      /**
       * The new password.
       */
      newPassword: string = 'new-password'
      /**
       * The user id which you want to set the password for.
       */
      userId: string = 'user-id'

}
```

### Update user

Update a user's details.

### Client Side

```ts
const { data, error } = await authClient.admin.updateUser({
  userId: user - id,
  data,
});
```

### Server Side

```ts
const data = await auth.api.adminUpdateUser({
  body: {
    userId: user - id,
    data,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type adminUpdateUser = {
      /**
       * The user id which you want to update.
       */
      userId: string = "user-id"
      /**
       * The data to update.
       */
      data: Record<string, any> = { name: "John Doe"
}
```

### Ban User

Bans a user, preventing them from signing in and revokes all of their existing sessions.

### Client Side

```ts
const { data, error } = await authClient.admin.banUser({
  userId: user - id,
  banReason: Spamming, // optional
  banExpiresIn, // optional
});
```

### Server Side

```ts
await auth.api.banUser({
  body: {
    userId: user - id,
    banReason: Spamming, // optional
    banExpiresIn, // optional
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type banUser = {
      /**
       * The user id which you want to ban.
       */
      userId: string = "user-id"
      /**
       * The reason for the ban.
       */
      banReason?: string = "Spamming"
      /**
       * The number of seconds until the ban expires. If not provided, the ban will never expire.
       */
      banExpiresIn?: number = 60 * 60 * 24 * 7

}
```

### Unban User

Removes the ban from a user, allowing them to sign in again.

### Client Side

```ts
const { data, error } = await authClient.admin.unbanUser({
  userId: user - id,
});
```

### Server Side

```ts
await auth.api.unbanUser({
  body: {
    userId: user - id,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type unbanUser = {
      /**
       * The user id which you want to unban.
       */
      userId: string = "user-id"

}
```

### List User Sessions

Lists all sessions for a user.

### Client Side

```ts
const { data, error } = await authClient.admin.listUserSessions({
  userId: user - id,
});
```

### Server Side

```ts
const data = await auth.api.listUserSessions({
  body: {
    userId: user - id,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type listUserSessions = {
      /**
       * The user id.
       */
      userId: string = "user-id"

}
```

### Revoke User Session

Revokes a specific session for a user.

### Client Side

```ts
const { data, error } = await authClient.admin.revokeUserSession({
  sessionToken: session_token_here,
});
```

### Server Side

```ts
const data = await auth.api.revokeUserSession({
  body: {
    sessionToken: session_token_here,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type revokeUserSession = {
      /**
       * The session token which you want to revoke.
       */
      sessionToken: string = "session_token_here"

}
```

### Revoke All Sessions for a User

Revokes all sessions for a user.

### Client Side

```ts
const { data, error } = await authClient.admin.revokeUserSessions({
  userId: user - id,
});
```

### Server Side

```ts
const data = await auth.api.revokeUserSessions({
  body: {
    userId: user - id,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type revokeUserSessions = {
      /**
       * The user id which you want to revoke all sessions for.
       */
      userId: string = "user-id"

}
```

### Impersonate User

This feature allows an admin to create a session that mimics the specified user. The session will remain active until either the browser session ends or it reaches 1 hour. You can change this duration by setting the `impersonationSessionDuration` option.

### Client Side

```ts
const { data, error } = await authClient.admin.impersonateUser({
  userId: user - id,
});
```

### Server Side

```ts
const data = await auth.api.impersonateUser({
  body: {
    userId: user - id,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type impersonateUser = {
      /**
       * The user id which you want to impersonate.
       */
      userId: string = "user-id"

}
```

### Stop Impersonating User

To stop impersonating a user and continue with the admin account, you can use `stopImpersonating`

### Client Side

```ts
const { data, error } = await authClient.admin.stopImpersonating({});
```

### Server Side

```ts
await auth.api.stopImpersonating({
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type stopImpersonating = {};
```

### Remove User

Hard deletes a user from the database.

### Client Side

```ts
const { data, error } = await authClient.admin.removeUser({
  userId: user - id,
});
```

### Server Side

```ts
const deletedUser = await auth.api.removeUser({
  body: {
    userId: user - id,
  },
  // This endpoint requires session cookies.
  headers: await headers(),
});
```

### Type Definition

```ts
type removeUser = {
      /**
       * The user id which you want to remove.
       */
      userId: string = "user-id"

}
```

## Access Control

The admin plugin offers a highly flexible access control system, allowing you to manage user permissions based on their role. You can define custom permission sets to fit your needs.

### Roles

By default, there are two roles:

`admin`: Users with the admin role have full control over other users.

`user`: Users with the user role have no control over other users.

<Callout>
  A user can have multiple roles. Multiple roles are stored as string separated by comma (",").
</Callout>

### Permissions

By default, there are two resources with up to six permissions.

**user**:
`create` `list` `set-role` `ban` `impersonate` `delete` `set-password`

**session**:
`list` `revoke` `delete`

Users with the admin role have full control over all the resources and actions. Users with the user role have no control over any of those actions.

### Custom Permissions

The plugin provides an easy way to define your own set of permissions for each role.

<Steps>
  <Step>
    #### Create Access Control

    You first need to create an access controller by calling the `createAccessControl` function and passing the statement object. The statement object should have the resource name as the key and the array of actions as the value.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    /**
     * make sure to use `as const` so typescript can infer the type correctly
     */
    const statement = { // [!code highlight]
        project: ["create", "share", "update", "delete"], // [!code highlight]
    } as const; // [!code highlight]

    const ac = createAccessControl(statement); // [!code highlight]
    ```

  </Step>

  <Step>
    #### Create Roles

    Once you have created the access controller you can create roles with the permissions you have defined.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    export const statement = {
        project: ["create", "share", "update", "delete"], // <-- Permissions available for created roles
    } as const;

    const ac = createAccessControl(statement);

    export const user = ac.newRole({ // [!code highlight]
        project: ["create"], // [!code highlight]
    }); // [!code highlight]

    export const admin = ac.newRole({ // [!code highlight]
        project: ["create", "update"], // [!code highlight]
    }); // [!code highlight]

    export const myCustomRole = ac.newRole({ // [!code highlight]
        project: ["create", "update", "delete"], // [!code highlight]
        user: ["ban"], // [!code highlight]
    }); // [!code highlight]
    ```

    When you create custom roles for existing roles, the predefined permissions for those roles will be overridden. To add the existing permissions to the custom role, you need to import `defaultStatements` and merge it with your new statement, plus merge the roles' permissions set with the default roles.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";
    import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

    const statement = {
        ...defaultStatements, // [!code highlight]
        project: ["create", "share", "update", "delete"],
    } as const;

    const ac = createAccessControl(statement);

    const admin = ac.newRole({
        project: ["create", "update"],
        ...adminAc.statements, // [!code highlight]
    });
    ```

  </Step>

  <Step>
    #### Pass Roles to the Plugin

    Once you have created the roles you can pass them to the admin plugin both on the client and the server.

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { admin as adminPlugin } from "better-auth/plugins"
    import { ac, admin, user } from "@/auth/permissions"

    export const auth = betterAuth({
        plugins: [
            adminPlugin({
                ac,
                roles: {
                    admin,
                    user,
                    myCustomRole
                }
            }),
        ],
    });
    ```

    You also need to pass the access controller and the roles to the client plugin.

    ```ts title="auth-client.ts"
    import { createAuthClient } from "better-auth/client"
    import { adminClient } from "better-auth/client/plugins"
    import { ac, admin, user, myCustomRole } from "@/auth/permissions"

    export const client = createAuthClient({
        plugins: [
            adminClient({
                ac,
                roles: {
                    admin,
                    user,
                    myCustomRole
                }
            })
        ]
    })
    ```

  </Step>
</Steps>

### Access Control Usage

**Has Permission**:

To check a user's permissions, you can use the `hasPermission` function provided by the client.

### Client Side

```ts
const { data, error } = await authClient.admin.hasPermission({
  userId: user - id, // optional
  role: admin, // optional
  permission, // optional
});
```

### Server Side

```ts
const data = await auth.api.userHasPermission({
  body: {
    userId: user - id, // optional
    role: admin, // optional
    permission, // optional
  },
});
```

### Type Definition

```ts
type userHasPermission = {
      /**
       * The user id which you want to check the permissions for.
       */
      userId?: string = "user-id"
      /**
       * Check role permissions.
       * @serverOnly
       */
      role?: string = "admin"
      /**
       * Optionally check if a single permission is granted. Must use this, or permissions.
       */
      permission?: Record<string, string[]> = { "project": ["create", "update"]
}
```

Example usage:

```ts title="auth-client.ts"
const canCreateProject = await authClient.admin.hasPermission({
  permissions: {
    project: ['create'],
  },
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale = await authClient.admin.hasPermission({
  permissions: {
    project: ['create'],
    sale: ['create'],
  },
});
```

If you want to check a user's permissions server-side, you can use the `userHasPermission` action provided by the `api` to check the user's permissions.

```ts title="api.ts"
import { auth } from '@/auth';

await auth.api.userHasPermission({
  body: {
    userId: 'id', //the user id
    permissions: {
      project: ['create'], // This must match the structure in your access control
    },
  },
});

// You can also just pass the role directly
await auth.api.userHasPermission({
  body: {
    role: 'admin',
    permissions: {
      project: ['create'], // This must match the structure in your access control
    },
  },
});

// You can also check multiple resource permissions at the same time
await auth.api.userHasPermission({
  body: {
    role: 'admin',
    permissions: {
      project: ['create'], // This must match the structure in your access control
      sale: ['create'],
    },
  },
});
```

**Check Role Permission**:

Use the `checkRolePermission` function on the client side to verify whether a given **role** has a specific **permission**. This is helpful after defining roles and their permissions, as it allows you to perform permission checks without needing to contact the server.

Note that this function does **not** check the permissions of the currently logged-in user directly. Instead, it checks what permissions are assigned to a specified role. The function is synchronous, so you don't need to use `await` when calling it.

```ts title="auth-client.ts"
const canCreateProject = authClient.admin.checkRolePermission({
  permissions: {
    user: ['delete'],
  },
  role: 'admin',
});

// You can also check multiple resource permissions at the same time
const canDeleteUserAndRevokeSession = authClient.admin.checkRolePermission({
  permissions: {
    user: ['delete'],
    session: ['revoke'],
  },
  role: 'admin',
});
```

## Schema

This plugin adds the following fields to the `user` table:

<DatabaseTable
fields={[
{
name: "role",
type: "string",
description:
"The user's role. Defaults to `user`. Admins will have the `admin` role.",
isOptional: true,
},
{
name: "banned",
type: "boolean",
description: "Indicates whether the user is banned.",
isOptional: true,
},
{
name: "banReason",
type: "string",
description: "The reason for the user's ban.",
isOptional: true,
},
{
name: "banExpires",
type: "date",
description: "The date when the user's ban will expire.",
isOptional: true,
},
]}
/>

And adds one field in the `session` table:

<DatabaseTable
fields={[
{
name: "impersonatedBy",
type: "string",
description: "The ID of the admin that is impersonating this session.",
isOptional: true,
},
]}
/>

## Options

### Default Role

The default role for a user. Defaults to `user`.

```ts title="auth.ts"
admin({
  defaultRole: 'regular',
});
```

### Admin Roles

The roles that are considered admin roles when **not** using custom access control. Defaults to `["admin"]`.

```ts title="auth.ts"
admin({
  adminRoles: ['admin', 'superadmin'],
});
```

<Callout type="warning">
  **Note:** The `adminRoles` option is **not required** when using custom access control (via `ac` and `roles`). When you define custom roles with specific permissions, those roles will have exactly the permissions you grant them through the access control system.

**Warning:** When **not** using custom access control, any role that isn't in the `adminRoles` list will **not** be able to perform admin operations.
</Callout>

### Admin userIds

You can pass an array of userIds that should be considered as admin. Default to `[]`

```ts title="auth.ts"
admin({
  adminUserIds: ['user_id_1', 'user_id_2'],
});
```

If a user is in the `adminUserIds` list, they will be able to perform any admin operation.

### impersonationSessionDuration

The duration of the impersonation session in seconds. Defaults to 1 hour.

```ts title="auth.ts"
admin({
  impersonationSessionDuration: 60 * 60 * 24, // 1 day
});
```

### Default Ban Reason

The default ban reason for a user created by the admin. Defaults to `No reason`.

```ts title="auth.ts"
admin({
  defaultBanReason: 'Spamming',
});
```

### Default Ban Expires In

The default ban expires in for a user created by the admin in seconds. Defaults to `undefined` (meaning the ban never expires).

```ts title="auth.ts"
admin({
  defaultBanExpiresIn: 60 * 60 * 24, // 1 day
});
```

### bannedUserMessage

The message to show when a banned user tries to sign in. Defaults to "You have been banned from this application. Please contact support if you believe this is an error."

```ts title="auth.ts"
admin({
  bannedUserMessage: 'Custom banned user message',
});
```

### allowImpersonatingAdmins

Whether to allow impersonating other admin users. Defaults to `false`.

```ts title="auth.ts"
admin({
  allowImpersonatingAdmins: true,
});
```
