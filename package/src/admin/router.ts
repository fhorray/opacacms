import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { DatabaseAdapter } from '../db/adapter';
import type { CollectionAccess } from '../fields/types';
import { sessionMiddleware } from '../api/middleware/session';
import type { OpacaEnv } from '../api/middleware/session';
import { resolveAccess } from '../rbac/resolver';
import { filterFieldsForWrite } from '../rbac/field-filter';
import { generateSessionToken, createSession, invalidateSession } from '../auth/session';
import { verifyPassword, hashPassword } from '../auth/password';
import { parseFormBody } from './utils/body-parser';
import { renderFieldHtml } from './field-renderer';
import { getFieldMeta } from '../fields/utils';
import { renderTemplate } from '../template/engine';
import { ADMIN_CSS } from './static/css';
import {
  LAYOUT_TEMPLATE,
  LOGIN_TEMPLATE,
  SETUP_TEMPLATE,
  DASHBOARD_TEMPLATE,
  LIST_TEMPLATE,
  FORM_TEMPLATE,
} from './views/templates';
import { z } from 'zod';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Helper to unwrap optional and default schemas
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (true) {
    const def = (current as any)._def;
    if (def && def.innerType) {
      current = def.innerType;
    } else if (def && def.schema) {
      current = def.schema;
    } else {
      break;
    }
  }
  return current;
}

// Helper to flatten Zod format errors to flat dot notation map
function flattenErrors(zodErrorFormat: any, prefix: string, results: Record<string, string>) {
  if (!zodErrorFormat) return;
  if (zodErrorFormat._errors && zodErrorFormat._errors.length > 0) {
    results[prefix.slice(0, -1)] = zodErrorFormat._errors[0];
  }
  for (const [key, val] of Object.entries(zodErrorFormat)) {
    if (key !== '_errors') {
      flattenErrors(val, `${prefix}${key}.`, results);
    }
  }
}

// Helper to prefetch relation collection options
async function fetchRelationOptions(
  schema: z.ZodObject<any>,
  db: DatabaseAdapter
): Promise<Record<string, { label: string; value: string }[]>> {
  const referencedSlugs = new Set<string>();

  function findReferenced(schemaNode: z.ZodTypeAny) {
    const meta = getFieldMeta(schemaNode);
    if (meta && meta.fieldType === 'relation' && meta.collection) {
      referencedSlugs.add(meta.collection);
      return;
    }
    
    const unwrapped = unwrapSchema(schemaNode);
    const typeName = unwrapped.constructor?.name;

    const def = (unwrapped as any)._def;
    if (def && def.innerType) {
      findReferenced(def.innerType);
      return;
    }
    if (def && def.schema) {
      findReferenced(def.schema);
      return;
    }

    if (typeName === 'ZodObject') {
      const shape = (unwrapped as z.ZodObject<any>).shape;
      for (const val of Object.values(shape)) {
        findReferenced(val as z.ZodTypeAny);
      }
    } else if (typeName === 'ZodArray') {
      const elementSchema = (unwrapped as z.ZodArray<any>).element;
      findReferenced(elementSchema);
    }
  }

  findReferenced(schema);

  const results: Record<string, { label: string; value: string }[]> = {};
  for (const slug of referencedSlugs) {
    try {
      const docs = await db.find(slug);
      results[slug] = docs.map(doc => {
        const label = doc.title || doc.name || doc.label || doc.email || doc.id;
        return {
          label: String(label),
          value: doc.id
        };
      });
    } catch {
      results[slug] = [];
    }
  }

  return results;
}

// Helper to partition schema fields into main list and sidebar list
function partitionFields(schema: z.ZodObject<any>): {
  mainFields: [string, z.ZodTypeAny][];
  sidebarFields: [string, z.ZodTypeAny][];
} {
  const mainFields: [string, z.ZodTypeAny][] = [];
  const sidebarFields: [string, z.ZodTypeAny][] = [];

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const meta = getFieldMeta(fieldSchema as any);
    if (meta?.hidden) {
      mainFields.push([key, fieldSchema as any]);
      continue;
    }
    const type = meta?.fieldType || 'text';
    if (type === 'sidebar') {
      sidebarFields.push([key, fieldSchema as any]);
    } else {
      mainFields.push([key, fieldSchema as any]);
    }
  }

  // Fallback: If no visible main fields, move all sidebar fields to main list
  const hasVisibleMainFields = mainFields.some(([_, fs]) => !getFieldMeta(fs)?.hidden);
  if (!hasVisibleMainFields && sidebarFields.length > 0) {
    mainFields.push(...sidebarFields);
    sidebarFields.length = 0;
  }

  return { mainFields, sidebarFields };
}

// Helper to render partitioned fields into main and sidebar HTML columns
function renderPartitionedFields(
  schema: z.ZodObject<any>,
  values: Record<string, any>,
  errors: Record<string, string> | undefined,
  relationOptions: Record<string, { label: string; value: string }[]>
): {
  mainFieldsHtml: string;
  sidebarFieldsHtml: string;
  hasSidebar: boolean;
} {
  const { mainFields, sidebarFields } = partitionFields(schema);
  let mainFieldsHtml = '';
  let sidebarFieldsHtml = '';

  for (const [key, fieldSchema] of mainFields) {
    mainFieldsHtml += renderFieldHtml(key, fieldSchema, values?.[key], errors, relationOptions);
  }
  for (const [key, fieldSchema] of sidebarFields) {
    sidebarFieldsHtml += renderFieldHtml(key, fieldSchema, values?.[key], errors, relationOptions);
  }

  return {
    mainFieldsHtml,
    sidebarFieldsHtml,
    hasSidebar: sidebarFields.length > 0,
  };
}

import type { CollectionConfig } from '../cms';

/**
 * Creates and returns the Hono router for the Admin UI endpoints.
 */
export function createAdminRouter(
  db: DatabaseAdapter,
  collections: Map<string, CollectionConfig>
) {
  const admin = new Hono<OpacaEnv>();

  // Attach session middleware to populate c.get('user') and c.get('session')
  admin.use('*', sessionMiddleware(db));

  // Serve static admin CSS stylesheet
  admin.get('/static/admin.css', (c) => {
    return c.body(ADMIN_CSS, 200, {
      'Content-Type': 'text/css; charset=UTF-8'
    });
  });

  // Serve static editor JS files (native ESM)
  admin.get('/static/editor/:filename', (c) => {
    const filename = c.req.param('filename');
    if (!['editor.js', 'toolbar.js', 'extensions.js', 'commands.js'].includes(filename)) {
      return c.text('Not Found', 404);
    }
    try {
      const filePath = join(__dirname, 'editor', filename);
      const code = readFileSync(filePath, 'utf8');
      return c.body(code, 200, {
        'Content-Type': 'application/javascript; charset=UTF-8'
      });
    } catch (e: any) {
      return c.text(`Error: ${e.message}`, 500);
    }
  });

  // Redirect to setup if no users exist
  admin.use('*', async (c, next) => {
    const path = c.req.path;
    // Skip static CSS, setup endpoints, and logout
    if (path.startsWith('/admin/static/') || path === '/admin/setup' || path === '/admin/logout') {
      return next();
    }
    const hasUsers = await db.hasUsers();
    if (!hasUsers) {
      return c.redirect('/admin/setup');
    }
    await next();
  });

  // First-time Setup Page (GET)
  admin.get('/setup', async (c) => {
    const hasUsers = await db.hasUsers();
    if (hasUsers) {
      return c.redirect('/admin/login');
    }
    const error = c.req.query('error');
    const success = c.req.query('success');
    return c.html(renderTemplate(SETUP_TEMPLATE, { error, success }));
  });

  // First-time Setup Action (POST)
  admin.post('/setup', async (c) => {
    const hasUsers = await db.hasUsers();
    if (hasUsers) {
      return c.redirect('/admin/login');
    }

    try {
      const body = await c.req.parseBody();
      const email = body.email as string;
      const password = body.password as string;
      const confirmPassword = body.confirmPassword as string;

      if (!email || !password || !confirmPassword) {
        return c.redirect('/admin/setup?error=All+fields+are+required');
      }

      if (password !== confirmPassword) {
        return c.redirect('/admin/setup?error=Passwords+do+not+match');
      }

      if (password.length < 8) {
        return c.redirect('/admin/setup?error=Password+must+be+at+least+8+characters');
      }

      // Hash password and create admin user
      const passwordHash = await hashPassword(password);
      const user = await db.createUser({
        id: crypto.randomUUID(),
        email,
        passwordHash,
        role: 'admin',
        createdAt: new Date(),
      });

      // Automatically log them in by creating a session
      const token = generateSessionToken();
      const session = await createSession(token, user.id, db);

      setCookie(c, 'opaca_session', token, {
        path: '/',
        httpOnly: true,
        secure: c.req.url.startsWith('https://'),
        sameSite: 'Lax',
        expires: session.expiresAt,
      });

      return c.redirect('/admin');
    } catch (e: any) {
      return c.redirect(`/admin/setup?error=${encodeURIComponent(e.message || 'Setup failed')}`);
    }
  });


  // Login Page (GET)
  admin.get('/login', async (c) => {
    const user = c.get('user');
    if (user) {
      return c.redirect('/admin');
    }
    const error = c.req.query('error');
    const success = c.req.query('success');
    return c.html(renderTemplate(LOGIN_TEMPLATE, { error, success }));
  });

  // Login action (POST)
  admin.post('/login', async (c) => {
    try {
      const body = await c.req.parseBody();
      const email = body.email as string;
      const password = body.password as string;

      if (!email || !password) {
        return c.redirect('/admin/login?error=Email+and+password+are+required');
      }

      const user = await db.findUserByEmail(email);
      if (!user) {
        return c.redirect('/admin/login?error=Invalid+credentials');
      }

      // Check if user has permission to access administration
      if (user.role !== 'admin' && user.role !== 'editor') {
        return c.redirect('/admin/login?error=Access+denied');
      }

      const validPassword = await verifyPassword(user.passwordHash, password);
      if (!validPassword) {
        return c.redirect('/admin/login?error=Invalid+credentials');
      }

      const token = generateSessionToken();
      const session = await createSession(token, user.id, db);

      setCookie(c, 'opaca_session', token, {
        path: '/',
        httpOnly: true,
        secure: c.req.url.startsWith('https://'),
        sameSite: 'Lax',
        expires: session.expiresAt,
      });

      return c.redirect('/admin');
    } catch (e: any) {
      return c.redirect(`/admin/login?error=${encodeURIComponent(e.message || 'Login failed')}`);
    }
  });

  // Logout action (POST)
  admin.post('/logout', async (c) => {
    const token = getCookie(c, 'opaca_session');
    if (token) {
      await invalidateSession(token, db);
    }

    setCookie(c, 'opaca_session', '', {
      path: '/',
      httpOnly: true,
      secure: c.req.url.startsWith('https://'),
      sameSite: 'Lax',
      expires: new Date(0),
    });

    return c.redirect('/admin/login?success=Logged+out+successfully');
  });

  // Protection Middleware for other pages
  admin.use('*', async (c, next) => {
    const path = c.req.path;
    // Skip public endpoints
    if (path.startsWith('/admin/static/') || path === '/admin/login' || path === '/admin/logout' || path === '/admin/setup') {
      return next();
    }
    const user = c.get('user');
    if (!user) {
      return c.redirect('/admin/login');
    }
    await next();
  });

  function toKebabCase(str: string): string {
    let name = str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    if (name.endsWith('-icon')) {
      name = name.slice(0, -5);
    }
    return name;
  }

  // Helper to render pages within global layout wrapper
  function renderPage(c: any, title: string, bodyHtml: string, activeSlug?: string) {
    const user = c.get('user');
    const cols = Array.from(collections.values()).map(col => ({
      slug: col.slug,
      label: col.label || (col.slug.charAt(0).toUpperCase() + col.slug.slice(1)),
      icon: col.icon ? toKebabCase(col.icon) : undefined,
      active: col.slug === activeSlug
    }));

    const flashError = c.req.query('error');
    const flashSuccess = c.req.query('success');

    const layoutHtml = renderTemplate(LAYOUT_TEMPLATE, {
      title,
      userEmail: user?.email || '',
      userRole: user?.role || '',
      collections: cols,
      isDashboardActive: !activeSlug,
      flashError,
      flashSuccess,
      body: bodyHtml,
    });
    return c.html(layoutHtml);
  }

  // Dashboard Page (GET)
  admin.get('/', async (c) => {
    const widgets = [];
    for (const [slug, col] of collections.entries()) {
      const cnt = await db.count(slug);
      widgets.push({
        slug,
        label: col.label || (slug.charAt(0).toUpperCase() + slug.slice(1)),
        count: cnt,
        icon: col.icon ? toKebabCase(col.icon) : undefined,
      });
    }

    const bodyHtml = renderTemplate(DASHBOARD_TEMPLATE, { widgets });
    return renderPage(c, 'Dashboard', bodyHtml);
  });

  // Collection Records List (GET)
  admin.get('/collections/:slug', async (c) => {
    const slug = c.req.param('slug');
    const collection = collections.get(slug);
    if (!collection) {
      return c.redirect('/admin?error=Collection+not+found');
    }

    const user = c.get('user');
    const canRead = await resolveAccess(collection.access?.read, { user });
    if (!canRead) {
      return c.redirect('/admin?error=Forbidden+access');
    }

    const cnt = await db.count(slug);
    const records = await db.find(slug);

    // Identify standard fields to display in table header (exclude groups/accordions/arrays)
    const shape = collection.schema.shape;
    const displayFields: string[] = [];
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const meta = getFieldMeta(fieldSchema as any);
      if (meta?.hidden) continue;
      const type = meta?.fieldType || 'text';
      if (type !== 'group' && type !== 'accordion' && type !== 'array') {
        displayFields.push(key);
      }
    }
    const activeFields = displayFields.slice(0, 4);

    const formattedRecords = records.map(rec => {
      const values = activeFields.map(field => {
        const val = rec[field];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
      return {
        id: rec.id,
        values
      };
    });

    const colLabel = collection.label || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const bodyHtml = renderTemplate(LIST_TEMPLATE, {
      collectionSlug: slug,
      collectionLabel: colLabel,
      canCreate: await resolveAccess(collection.access?.create, { user }),
      isEmpty: formattedRecords.length === 0,
      fields: activeFields.map(f => f.toUpperCase()),
      records: formattedRecords,
      count: cnt,
    });

    return renderPage(c, colLabel, bodyHtml, slug);
  });

  // Create Document Form (GET)
  admin.get('/collections/:slug/new', async (c) => {
    const slug = c.req.param('slug');
    const collection = collections.get(slug);
    if (!collection) {
      return c.redirect('/admin?error=Collection+not+found');
    }

    const user = c.get('user');
    const canCreate = await resolveAccess(collection.access?.create, { user });
    if (!canCreate) {
      return c.redirect(`/admin/collections/${slug}?error=Forbidden+access`);
    }

    const relationOptions = await fetchRelationOptions(collection.schema, db);
    const defaultValues: Record<string, any> = {};
    for (const [key, fieldSchema] of Object.entries(collection.schema.shape)) {
      const meta = getFieldMeta(fieldSchema as any);
      if (meta?.defaultValue !== undefined) {
        defaultValues[key] = meta.defaultValue;
      }
    }

    const { mainFieldsHtml, sidebarFieldsHtml, hasSidebar } = renderPartitionedFields(
      collection.schema,
      defaultValues,
      undefined,
      relationOptions
    );

    const colLabel = collection.label || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const bodyHtml = renderTemplate(FORM_TEMPLATE, {
      formTitle: 'Create ' + colLabel,
      formSubtitle: 'Fill in the form to add a new record to the collection.',
      collectionSlug: slug,
      formAction: `/admin/collections/${slug}/new`,
      mainFieldsHtml,
      sidebarFieldsHtml,
      hasSidebar,
      isEdit: false
    });

    return renderPage(c, 'New ' + colLabel, bodyHtml, slug);
  });

  // Create Document action (POST)
  admin.post('/collections/:slug/new', async (c) => {
    const slug = c.req.param('slug');
    const collection = collections.get(slug);
    if (!collection) {
      return c.redirect('/admin?error=Collection+not+found');
    }

    const user = c.get('user');
    const flatBody = await c.req.parseBody();
    const nestedData = parseFormBody(flatBody, collection.schema);

    const canCreate = await resolveAccess(collection.access?.create, { user, data: nestedData });
    if (!canCreate) {
      return c.redirect(`/admin/collections/${slug}?error=Forbidden+access`);
    }

    const schemaShape = collection.schema.shape;
    const filteredWrite = await filterFieldsForWrite(schemaShape, nestedData, undefined, user);

    const parsed = collection.schema.safeParse(filteredWrite);
    if (parsed.success) {
      await db.create(slug, parsed.data);
      return c.redirect(`/admin/collections/${slug}?success=Record+created+successfully`);
    }

    const relationOptions = await fetchRelationOptions(collection.schema, db);
    const errors: Record<string, string> = {};
    flattenErrors(parsed.error.format(), '', errors);

    const { mainFieldsHtml, sidebarFieldsHtml, hasSidebar } = renderPartitionedFields(
      collection.schema,
      nestedData,
      errors,
      relationOptions
    );

    const colLabel = collection.label || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const bodyHtml = renderTemplate(FORM_TEMPLATE, {
      formTitle: 'Create ' + colLabel,
      formSubtitle: 'Please correct the validation errors below.',
      collectionSlug: slug,
      formAction: `/admin/collections/${slug}/new`,
      mainFieldsHtml,
      sidebarFieldsHtml,
      hasSidebar,
      isEdit: false
    });

    return renderPage(c, 'New ' + colLabel, bodyHtml, slug);
  });

  // Edit/Delete Document Form (GET)
  admin.get('/collections/:slug/:id', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const collection = collections.get(slug);
    if (!collection) {
      return c.redirect('/admin?error=Collection+not+found');
    }

    const doc = await db.findById(slug, id);
    if (!doc) {
      return c.redirect(`/admin/collections/${slug}?error=Record+not+found`);
    }

    const user = c.get('user');
    const canRead = await resolveAccess(collection.access?.read, { user, doc });
    if (!canRead) {
      return c.redirect(`/admin/collections/${slug}?error=Forbidden+access`);
    }

    const relationOptions = await fetchRelationOptions(collection.schema, db);

    const { mainFieldsHtml, sidebarFieldsHtml, hasSidebar } = renderPartitionedFields(
      collection.schema,
      doc,
      undefined,
      relationOptions
    );

    const colLabel = collection.label || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const bodyHtml = renderTemplate(FORM_TEMPLATE, {
      formTitle: 'Edit ' + colLabel,
      formSubtitle: 'Modify record field values.',
      collectionSlug: slug,
      formAction: `/admin/collections/${slug}/${id}`,
      mainFieldsHtml,
      sidebarFieldsHtml,
      hasSidebar,
      isEdit: true
    });

    return renderPage(c, 'Edit ' + colLabel, bodyHtml, slug);
  });

  // Edit/Delete Document action (POST)
  admin.post('/collections/:slug/:id', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const collection = collections.get(slug);
    if (!collection) {
      return c.redirect('/admin?error=Collection+not+found');
    }

    const existing = await db.findById(slug, id);
    if (!existing) {
      return c.redirect(`/admin/collections/${slug}?error=Record+not+found`);
    }

    const user = c.get('user');
    const flatBody = await c.req.parseBody();

    // Check if user hit the Delete button
    if (flatBody._action === 'delete') {
      const canDelete = await resolveAccess(collection.access?.delete, { user, doc: existing });
      if (!canDelete) {
        return c.redirect(`/admin/collections/${slug}/${id}?error=Forbidden+access`);
      }
      await db.delete(slug, id);
      return c.redirect(`/admin/collections/${slug}?success=Record+deleted+successfully`);
    }

    const nestedData = parseFormBody(flatBody, collection.schema);

    const canUpdate = await resolveAccess(collection.access?.update, {
      user,
      doc: existing,
      data: nestedData
    });
    if (!canUpdate) {
      return c.redirect(`/admin/collections/${slug}/${id}?error=Forbidden+access`);
    }

    const schemaShape = collection.schema.shape;
    const filteredWrite = await filterFieldsForWrite(schemaShape, nestedData, existing, user);

    const merged = { ...existing, ...filteredWrite };
    const parsed = collection.schema.safeParse(merged);

    if (parsed.success) {
      await db.update(slug, id, filteredWrite);
      return c.redirect(`/admin/collections/${slug}?success=Record+updated+successfully`);
    }

    const relationOptions = await fetchRelationOptions(collection.schema, db);
    const errors: Record<string, string> = {};
    flattenErrors(parsed.error.format(), '', errors);

    const { mainFieldsHtml, sidebarFieldsHtml, hasSidebar } = renderPartitionedFields(
      collection.schema,
      nestedData,
      errors,
      relationOptions
    );

    const colLabel = collection.label || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const bodyHtml = renderTemplate(FORM_TEMPLATE, {
      formTitle: 'Edit ' + colLabel,
      formSubtitle: 'Please correct the validation errors below.',
      collectionSlug: slug,
      formAction: `/admin/collections/${slug}/${id}`,
      mainFieldsHtml,
      sidebarFieldsHtml,
      hasSidebar,
      isEdit: true
    });

    return renderPage(c, 'Edit ' + colLabel, bodyHtml, slug);
  });

  return admin;
}
