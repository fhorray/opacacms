import type { OpacaConfig } from './types';
import { OpacaConfigSchema } from './validation';

/**
 * Helper to define the OpacaCMS configuration with full type safety.
 */
import type { Collection } from './types';

/**
 * Helper logic to infer slugs from collections.
 */
export function defineConfig<const TCollections extends readonly Collection[]>(
  config: OpacaConfig<TCollections[number]['slug']> & { collections: TCollections }
): OpacaConfig<TCollections[number]['slug']> {
  const result = OpacaConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid OpacaCMS Configuration: ${result.error.message}`);
  }
  return config;
}
