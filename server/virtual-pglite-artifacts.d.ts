declare module "virtual:pglite-artifacts" {
  export function loadPgliteArtifactBytes(): {
    data: Uint8Array;
    wasm: Uint8Array;
    initdb: Uint8Array;
  };
}
