/**
 * Load PGLite's wasm + filesystem bundle ourselves.
 *
 * The published package does `new URL("./pglite.data", import.meta.url)` then
 * `fs.readFile`. Nitro bundles the JS into `_libs/` and leaves the binaries
 * behind — Vercel then 500s with ENOENT `/var/task/_libs/pglite.data`.
 *
 * Passing `fsBundle` / `pgliteWasmModule` / `initdbWasmModule` skips those
 * disk reads. Bytes come from node_modules / function files (fast) or, only
 * if those are missing, the inlined virtual module (slow — 7MB of JS).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type PgliteBootOptions = {
  fsBundle: Blob;
  pgliteWasmModule: WebAssembly.Module;
  initdbWasmModule: WebAssembly.Module;
};

type ArtifactBytes = {
  data: Uint8Array;
  wasm: Uint8Array;
  initdb: Uint8Array;
};

const FILES = {
  data: "pglite.data",
  wasm: "pglite.wasm",
  initdb: "initdb.wasm",
} as const;

function candidateDirs(): string[] {
  const dirs: string[] = [];
  try {
    dirs.push(dirname(createRequire(import.meta.url).resolve("@electric-sql/pglite")));
  } catch {
    // Bundled server has no node_modules copy of the package.
  }
  const cwd = typeof process !== "undefined" ? process.cwd() : "";
  if (cwd) {
    dirs.push(
      join(cwd, "node_modules/@electric-sql/pglite/dist"),
      join(cwd, "_libs"),
      cwd,
    );
  }
  dirs.push("/var/task/_libs", "/var/task");
  return dirs;
}

async function bytesFromDisk(): Promise<ArtifactBytes | null> {
  for (const dir of candidateDirs()) {
    const dataPath = join(dir, FILES.data);
    const wasmPath = join(dir, FILES.wasm);
    const initdbPath = join(dir, FILES.initdb);
    if (!existsSync(dataPath) || !existsSync(wasmPath) || !existsSync(initdbPath)) {
      continue;
    }
    const [data, wasm, initdb] = await Promise.all([
      readFile(dataPath),
      readFile(wasmPath),
      readFile(initdbPath),
    ]);
    return { data, wasm, initdb };
  }
  return null;
}

async function bytesFromInline(): Promise<ArtifactBytes | null> {
  try {
    const mod = await import("virtual:pglite-artifacts");
    return mod.loadPgliteArtifactBytes();
  } catch (err) {
    console.error("[pglite-boot] inline artifacts failed:", err);
    return null;
  }
}

export async function loadPgliteBootOptions(): Promise<PgliteBootOptions | Record<string, never>> {
  const bytes = (await bytesFromDisk()) ?? (await bytesFromInline());
  if (!bytes?.data || !bytes.wasm || !bytes.initdb) {
    console.error("[pglite-boot] no wasm/data artifacts found on disk or in bundle");
    return {};
  }
  const [pgliteWasmModule, initdbWasmModule] = await Promise.all([
    WebAssembly.compile(bytes.wasm as unknown as BufferSource),
    WebAssembly.compile(bytes.initdb as unknown as BufferSource),
  ]);
  return {
    fsBundle: new Blob([bytes.data as unknown as BlobPart]),
    pgliteWasmModule,
    initdbWasmModule,
  };
}
