import { handle } from 'hono/vercel';
import { OpacaCMS, SQLiteDrizzleAdapter } from 'opacacms';
import { z } from 'opacacms/fields';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Initialize SQLite database
const dbFile = 'nextjs_cms.db';
const sqliteDb = new Database(dbFile);
const db = drizzle(sqliteDb);

// Define posts collection fields shape with localization support
const postsShape = {
  title: z.text({ label: 'Title', required: true, localized: true }),
  content: z.richtext({ label: 'Content' }).optional(),
  featured: z.checkbox({ label: 'Featured', defaultValue: false }),
};

const app = await new OpacaCMS({
  db: new SQLiteDrizzleAdapter(db, { sqliteDb }),
  localization: {
    locales: ['en', 'pt-BR', 'es'],
    defaultLocale: 'en',
    fallback: true,
  },
  collections: [
    {
      slug: 'posts',
      schema: z.object(postsShape),
      icon: "BookOpenIcon",
      label: "Posts",
      hooks: {
        beforeChange: [
          async ({ data, operation }) => {
            console.log(`[Hooks] Local API or REST hook triggered on ${operation}`);
            return data;
          }
        ]
      },
      access: {
        read: 'public',
        create: 'authenticated',
        update: 'authenticated',
        delete: ['admin'],
      },
    },
    {
      slug: 'properties',
      icon: "HomeIcon",
      label: "Properties",
      schema: z.object({
        address: z.text({ label: 'Address', required: true }),
        city: z.text({ label: 'City', required: true }),
        state: z.text({ label: 'State', required: true }),
        zip: z.text({ label: 'Zip', required: true }),
        price: z.number({ label: 'Price', required: true }),
        bedrooms: z.number({ label: 'Bedrooms', required: true }),
        bathrooms: z.number({ label: 'Bathrooms', required: true }),
        description: z.textarea({ label: 'Description', required: true }),
      }),
      access: {
        read: 'public',
        create: 'authenticated',
        update: 'authenticated',
        delete: ['admin'],
      }
    },
    {
      slug: 'debug_all_fields',
      icon: "BugIcon",
      label: "Debug All Fields",
      schema: z.object({
        // Standard Fields
        title: z.text({ label: 'Text Field (Title)', required: true }),
        longText: z.textarea({ label: 'Textarea Field' }).optional(),
        count: z.number({ label: 'Number Field', defaultValue: 10 }).optional(),
        isVerified: z.checkbox({ label: 'Checkbox Field', defaultValue: true }),
        status: z.select({
          label: 'Select Field',
          options: ['draft', 'published', 'archived'],
          defaultValue: 'draft',
        }),
        tags: z.multiselect({
          label: 'Multiselect Field',
          options: ['react', 'nextjs', 'hono', 'typescript'],
          style: "select"
        }).optional(),
        publishedDate: z.date({ label: 'Date Field' }).optional(),
        body: z.richtext({ label: 'Richtext (TipTap) Field' }).optional(),

        // Multi-relation support (hasMany)
        relatedPosts: z.relation({
          label: 'Linked Posts (hasMany)',
          collection: 'posts',
          hasMany: true,
          required: false,
        }),

        // Blocks Pattern matrix layout
        matrixLayout: z.blocks('Layout Blocks Matrix', [
          { slug: 'hero', schema: z.object({ title: z.string() }) },
        ]).optional(),

        // Visual Customization UI Field
        printAction: z.ui({
          label: 'Custom Actions Button',
          component: 'src/admin/components/PrintButton.tsx',
        }),

        // Visual containers / Layout rows
        layoutRow: z.row('Row Container (Horizontal Layout)', {
          rowFieldA: z.text({ label: 'Row Field A' }),
          rowFieldB: z.number({ label: 'Row Field B', defaultValue: 42 }).optional(),
        }),

        // Tabs container
        layoutTabs: z.tabs('Tabs Container', {
          generalTab: {
            tabFieldA: z.text({ label: 'Tab Field A (General)' }),
            tabFieldB: z.checkbox({ label: 'Tab Field B (General)', defaultValue: false }),
          },
          advancedTab: {
            tabFieldC: z.textarea({ label: 'Tab Field C (Advanced)' }).optional(),
          },
        }),

        // Accordion visual container
        layoutAccordion: z.accordion('Accordion Container', {
          accFieldA: z.text({ label: 'Accordion Field A' }),
          accFieldB: z.number({ label: 'Accordion Field B', defaultValue: 1 }).optional(),
        }),

        // Group container
        layoutGroup: z.group('Group Container', {
          groupFieldA: z.text({ label: 'Group Field A' }),
          groupFieldB: z.checkbox({ label: 'Group Field B', defaultValue: true }),
        }),

        // Array (repeatable rows)
        skillsArray: z.array('Repeatable Array Fields', {
          skillName: z.text({ label: 'Skill Name' }),
          level: z.select({
            label: 'Level',
            options: ['beginner', 'intermediate', 'advanced'],
          }),
        }),

        // Sidebar container
        settingsSidebar: z.sidebar('Sidebar Panel Settings', {
          sidebarFeatured: z.checkbox({ label: 'Sidebar Featured checkbox', defaultValue: false }),
          sidebarMetaDesc: z.textarea({ label: 'Sidebar Meta Description' }).optional(),
        }),
      }),
      access: {
        read: 'public',
        create: 'authenticated',
        update: 'authenticated',
        delete: ['admin'],
      },
    },
  ],
  globals: [
    {
      slug: 'site-settings',
      label: 'Site Settings',
      schema: z.object({
        siteName: z.text({ label: 'Site Name', required: true }),
        maintenanceMode: z.checkbox({ label: 'Maintenance Mode', defaultValue: false }),
      })
    }
  ],
}).init();

// Export Next.js App Router handlers
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);

