import { getMigrations } from "better-auth/db";
import type { Auth } from "../auth";

export async function runAuthMigrations(auth: Auth) {
  try {
    const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);

    if (toBeCreated.length > 0 || toBeAdded.length > 0) {
      console.log("[Auth] Running migrations...");
      if (toBeCreated.length > 0) {
        console.log("[Auth] Creating tables:", toBeCreated.map(t => t.table).join(", "));
      }
      if (toBeAdded.length > 0) {
        console.log("[Auth] Adding columns:", toBeAdded.map(c => `${c.table}.${c.column}`).join(", "));
      }

      await runMigrations();
      console.log("[Auth] Migrations completed.");
    }
  } catch (error) {
    console.error("[Auth] Migration failed:", error);
    // Depending on strictness, might want to throw here
  }
}
