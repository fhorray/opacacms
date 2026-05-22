import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import {
  OpacaCMS,
  SQLiteDrizzleAdapter,
  MemoryDatabaseAdapter,
  renderTemplate,
  hashPassword,
} from 'opacacms';
import { z, getFieldMeta } from 'opacacms/fields';

import { existsSync, unlinkSync } from 'fs';

const DB_FILE = 'data.db';

// Helper for assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

/**
 * Runs the basic field and template engine checks (Phase 1)
 */
async function runPhase1SmokeTests() {
  console.log('--- PHASE 1: Running Field and Template Smoke Tests ---');

  const shape = {
    title: z.text({ label: 'Title', required: true }),
    status: z.select({
      label: 'Status',
      options: ['draft', 'published'],
      defaultValue: 'draft',
    }),
    views: z.number({ label: 'Views Count' }).optional(),
    featured: z.checkbox({ label: 'Featured Post', defaultValue: false }),
    datePublished: z.date({ label: 'Publication Date' }).optional(),
    seo: z.accordion('SEO Settings', {
      metaTitle: z.text({ label: 'Meta Title' }),
      metaDescription: z.textarea({ label: 'Meta Description' }).optional(),
    }),
    tags: z.array('Tags List', {
      tagName: z.text({ label: 'Tag Name' }),
    }).optional(),
  };

  // Assert field metadata extraction
  const titleMeta = getFieldMeta(shape.title);
  assert(titleMeta !== null, 'Should extract metadata from title field');
  assert(titleMeta?.fieldType === 'text', 'Title should be of type "text"');
  assert(titleMeta?.label === 'Title', 'Title label should be "Title"');
  assert(titleMeta?.required === true, 'Title should be required');

  const statusMeta = getFieldMeta(shape.status);
  assert(statusMeta !== null, 'Should extract metadata from status field');
  assert(statusMeta?.fieldType === 'select', 'Status should be of type "select"');
  assert(statusMeta?.defaultValue === 'draft', 'Status default should be "draft"');

  const seoMeta = getFieldMeta(shape.seo);
  assert(seoMeta !== null, 'Should extract metadata from accordion field');
  assert(seoMeta?.fieldType === 'accordion', 'SEO should be of type "accordion"');

  // Validate parsing schema
  const postSchema = z.object(shape);
  const validData = {
    title: 'Hello World',
    status: 'published',
    views: 42,
    featured: true,
    datePublished: '2026-05-22',
    seo: {
      metaTitle: 'Hello World SEO',
      metaDescription: 'A brief description',
    },
    tags: [{ tagName: 'Tech' }],
  };

  const parsed = postSchema.safeParse(validData);
  assert(parsed.success, 'Post schema should successfully validate valid data');

  // Test Custom Template Engine
  const testTemplate = `
    <h1>{{ title }}</h1>
    {% if isPublished %}
      <p>Published on: {{ date }}</p>
    {% else %}
      <p>Draft post.</p>
    {% endif %}
    <ul>
      {% for tag in tags %}
        <li>Tag: {{ tag.tagName }}</li>
      {% endfor %}
    </ul>
  `;

  const renderContext = {
    title: 'Testing Template Engine',
    isPublished: true,
    date: '2026-05-22',
    tags: [{ tagName: 'Hono' }, { tagName: 'Zod' }],
  };

  const rendered = renderTemplate(testTemplate, renderContext);
  assert(rendered.includes('<h1>Testing Template Engine</h1>'), 'Should interpolate title');
  assert(rendered.includes('<p>Published on: 2026-05-22</p>'), 'Should render true block of if condition');
  assert(rendered.includes('<li>Tag: Hono</li>'), 'Should render loop items (Hono)');

  // Test Memory Database Adapter CRUD
  const memDb = new MemoryDatabaseAdapter();
  const doc1 = await memDb.create('posts', { title: 'Memory First Post', status: 'draft' });
  const doc2 = await memDb.create('posts', { title: 'Memory Second Post', status: 'published' });
  
  assert(doc1.id !== undefined, 'Memory doc should have generated ID');
  const count = await memDb.count('posts');
  assert(count === 2, 'Memory count should equal 2');

  const found = await memDb.findById('posts', doc1.id);
  assert(found !== null && found.title === 'Memory First Post', 'Should find memory doc by ID');

  console.log('PHASE 1 tests completed successfully! 🎉\n');
}

/**
 * Runs Drizzle, SQLite, REST API, Cookies, and RBAC Integration tests (Phase 2)
 */
async function runPhase2IntegrationTests() {
  console.log('--- PHASE 2: Running SQLite + Hono REST API + RBAC Integration Tests ---');

  // Clean up old DB file to start fresh
  if (existsSync(DB_FILE)) {
    try {
      unlinkSync(DB_FILE);
    } catch (e) {}
  }

  const sqliteDb = new Database(DB_FILE);
  const db = drizzle(sqliteDb);


  const postsShape = {
    title: z.text({ label: 'Title', required: true }),
    content: z.textarea({ label: 'Content' }).optional(),
    secretNotes: z.text({
      label: 'Secret Notes',
      access: {
        read: ['admin'],
        update: ['admin'],
      },
    }).optional(),
  };

  const app = await new OpacaCMS({
    db: new SQLiteDrizzleAdapter(db, { sqliteDb }),
    collections: [
      {
        slug: 'posts',
        schema: z.object(postsShape),
        access: {
          read: 'public',
          create: 'authenticated',
          update: ['admin'],
          delete: ['admin'],
        },
      },
    ],
  }).init();


  // 4. Start Local Hono Server
  const server = Bun.serve({
    fetch: app.fetch,
    port: 3005,
    hostname: '127.0.0.1',
  });

  console.log('Running test Hono server on http://127.0.0.1:3005');

  try {
    // --- Test 1: Public Read Collection (Empty) ---
    let res = await fetch('http://127.0.0.1:3005/api/posts');
    console.log('DEBUG: Public read status =', res.status, 'body =', await res.clone().text());
    assert(res.status === 200, 'Public read should return 200 OK');
    let json = await res.json();
    console.log('DEBUG json response:', json);
    assert(Array.isArray(json) && json.length === 0, 'Public read should return empty list initially');

    // --- Test 2: Create Post without Auth (Should fail) ---
    res = await fetch('http://127.0.0.1:3005/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Post' }),
    });
    assert(res.status === 403, 'Create without auth should return 403 Forbidden');

    // --- Test 3: Register Admin User ---
    res = await fetch('http://127.0.0.1:3005/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@opaca.io',
        password: 'adminpassword',
        role: 'admin',
      }),
    });
    assert(res.status === 201, 'Admin registration should return 201 Created');
    const adminData = await res.json();
    assert(adminData.user.email === 'admin@opaca.io', 'Admin email should match');
    assert(adminData.user.role === 'admin', 'Admin role should match');
    const adminCookie = res.headers.get('set-cookie');
    assert(adminCookie !== null && adminCookie.includes('opaca_session'), 'Set-Cookie should contain opaca_session');

    // --- Test 3.5: Register Editor User (using Admin session) ---
    res = await fetch('http://127.0.0.1:3005/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie!,
      },
      body: JSON.stringify({
        email: 'editor@opaca.io',
        password: 'password123',
        role: 'editor',
      }),
    });
    assert(res.status === 201, 'Editor registration by admin should return 201 Created');
    const editorData = await res.json();
    assert(editorData.user.email === 'editor@opaca.io', 'Editor email should match');
    assert(editorData.user.role === 'editor', 'Editor role should match');

    // Log in as Editor to obtain editorCookie
    res = await fetch('http://127.0.0.1:3005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'editor@opaca.io',
        password: 'password123',
      }),
    });
    assert(res.status === 200, 'Editor login should succeed');
    const editorCookie = res.headers.get('set-cookie');
    assert(editorCookie !== null && editorCookie.includes('opaca_session'), 'Editor Cookie should be set');

    // --- Test 4: Create Post with Editor Auth (Including write filter field check) ---
    res = await fetch('http://127.0.0.1:3005/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': editorCookie!,
      },
      body: JSON.stringify({
        title: 'My First Post',
        content: 'Hello World',
        secretNotes: 'Sensitive info that editors cannot write',
      }),
    });
    assert(res.status === 201, 'Create with editor auth should return 201 Created');
    const post = await res.json();
    assert(post.title === 'My First Post', 'Created post title should match');
    assert(post.secretNotes === undefined, 'secretNotes should be filtered out from read for editor');
    const postId = post.id;
    assert(typeof postId === 'string', 'Post ID should be generated');

    // --- Test 5: Verify Write Filter stripped unauthorized field from SQLite DB ---
    const dbRows = sqliteDb.prepare('SELECT * FROM posts WHERE id = ?').all(postId) as any[];
    assert(dbRows.length === 1, 'Post should exist in DB');
    assert(dbRows[0].secretNotes === null || dbRows[0].secretNotes === undefined, 'secretNotes should be empty/null in database (stripped by write filter)');

    // --- Test 6: Read Post with Editor Auth ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`, {
      headers: { 'Cookie': editorCookie! },
    });
    assert(res.status === 200, 'Read post with editor auth should return 200 OK');
    const editorPost = await res.json();
    assert(editorPost.title === 'My First Post', 'Post title should match');
    assert(editorPost.secretNotes === undefined, 'secretNotes should be stripped from editor response');

    // --- Test 7: Update Post with Editor Auth (Should fail - only admin update allowed) ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': editorCookie!,
      },
      body: JSON.stringify({ title: 'Editor Hack Update' }),
    });
    assert(res.status === 403, 'Editor update of post should return 403 Forbidden');

    // --- Test 8: Register without admin cookie when DB has users (Should fail) ---
    res = await fetch('http://127.0.0.1:3005/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker@opaca.io',
        password: 'password123',
        role: 'admin',
      }),
    });
    assert(res.status === 403, 'Registration without admin cookie when DB has users should return 403 Forbidden');

    // --- Test 9: Update Post with Admin Auth (Should succeed) ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie!,
      },
      body: JSON.stringify({
        title: 'Admin Approved Title',
        secretNotes: 'Highly classified admin note',
      }),
    });
    assert(res.status === 200, 'Admin update of post should return 200 OK');
    const adminPost = await res.json();
    assert(adminPost.title === 'Admin Approved Title', 'Updated title should match');
    assert(adminPost.secretNotes === 'Highly classified admin note', 'Admin should be able to read secretNotes after writing');

    // --- Test 10: Read Post as Anonymous (Public) ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`);
    assert(res.status === 200, 'Public read post should return 200 OK');
    const publicPost = await res.json();
    assert(publicPost.title === 'Admin Approved Title', 'Public title should match updated title');
    assert(publicPost.secretNotes === undefined, 'secretNotes should be filtered out from anonymous read response');

    // --- Test 11: Delete Post with Editor Auth (Should fail) ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Cookie': editorCookie! },
    });
    assert(res.status === 403, 'Editor delete post should return 403 Forbidden');

    // --- Test 12: Delete Post with Admin Auth (Should succeed) ---
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie! },
    });
    assert(res.status === 200, 'Admin delete post should return 200 OK');

    // Verify deletion
    res = await fetch(`http://127.0.0.1:3005/api/posts/${postId}`);
    assert(res.status === 404, 'Post should be deleted and return 404');

    // --- Test 13: Logout ---
    res = await fetch('http://127.0.0.1:3005/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': adminCookie! },
    });
    assert(res.status === 200, 'Logout should return 200 OK');

    // Verify session invalidated
    res = await fetch('http://127.0.0.1:3005/api/auth/me', {
      headers: { 'Cookie': adminCookie! },
    });
    const meData = await res.json();
    assert(meData.user === null, 'User should be null after logout');

    console.log('PHASE 2 integration tests completed successfully! 🎉\n');
  } finally {
    // Shutdown server and database connection
    server.stop();
    sqliteDb.close();
  }
}

/**
 * Runs Admin UI, dynamic forms, CSS, body-parser, and CRUD tests (Phase 3)
 */
async function runPhase3AdminTests() {
  console.log('--- PHASE 3: Running Admin UI Integration Tests ---');

  const ADMIN_DB_FILE = 'data_admin.db';

  if (existsSync(ADMIN_DB_FILE)) {
    try {
      unlinkSync(ADMIN_DB_FILE);
    } catch (e) {}
  }

  const sqliteDb = new Database(ADMIN_DB_FILE);
  const db = drizzle(sqliteDb);


  const postsShape = {
    title: z.text({ label: 'Title', required: true }),
    content: z.textarea({ label: 'Content' }).optional(),
    featured: z.checkbox({ label: 'Featured', defaultValue: false }),
  };

  const app = await new OpacaCMS({
    db: new SQLiteDrizzleAdapter(db, { sqliteDb }),
    admin: {
      email: 'admin@opaca.io',
      password: 'adminpassword',
    },
    collections: [
      {
        slug: 'posts',
        label: 'Blog Posts',
        icon: 'BookOpen',
        schema: z.object(postsShape),
        access: {
          read: 'public',
          create: 'authenticated',
          update: 'authenticated',
          delete: ['admin'],
        },
      },
    ],
  }).init();


  // 4. Start Local Hono Server
  const server = Bun.serve({
    fetch: app.fetch,
    port: 3006,
    hostname: '127.0.0.1',
  });

  console.log('Running test Hono server on http://127.0.0.1:3006');

  try {
    // Test 1: GET /admin/static/admin.css
    let res = await fetch('http://127.0.0.1:3006/admin/static/admin.css');
    assert(res.status === 200, 'Static CSS should load with 200 OK');
    assert(res.headers.get('content-type')?.includes('text/css') === true, 'CSS content-type should be text/css');
    const cssText = await res.text();
    assert(cssText.includes('--bg-main: #09090b'), 'CSS should contain modern dark colors theme');

    // Test 2: Unauthenticated GET /admin (should redirect to /admin/login)
    res = await fetch('http://127.0.0.1:3006/admin', { redirect: 'manual' });
    assert(res.status === 302, 'Unauthenticated access to dashboard should redirect (302)');
    assert(res.headers.get('location')?.endsWith('/admin/login') === true, 'Should redirect to /admin/login');

    // Test 3: GET /admin/login (should render login template)
    res = await fetch('http://127.0.0.1:3006/admin/login');
    assert(res.status === 200, 'Login page should return 200 OK');
    const loginHtml = await res.text();
    assert(loginHtml.includes('Login - OpacaCMS Admin'), 'Login page should render title');

    // Test 4: POST /admin/login with invalid credentials (redirect to login with error)
    res = await fetch('http://127.0.0.1:3006/admin/login', {
      method: 'POST',
      redirect: 'manual',
      body: new URLSearchParams({
        email: 'wrong@opaca.io',
        password: 'wrongpassword'
      })
    });
    assert(res.status === 302, 'Failed login should redirect (302)');
    assert(res.headers.get('location')?.includes('/admin/login?error=') === true, 'Should redirect to login with error query param');

    // Test 5: POST /admin/login with correct credentials (redirect to dashboard with cookie)
    res = await fetch('http://127.0.0.1:3006/admin/login', {
      method: 'POST',
      redirect: 'manual',
      body: new URLSearchParams({
        email: 'admin@opaca.io',
        password: 'adminpassword'
      })
    });
    assert(res.status === 302, 'Successful login should redirect (302)');
    assert(res.headers.get('location')?.endsWith('/admin') === true, 'Should redirect to dashboard');
    const adminCookie = res.headers.get('set-cookie');
    assert(adminCookie !== null && adminCookie.includes('opaca_session'), 'Successful login must set opaca_session cookie');

    // Test 6: Authenticated GET /admin
    res = await fetch('http://127.0.0.1:3006/admin', {
      headers: { 'Cookie': adminCookie! }
    });
    assert(res.status === 200, 'Authenticated dashboard should return 200 OK');
    const dashboardHtml = await res.text();
    assert(dashboardHtml.includes('Dashboard'), 'Dashboard HTML should contain Dashboard header');
    assert(dashboardHtml.includes('Blog Posts'), 'Dashboard HTML should contain custom collection label "Blog Posts"');
    assert(dashboardHtml.includes('data-lucide="book-open"'), 'Dashboard HTML should contain Lucide icon for Blog Posts');
    assert(dashboardHtml.includes('data-lucide="layout-dashboard"'), 'Dashboard HTML should contain layout-dashboard icon in the sidebar');
    assert(dashboardHtml.includes('data-lucide="chevron-left"'), 'Dashboard HTML should contain chevron-left icon for collapsible toggle button');

    // Test 7: GET /admin/collections/posts (List View)
    res = await fetch('http://127.0.0.1:3006/admin/collections/posts', {
      headers: { 'Cookie': adminCookie! }
    });
    assert(res.status === 200, 'Records list page should return 200 OK');
    const listHtml = await res.text();
    assert(listHtml.includes('Blog Posts'), 'List page should list custom collection label "Blog Posts"');
    assert(listHtml.includes('No records found'), 'List page should initially state that there are no records');

    // Test 8: GET /admin/collections/posts/new (Form View)
    res = await fetch('http://127.0.0.1:3006/admin/collections/posts/new', {
      headers: { 'Cookie': adminCookie! }
    });
    assert(res.status === 200, 'New Record form should return 200 OK');
    const newFormHtml = await res.text();
    assert(newFormHtml.includes('Create Blog Posts'), 'New Form page should contain header with custom label');
    assert(newFormHtml.includes('name="title"'), 'New Form page should contain title input field');
    assert(newFormHtml.includes('name="featured"'), 'New Form page should contain featured checkbox');

    // Test 9: POST /admin/collections/posts/new (Create Record)
    res = await fetch('http://127.0.0.1:3006/admin/collections/posts/new', {
      method: 'POST',
      headers: {
        'Cookie': adminCookie!,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      redirect: 'manual',
      body: new URLSearchParams({
        title: 'Form Created Post',
        content: 'This was created using an HTML Form POST.',
        featured: 'on' // checkbox checked
      })
    });
    assert(res.status === 302, 'Successful creation should redirect (302)');
    assert(res.headers.get('location')?.includes('/admin/collections/posts?success=') === true, 'Should redirect to collection listing page with success message');

    // Verify record in database
    const dbPosts = sqliteDb.prepare('SELECT * FROM posts').all() as any[];
    assert(dbPosts.length === 1, 'One post should have been created in database');
    assert(dbPosts[0].title === 'Form Created Post', 'DB post title should match');
    assert(dbPosts[0].content === 'This was created using an HTML Form POST.', 'DB post content should match');
    assert(dbPosts[0].featured === 1 || dbUpdatedPostsSameCheck(dbPosts[0].featured), 'DB post featured checkbox should be parsed as true');
    const createdId = dbPosts[0].id;

    // Test 10: GET /admin/collections/posts/:id (Edit Form View)
    res = await fetch(`http://127.0.0.1:3006/admin/collections/posts/${createdId}`, {
      headers: { 'Cookie': adminCookie! }
    });
    assert(res.status === 200, 'Edit Form page should return 200 OK');
    const editFormHtml = await res.text();
    assert(editFormHtml.includes('value="Form Created Post"'), 'Edit Form page should prefill input values');
    assert(editFormHtml.includes('checked'), 'Edit Form checkbox should be checked');

    // Test 11: POST /admin/collections/posts/:id (Update Record)
    res = await fetch(`http://127.0.0.1:3006/admin/collections/posts/${createdId}`, {
      method: 'POST',
      headers: {
        'Cookie': adminCookie!,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      redirect: 'manual',
      body: new URLSearchParams({
        title: 'Updated Post Title',
        content: 'Updated content.',
        // featured is unchecked (missing from payload)
      })
    });
    assert(res.status === 302, 'Successful update should redirect (302)');

    // Verify update in database (specifically that unchecked checkbox was set to false)
    const dbUpdatedPosts = sqliteDb.prepare('SELECT * FROM posts').all() as any[];
    assert(dbUpdatedPosts.length === 1, 'Should still have one post');
    assert(dbUpdatedPosts[0].title === 'Updated Post Title', 'DB post title should be updated');
    assert(dbUpdatedPosts[0].featured === 0 || dbUpdatedPosts[0].featured === false, 'DB post checkbox should have been coerced to false');

    // Test 12: POST /admin/collections/posts/:id (Delete Record)
    res = await fetch(`http://127.0.0.1:3006/admin/collections/posts/${createdId}`, {
      method: 'POST',
      headers: {
        'Cookie': adminCookie!,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      redirect: 'manual',
      body: new URLSearchParams({
        _action: 'delete'
      })
    });
    assert(res.status === 302, 'Successful deletion should redirect (302)');

    // Verify deletion in database
    const dbFinalPosts = sqliteDb.prepare('SELECT * FROM posts').all() as any[];
    assert(dbFinalPosts.length === 0, 'Post should be deleted from the database');

    console.log('PHASE 3 admin UI tests completed successfully! 🎉\n');
  } finally {
    server.stop();
    sqliteDb.close();
  }
}

// Helper checkbox check
function dbUpdatedPostsSameCheck(val: any): boolean {
  return val === true || val === 1;
}

async function runAll() {
  await runPhase1SmokeTests();
  await runPhase2IntegrationTests();
  await runPhase3AdminTests();
  console.log('All tests completed successfully! OpacaCMS is fully working! 🚀');
}

runAll().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});


