import { authClient, getBearerToken, rememberBearerToken, signInWithEmail } from "@/lib/auth/client";
import { demoAccount, type DemoKind } from "@/lib/demo";
import { ensureDemoAccounts } from "@/lib/server/demo";

export type { DemoKind };

export function demoCreds(kind: DemoKind) {
  return demoAccount(kind);
}

export function demoDest(kind: DemoKind) {
  return demoAccount(kind).dest;
}

/** Seed demo users if needed, then sign in. Returns the portal path. */
export async function enterDemo(kind: DemoKind) {
  const creds = demoAccount(kind);
  await ensureDemoAccounts();
  if (getBearerToken()) {
    try {
      await authClient.signOut();
    } catch {
      /* switch account even if the prior session is already gone */
    }
    rememberBearerToken(null);
  }
  await signInWithEmail(creds.email, creds.password);
  return creds.dest;
}
