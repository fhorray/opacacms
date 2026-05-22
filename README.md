# 🖤 OpacaCMS Monorepo

Welcome to the **OpacaCMS** monorepo! This repository contains the core CMS library and various example applications showcasing integrations with Hono, SQLite, Drizzle ORM, and Next.js. 🚀✨

---

## 📂 Repository Structure

- [**`package/`**](file:///c:/Users/francy.nobre/Desktop/dev/opacacms/package) — The core Headless CMS library, including:
  - 🎨 Modular Dark Admin UI (pure HTML & CSS module).
  - 💾 SQLite adapter leveraging Drizzle ORM.
  - 🔒 Session-based authentication (Oslo.js & Argon2id).
  - 🛡️ Granular Role-Based Access Control (RBAC).
- [**`examples/nextjs-cms/`**](file:///c:/Users/francy.nobre/Desktop/dev/opacacms/examples/nextjs-cms) — A Next.js App Router workspace demonstrating how to run Hono inside Next.js and serve the CMS panel.
- [**`examples/basic-bun/`**](file:///c:/Users/francy.nobre/Desktop/dev/opacacms/examples/basic-bun) — A standalone Bun server using Hono and direct SQLite adapters for simple deployments and testing.

---

## ⚡ Quick Start (Development)

To get everything running locally in development:

### 1. Install Dependencies
Make sure you have [Bun](https://bun.sh) installed. Then run:

```bash
bun install
```

### 2. Run the Development Servers
Kickstart all workspaces concurrently using Turborepo:

```bash
bun run dev
```

This will boot up:
- The Next.js integration example at **[http://localhost:3000/admin](http://localhost:3000/admin)**.
- Hot-reloading schemas and builds for the workspaces.

---

## 📦 How to Use the Library in a Project

If you are a developer looking to integrate **OpacaCMS** in your own app, check out the detailed library guide:

👉 [**OpacaCMS Library Integration Guide (package/README.md)**](file:///c:/Users/francy.nobre/Desktop/dev/opacacms/package/README.md)

Happy hacking! 🕶️🔥
