import { getCookie, setCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { validateSessionToken } from '../../auth/session';
import type { DatabaseAdapter, Session, User } from '../../db/adapter';

export type OpacaEnv = {
  Variables: {
    user: User | null;
    session: Session | null;
  };
};

/**
 * Hono middleware that extracts the session token from the `opaca_session` cookie,
 * validates it against the database, and injects the session and user info into the context.
 */
export function sessionMiddleware(db: DatabaseAdapter): MiddlewareHandler<OpacaEnv> {
  return async (c, next) => {
    const token = getCookie(c, 'opaca_session');
    
    if (!token) {
      c.set('user', null);
      c.set('session', null);
      return next();
    }

    const { session, user } = await validateSessionToken(token, db);
    
    if (session && user) {
      c.set('user', user);
      c.set('session', session);

      // Refresh cookie expiration in the browser to match sliding expiry
      setCookie(c, 'opaca_session', token, {
        path: '/',
        httpOnly: true,
        secure: c.req.url.startsWith('https://'),
        sameSite: 'Lax',
        expires: session.expiresAt,
      });
    } else {
      c.set('user', null);
      c.set('session', null);
      
      // Clear invalid cookie
      setCookie(c, 'opaca_session', '', {
        path: '/',
        httpOnly: true,
        secure: c.req.url.startsWith('https://'),
        sameSite: 'Lax',
        expires: new Date(0),
      });
    }

    await next();
  };
}
