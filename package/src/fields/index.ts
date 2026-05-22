import { z as zod } from 'zod';
import { text, textarea } from './defs/text';
import { number } from './defs/number';
import { checkbox } from './defs/checkbox';
import { select, multiselect } from './defs/select';
import { date } from './defs/date';
import { richtext } from './defs/richtext';
import { relation } from './defs/relation';
import { accordion, group, array, row, tabs, sidebar } from './defs/containers';
import { getFieldMeta, registerField, opacaRegistry } from './utils';

// Combine standard Zod with custom Opaca field creators at runtime
export const z = {
  ...zod,
  text,
  textarea,
  number,
  checkbox,
  select,
  multiselect,
  date,
  richtext,
  relation,
  accordion,
  group,
  array,
  row,
  tabs,
  sidebar,
};

// Merge type-level exports from Zod into our custom 'z' namespace
export namespace z {
  export type infer<T extends zod.ZodTypeAny> = zod.infer<T>;
  export type ZodTypeAny = zod.ZodTypeAny;
  export type ZodRawShape = zod.ZodRawShape;
}

export { getFieldMeta, registerField, opacaRegistry };
export * from './types';
export * from './defs/text';
export * from './defs/number';
export * from './defs/checkbox';
export * from './defs/select';
export * from './defs/date';
export * from './defs/richtext';
export * from './defs/relation';
export * from './defs/containers';
