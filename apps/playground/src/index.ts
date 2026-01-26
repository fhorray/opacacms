import { serve } from "bun";
import index from "./index.html";
import { createNodeServer } from "opacacms/server";
import config from "./opacacms.config";

// Initialize OpacaCMS (Hono app)
const { app: opacaApp, start: startOpaca } = createNodeServer(config);

const server = serve({
  routes: {
    // Serve the bundled React app for all frontend routes
    "/": index,
    "/setup": index,
    "/login": index,
    "/dashboard": index,

    // API and Auth routes are handled by the OpacaCMS Hono app
    "/api/*": opacaApp.fetch,
  },

  // Fallback fetch if needed (e.g. for non-matching routes)
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api')) {
      return opacaApp.fetch(req);
    }
    // Return index.html for all other routes (SPA fallback)
    return new Response(index, {
      headers: { 'Content-Type': 'text/html' }
    });
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

// We still need to call connect/migrate since createNodeServer doesn't do it automatically until .start() is called
// But here we are using Bun.serve, so we'll manuallly start the DB part.
console.log("🚀 OpacaCMS (Bun Fullstack) starting...");
await config.db.connect();
await config.db.migrate(config.collections);
console.log("📦 Database connected & migrated");

console.log(`🚀 Server running at ${server.url}`);
