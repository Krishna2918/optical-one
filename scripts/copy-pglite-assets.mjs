#!/usr/bin/env node
/**
 * PGLite's Node loader does `new URL("./pglite.data", import.meta.url)` then
 * `fs.readFile`. Nitro bundles the module to `.vercel/output/functions/__server.func/_libs/`
 * but leaves the wasm/data as static assets — Vercel then 500s with
 * ENOENT `/var/task/_libs/pglite.data`. Copy the files next to the bundled module
 * AND to the function root. The real fix is inlining via virtual:pglite-artifacts
 * and passing fsBundle; this copy is belt-and-suspenders.
 */
import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(root, "package.json"));
const dist = dirname(req.resolve("@electric-sql/pglite"));
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];
const functionsRoot = join(root, ".vercel/output/functions");

if (!existsSync(functionsRoot)) {
  console.log("[pglite-assets] no .vercel/output/functions — skip");
  process.exit(0);
}

for (const name of files) {
  const src = join(dist, name);
  if (!existsSync(src)) {
    throw new Error(`[pglite-assets] missing ${src}`);
  }
}

/** @type {string[]} */
const dests = [];
const walk = (dir) => {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const p = join(dir, ent.name);
    if (ent.name.endsWith(".func") || ent.name === "_libs" || ent.name === "_chunks") {
      dests.push(p);
    }
    walk(p);
  }
};
walk(functionsRoot);

if (dests.length === 0) {
  throw new Error(
    "[pglite-assets] no function dirs under .vercel/output/functions — PGLite would 500 on Vercel",
  );
}

let copied = 0;
for (const destDir of dests) {
  for (const name of files) {
    const src = join(dist, name);
    const dest = join(destDir, name);
    cpSync(src, dest);
    copied += 1;
    console.log(`[pglite-assets] ${name} -> ${dest}`);
  }
}
console.log(`[pglite-assets] copied ${copied} files into ${dests.length} dir(s)`);
