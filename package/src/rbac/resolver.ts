import type { AccessRule, AccessContext } from '../fields/types';

/**
 * Resolves an AccessRule against the given AccessContext.
 * If the rule is undefined, it defaults to true (access allowed).
 */
export async function resolveAccess(
  rule: AccessRule | undefined,
  ctx: AccessContext
): Promise<boolean> {
  if (rule === undefined) {
    return true;
  }

  if (rule === 'public') {
    return true;
  }

  if (rule === 'authenticated') {
    return ctx.user !== null;
  }

  if (Array.isArray(rule)) {
    if (!ctx.user) return false;
    return rule.includes(ctx.user.role);
  }

  if (typeof rule === 'function') {
    try {
      const result = await rule(ctx);
      return Boolean(result);
    } catch (error) {
      console.error('Error resolving custom access rule:', error);
      return false;
    }
  }

  return false;
}
