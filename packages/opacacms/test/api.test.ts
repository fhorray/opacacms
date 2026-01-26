import { describe, expect, it, beforeEach } from 'bun:test';
import { createAPIRouter } from '../src/server/router';
import { SQLiteAdapter } from '../src/db/sqlite';
import type { OpacaConfig, Collection } from '../src/types';

describe('API Router', () => {
  let db: SQLiteAdapter;
  let app: any;

  const testCollection: Collection = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'views', type: 'number' }
    ]
  };

  const config: OpacaConfig = {
    db: null as any, // Will set later
    collections: [testCollection]
  };

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate([testCollection]);
    config.db = db;
    app = createAPIRouter(config);
  });

  it('GET /:slug should return empty list initially', async () => {
    const res = await app.request('/posts');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toEqual([]);
    expect(body.totalDocs).toBe(0);
  });

  it('POST /:slug should create a document', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New API Post', views: 100 })
    });

    expect(res.status).toBe(201);
    const doc = await res.json();
    expect(doc.title).toBe('New API Post');
    expect(doc.id).toBeDefined();

    // Verify persistence
    const saved = await db.findOne('posts', { id: doc.id });
    expect(saved).toBeDefined();
  });

  it('GET /:slug/:id should return a document', async () => {
    const doc = await db.create('posts', { title: 'Find Me' });

    const res = await app.request(`/posts/${doc.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Find Me');
  });

  it('PATCH /:slug/:id should update a document', async () => {
    const doc = await db.create('posts', { title: 'Update Me' });

    const res = await app.request(`/posts/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated');

    const check = await db.findOne('posts', { id: doc.id });
    expect(check?.title).toBe('Updated');
  });

  it('DELETE /:slug/:id should delete a document', async () => {
    const doc = await db.create('posts', { title: 'Delete Me' });

    const res = await app.request(`/posts/${doc.id}`, {
      method: 'DELETE'
    });

    expect(res.status).toBe(200);

    const check = await db.findOne('posts', { id: doc.id });
    expect(check).toBeNull();
  });

  it('POST /:slug should fail validation if required field missing', async () => {
    const requiredCollection: Collection = {
      slug: 'reqposts',
      fields: [
        { name: 'title', type: 'text', required: true }
      ]
    };

    await db.migrate([requiredCollection]);
    const newConfig = { ...config, collections: [...config.collections, requiredCollection] };
    const newApp = createAPIRouter(newConfig);

    const res = await newApp.request('/reqposts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Missing title
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('Validation Error');
  });

  it('POST /:slug should fail validation if wrong type', async () => {
    const res = await app.request('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 123 }) // title is text, expected string
    });

    expect(res.status).toBe(400);
  });

  it('GET /:slug should support pagination', async () => {
    // Create 15 items
    for (let i = 1; i <= 15; i++) {
      await db.create('posts', { title: `Post ${i}`, views: i });
    }

    // Page 1
    const res1 = await app.request('/posts?limit=10&page=1');
    const body1 = await res1.json();
    expect(body1.docs.length).toBe(10);
    expect(body1.totalDocs).toBe(15);
    expect(body1.totalPages).toBe(2);
    expect(body1.page).toBe(1);
    expect(body1.hasNextPage).toBe(true);

    // Page 2
    const res2 = await app.request('/posts?limit=10&page=2');
    const body2 = await res2.json();
    expect(body2.docs.length).toBe(5);
    expect(body2.page).toBe(2);
    expect(body2.hasNextPage).toBe(false);
  });

  it('GET /:slug should support sorting', async () => {
    await db.create('posts', { title: 'A', views: 10 });
    await db.create('posts', { title: 'B', views: 20 });

    // Descending
    const resDesc = await app.request('/posts?sort=-views');
    const bodyDesc = await resDesc.json();
    expect(bodyDesc.docs[0].views).toBe(20);

    // Ascending
    const resAsc = await app.request('/posts?sort=views');
    const bodyAsc = await resAsc.json();
    expect(bodyAsc.docs[0].views).toBe(10);
  });

  it('GET /:slug should support advanced filters', async () => {
    await db.create('posts', { title: 'Low', views: 5 });
    await db.create('posts', { title: 'Medium', views: 15 });
    await db.create('posts', { title: 'High', views: 25 });

    // views > 10
    // URL encoded: views[gt]=10
    const res = await app.request('/posts?views[gt]=10');
    const body = await res.json();
    expect(body.docs.length).toBe(2);
    expect(body.docs.find((d: any) => d.views === 5)).toBeUndefined();
  });
});
