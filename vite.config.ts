import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// Keep `nitro` gated to `build` (the Vercel deploy target): enabled in dev it
// opens a second dev-server port, which breaks the single-port preview.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".

/** Copy PGLite wasm/data next to the bundled server chunk for Vercel. */
function copyPgliteServerAssetsPlugin(): Plugin {
  return {
    name: "copy-pglite-server-assets",
    apply: "build",
    async closeBundle() {
      const { cpSync, existsSync, readdirSync } = await import("node:fs");
      const { dirname, join } = await import("node:path");
      const { createRequire } = await import("node:module");
      const req = createRequire(join(process.cwd(), "package.json"));
      const dist = dirname(req.resolve("@electric-sql/pglite"));
      const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];
      const functionsRoot = join(process.cwd(), ".vercel/output/functions");
      if (!existsSync(functionsRoot)) {
        console.warn("[pglite-assets] closeBundle: no .vercel/output/functions yet");
        return;
      }

      const destDirs: string[] = [];
      const walk = (dir: string) => {
        for (const ent of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, ent.name);
          if (!ent.isDirectory()) continue;
          if (ent.name.endsWith(".func")) destDirs.push(p);
          if (ent.name === "_libs" || ent.name === "_chunks") destDirs.push(p);
          walk(p);
        }
      };
      walk(functionsRoot);

      let copied = 0;
      for (const destDir of destDirs) {
        for (const name of files) {
          const src = join(dist, name);
          if (!existsSync(src)) continue;
          cpSync(src, join(destDir, name));
          copied += 1;
        }
      }
      console.log(
        `[pglite-assets] closeBundle copied ${copied} files into ${destDirs.length} dir(s)`,
      );
    },
  };
}

/**
 * Inline PGLite's wasm/data into the *server* bundle as gzipped base64.
 * Passing those bytes to `new PGlite({ fsBundle, pgliteWasmModule, ... })`
 * skips the package's `fs.readFile("./pglite.data")` which 500s on Vercel.
 */
function pgliteInlineArtifactsPlugin(): Plugin {
  const VIRTUAL = "virtual:pglite-artifacts";
  const RESOLVED = "\0" + VIRTUAL;
  return {
    name: "pglite-inline-artifacts",
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
      return undefined;
    },
    async load(id) {
      if (id !== RESOLVED) return undefined;
      // Client environments never boot PGLite — keep the module tiny.
      const consumer =
        "environment" in this && this.environment
          ? (this.environment as { config?: { consumer?: string } }).config?.consumer
          : undefined;
      if (consumer === "client") {
        return `export function loadPgliteArtifactBytes() {
  throw new Error("virtual:pglite-artifacts is server-only");
}`;
      }

      const { readFileSync } = await import("node:fs");
      const { dirname, join } = await import("node:path");
      const { createRequire } = await import("node:module");
      const req = createRequire(join(process.cwd(), "package.json"));
      const dist = dirname(req.resolve("@electric-sql/pglite"));

      // Dev: read live files. Don't inflate HMR with 7MB of base64.
      if (this.meta.watchMode) {
        return `import { readFileSync } from "node:fs";
import { join } from "node:path";
const dist = ${JSON.stringify(dist)};
export function loadPgliteArtifactBytes() {
  return {
    data: readFileSync(join(dist, "pglite.data")),
    wasm: readFileSync(join(dist, "pglite.wasm")),
    initdb: readFileSync(join(dist, "initdb.wasm")),
  };
}
`;
      }

      const { gzipSync } = await import("node:zlib");
      const encode = (name: string) =>
        gzipSync(readFileSync(join(dist, name))).toString("base64");
      const data = encode("pglite.data");
      const wasm = encode("pglite.wasm");
      const initdb = encode("initdb.wasm");
      return `import { gunzipSync } from "node:zlib";
const data = gunzipSync(Buffer.from("${data}", "base64"));
const wasm = gunzipSync(Buffer.from("${wasm}", "base64"));
const initdb = gunzipSync(Buffer.from("${initdb}", "base64"));
export function loadPgliteArtifactBytes() {
  return { data, wasm, initdb };
}
`;
    },
  };
}

export default defineConfig(({ command }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  plugins: [
    pgliteBootstrapPlugin(),
    pgliteInlineArtifactsPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build"
      ? [
          // Runs closeBundle *after* nitro (plugin order is reversed for that
          // hook) so PGLite's wasm/data land next to the bundled server module.
          // Without this, Vercel looks for `/var/task/_libs/pglite.data` and 500s.
          copyPgliteServerAssetsPlugin(),
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
            vercel: {
              functions: {
                maxDuration: 60,
                memory: 1024,
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
