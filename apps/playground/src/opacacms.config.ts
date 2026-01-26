import { defineConfig } from 'opacacms';
import { createSQLiteAdapter } from 'opacacms/server';

export default defineConfig({
  serverURL: 'http://localhost:3000',
  db: createSQLiteAdapter('./cms-2.db'),
  auth: {
    trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    emailAndPassword: {
      enabled: true,
    }
  },
  access: {
    roles: {
      admin: {
        posts: ['create', 'read', 'update', 'delete'],
        categories: ['create', 'read', 'update', 'delete'],
        user: ['create', 'read', 'update', 'delete', 'ban'],
      }
    }
  },
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' },
        { name: 'author', type: 'text' },
      ],
      timestamps: true,
    },
    {
      slug: 'categories',
      fields: [
        { name: 'name', type: 'text', required: true, unique: true },
      ]
    },
    {
      slug: "properties",
      fields: [
        { name: 'name', type: 'text', required: true, unique: true },
      ],
      timestamps: true,
    }
  ],
  admin: {
    route: '/admin',
    userCollection: 'users'
  }
});
