import { demoAccount, type DemoKind } from "@/lib/demo";
import { demoEnterPath, writeDemoKind } from "@/lib/demo-session";

export type { DemoKind };

export function demoCreds(kind: DemoKind) {
  return demoAccount(kind);
}

export function demoDest(kind: DemoKind) {
  return demoAccount(kind).dest;
}

/**
 * Open a sample door. Cookie + localStorage mark the demo role so the next
 * request can seed the clinic even on a cold serverless isolate (Vercel).
 * Returns a same-origin URL that sets the cookie from the server and 302s in.
 */
export async function enterDemo(kind: DemoKind) {
  writeDemoKind(kind);
  return demoEnterPath(kind);
}
