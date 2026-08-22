/**
 * Load PGLite's wasm + filesystem bundle ourselves.
 *
 * The published package does `new URL("./pglite.data", import.meta.url)` then
 * `fs.readFile`. Nitro bundles the JS into `_libs/` and leaves the binaries
 * behind — Vercel then 500s with ENOENT `/var/task/_libs/pglite.data`.
 *
 * Passing `fsBundle` / `pgliteWasmModule` / `initdbWasmModule` skips those
 * disk reads. Bytes come from node_modules (dev) or the inlined virtual
 * module (the production server bundle).
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { loadPgliteArtifactBytes } from "virtual:pglite-artifacts";

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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function loadPgliteBootOptions(): Promise<PgliteBootOptions | Record<string, never>> {
  const bytes = (await bytesFromDisk()) ?? loadPgliteArtifactBytes();
  if (!bytes?.data || !bytes.wasm || !bytes.initdb) {
    console.error("[pglite-boot] no wasm/data artifacts found on disk or in bundle");
    return {};
  }
  const data = toArrayBuffer(bytes.data);
  const [pgliteWasmModule, initdbWasmModule] = await Promise.all([
    WebAssembly.compile(toArrayBuffer(bytes.wasm)),
    WebAssembly.compile(toArrayBuffer(bytes.initdb)),
  ]);
  return {
    fsBundle: new Blob([data]),
    pgliteWasmModule,
    initdbWasmModule,
  };
}
