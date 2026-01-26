import { createRouter, openPage, redirectPage, getPagePath } from '@nanostores/router';

export interface RouterOptions {
  basePath?: string;
  links?: boolean;
}

/**
 * Creates the admin router with optional base path and link tracking
 */
export function createAdminRouter(options: RouterOptions = {}) {
  const base = options.basePath || '';

  return createRouter({
    home: base || '/',
    collection: `${base}/:collection`,
    documentEdit: `${base}/:collection/:id`,
    documentCreate: `${base}/:collection/create`,
  }, {
    links: options.links ?? true
  });
}

// Default router instance for simple usage
export const $router = createAdminRouter();

// Navigation helpers
export function navigateTo(router: ReturnType<typeof createRouter>, route: any, params: Record<string, string> = {}) {
  openPage(router, route, params);
}

export function redirectTo(router: ReturnType<typeof createRouter>, route: any, params: Record<string, string> = {}) {
  redirectPage(router, route, params);
}

export function getPath(router: ReturnType<typeof createRouter>, route: any, params: Record<string, string> = {}) {
  return getPagePath(router, route, params);
}
