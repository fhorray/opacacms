import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { SQLiteAdapter } from '../src/db/sqlite';
import type { Collection } from '../src/types';

describe('SQLiteAdapter', () => {
  let db: SQLiteAdapter;
  const testCollection: Collection = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'views', type: 'number' },
      { name: 'published', type: 'boolean' }
    ],
    timestamps: true
  };

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate([testCollection]);
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('should create and retrieve a document', async () => {
    const data = { title: 'Hello World', views: 10, published: true };
    const created = await db.create('posts', data);

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.title).toBe('Hello World');

    const found = await db.findOne('posts', { id: created.id });
    expect(found).toEqual(created);
  });

  it('should update a document', async () => {
    const created = await db.create('posts', { title: 'Old Title', views: 5 });

    const updated = await db.update('posts', { id: created.id }, { title: 'New Title' });
    expect(updated.title).toBe('New Title');

    const found = await db.findOne('posts', { id: created.id });
    expect(found?.title).toBe('New Title');
    expect(found?.views).toBe(5);
  });

  it('should delete a document', async () => {
    const created = await db.create('posts', { title: 'To Delete' });

    const success = await db.delete('posts', { id: created.id });
    expect(success).toBe(true);

    const found = await db.findOne('posts', { id: created.id });
    expect(found).toBeNull();
  });

  it('should find documents with query', async () => {
    await db.create('posts', { title: 'Post 1', published: true });
    await db.create('posts', { title: 'Post 2', published: false });
    await db.create('posts', { title: 'Post 3', published: true });

    const result = await db.find('posts', { published: 1 }); // SQLite boolean is 0/1
    expect(result.docs).toHaveLength(2);
    expect(result.totalDocs).toBe(2);
  });
});
