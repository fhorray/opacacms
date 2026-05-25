import type { z } from 'zod';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AccessContext {
  user: AdminUser | null;
  doc?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export type AccessRule =
  | 'public'
  | 'authenticated'
  | string[]
  | ((ctx: AccessContext) => boolean | Promise<boolean>);

export interface CollectionAccess {
  read?: AccessRule;
  create?: AccessRule;
  update?: AccessRule;
  delete?: AccessRule;
}

export interface FieldAccess {
  read?: AccessRule;
  update?: AccessRule;
}

export interface FieldMeta {
  fieldType:
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'number'
    | 'checkbox'
    | 'date'
    | 'richtext'
    | 'relation'
    | 'accordion'
    | 'group'
    | 'array'
    | 'row'
    | 'tabs'
    | 'sidebar'
    | 'blocks';
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  access?: FieldAccess;
  options?: (string | { label: string; value: string })[];
  collection?: string;
  hasMany?: boolean;
  localized?: boolean;
  style?: 'checkbox' | 'select';
  blocks?: any[];
  shape?: Record<string, z.ZodTypeAny>;
  tabsShape?: Record<string, Record<string, z.ZodTypeAny>>;
}

export interface BaseFieldOptions {
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  access?: FieldAccess;
  localized?: boolean;
}
