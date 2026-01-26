import type { OpacaConfig } from './types';
import { OpacaConfigSchema } from './validation';

/**
 * Helper to define the OpacaCMS configuration with full type safety.
 */
export function defineConfig(config: OpacaConfig): OpacaConfig {
  const result = OpacaConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid OpacaCMS Configuration: ${result.error.message}`);
  }
  return config;
}
