import { defineConfig } from 'opacacms';
import { createSQLiteAdapter } from 'opacacms/server';

export default defineConfig({
  serverURL: 'http://localhost:3000',
  db: createSQLiteAdapter('./cms.db'),
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext' },
        { name: 'author', type: 'text' },
      ],
      timestamps: true,
      hooks: {
        beforeCreate: (data) => {
          console.log('📝 Creating new post:', data.title);
          return data;
        }
      }
    },
    {
      slug: 'categories',
      fields: [
        { name: 'name', type: 'text', required: true, unique: true },
      ]
    }
  ],
  admin: {
    route: '/admin'
  }
});
