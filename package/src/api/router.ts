import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { DatabaseAdapter } from '../db/adapter';
import type { CollectionAccess } from '../fields/types';
import { sessionMiddleware } from './middleware/session';
import type { OpacaEnv } from './middleware/session';
import { resolveAccess } from '../rbac/resolver';
import { filterFieldsForRead, filterFieldsForWrite } from '../rbac/field-filter';
import { generateSessionToken, createSession, invalidateSession } from '../auth/session';
import { hashPassword, verifyPassword } from '../auth/password';

/**
 * Creates and returns the Hono router for all API endpoints, including auth (login, logout, register, me)
 * and dynamic collection CRUD operations.
 */
export function createApiRouter(
  db: DatabaseAdapter,
  collections: Map<
    string,
    {
      slug: string;
      schema: any;
      access?: CollectionAccess;
    }
  >
) {
  const api = new Hono<OpacaEnv>();

  // Attach session middleware to populate c.get('user') and c.get('session')
  api.use('*', sessionMiddleware(db));

  // --- Authentication Endpoints ---

  /**
   * Registers a new dashboard admin/editor user.
   */
  api.post('/auth/register', async (c) => {
    try {
      const body = await c.req.json();
      const { email, password, role } = body;

      if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const hasUsers = await db.hasUsers();
      if (hasUsers) {
        const currentUser = c.get('user');
        if (!currentUser || currentUser.role !== 'admin') {
          return c.json({ error: 'Unauthorized. Only admins can register new users.' }, 403);
        }
      }

      const existingUser = await db.findUserByEmail(email);
      if (existingUser) {
        return c.json({ error: 'User already exists' }, 400);
      }

      const passwordHash = await hashPassword(password);
      const user = await db.createUser({
        id: crypto.randomUUID(),
        email,
        passwordHash,
        role: hasUsers ? (role || 'editor') : 'admin',
        createdAt: new Date(),
      });

      // Automatically log in only the first setup user (when there were no users before)
      if (!hasUsers) {
        const token = generateSessionToken();
        const session = await createSession(token, user.id, db);

        setCookie(c, 'opaca_session', token, {
          path: '/',
          httpOnly: true,
          secure: c.req.url.startsWith('https://'),
          sameSite: 'Lax',
          expires: session.expiresAt,
        });
      }

      return c.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }, 201);
    } catch (e: any) {
      return c.json({ error: e.message || 'Registration failed' }, 500);
    }
  });

  /**
   * Logins an existing dashboard admin/editor user.
   */
  api.post('/auth/login', async (c) => {
    try {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const user = await db.findUserByEmail(email);
      if (!user) {
        return c.json({ error: 'Invalid credentials' }, 400);
      }

      const validPassword = await verifyPassword(user.passwordHash, password);
      if (!validPassword) {
        return c.json({ error: 'Invalid credentials' }, 400);
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

      return c.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (e: any) {
      return c.json({ error: e.message || 'Login failed' }, 500);
    }
  });

  /**
   * Logouts the current logged in user.
   */
  api.post('/auth/logout', async (c) => {
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

    return c.json({ success: true });
  });

  /**
   * Gets details of the currently authenticated user.
   */
  api.get('/auth/me', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ user: null });
    }
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  });

  // --- Dynamic Collection CRUD Endpoints ---

  /**
   * Extracts query sorting, limit, offset, and basic where equality from Hono query parameters.
   */
  function getQueryOptions(req: any) {
    const query = req.query();
    const options: any = {};

    const where: Record<string, any> = {};
    for (const [key, val] of Object.entries(query)) {
      if (['limit', 'offset', 'sortField', 'sortOrder'].includes(key)) {
        continue;
      }
      where[key] = val;
    }
    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    if (query.limit) {
      options.limit = parseInt(query.limit, 10);
    }
    if (query.offset) {
      options.offset = parseInt(query.offset, 10);
    }
    if (query.sortField) {
      options.sort = {
        field: query.sortField,
        direction: query.sortOrder === 'desc' ? 'desc' : 'asc',
      };
    }

    return options;
  }

  // GET List of documents
  api.get('/:slug', async (c) => {
    const slug = c.req.param('slug');
    const collection = collections.get(slug);
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const user = c.get('user');
    const canRead = await resolveAccess(collection.access?.read, { user });
    if (!canRead) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const queryOptions = getQueryOptions(c.req);
    const docs = await db.find(slug, queryOptions);
    const schemaShape = collection.schema.shape;

    const filteredDocs = await Promise.all(
      docs.map((doc) => filterFieldsForRead(schemaShape, doc, user))
    );

    return c.json(filteredDocs);
  });

  // GET Single document by ID
  api.get('/:slug/:id', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const collection = collections.get(slug);
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const doc = await db.findById(slug, id);
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const user = c.get('user');
    const canRead = await resolveAccess(collection.access?.read, { user, doc });
    if (!canRead) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const filteredDoc = await filterFieldsForRead(collection.schema.shape, doc, user);
    return c.json(filteredDoc);
  });

  // POST Create document
  api.post('/:slug', async (c) => {
    const slug = c.req.param('slug');
    const collection = collections.get(slug);
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const user = c.get('user');
    const canCreate = await resolveAccess(collection.access?.create, { user, data: body });
    if (!canCreate) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const schemaShape = collection.schema.shape;
    const filteredWrite = await filterFieldsForWrite(schemaShape, body, undefined, user);

    const parsed = collection.schema.safeParse(filteredWrite);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const created = await db.create(slug, parsed.data);
    const filteredRead = await filterFieldsForRead(schemaShape, created, user);

    return c.json(filteredRead, 201);
  });

  // PATCH Update document
  api.patch('/:slug/:id', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const collection = collections.get(slug);
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const existing = await db.findById(slug, id);
    if (!existing) {
      return c.json({ error: 'Document not found' }, 404);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const user = c.get('user');
    const canUpdate = await resolveAccess(collection.access?.update, {
      user,
      doc: existing,
      data: body,
    });
    if (!canUpdate) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const schemaShape = collection.schema.shape;
    const filteredWrite = await filterFieldsForWrite(schemaShape, body, existing, user);

    const merged = { ...existing, ...filteredWrite };
    const parsed = collection.schema.safeParse(merged);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const updated = await db.update(slug, id, filteredWrite);
    const filteredRead = await filterFieldsForRead(schemaShape, updated, user);

    return c.json(filteredRead);
  });

  // DELETE document
  api.delete('/:slug/:id', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const collection = collections.get(slug);
    if (!collection) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const existing = await db.findById(slug, id);
    if (!existing) {
      return c.json({ error: 'Document not found' }, 404);
    }

    const user = c.get('user');
    const canDelete = await resolveAccess(collection.access?.delete, { user, doc: existing });
    if (!canDelete) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await db.delete(slug, id);
    return c.json({ success: true }, 200);
  });

  return api;
}
