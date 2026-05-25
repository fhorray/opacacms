import { z } from 'zod';
import { registerField } from '../utils';

export interface BlockConfig {
  slug: string;
  schema: z.ZodObject<any>;
  label?: string;
}

/**
 * Creates a blocks field layout matrix allowing multiple reusable schema shapes.
 */
export function blocks(label: string, list: BlockConfig[]): z.ZodTypeAny {
  const schema = z.array(
    z.object({
      blockType: z.string(),
      blockData: z.record(z.string(), z.any()),
    })
  );

  return registerField(schema, {
    fieldType: 'blocks',
    label,
    blocks: list,
  } as any);
}
