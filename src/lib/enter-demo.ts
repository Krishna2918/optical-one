import { authClient } from "@/lib/auth/client";
import { DEMO_PATIENT, DEMO_STAFF } from "@/lib/demo";
import { ensureDemoAccounts } from "@/lib/server/demo";

export type DemoKind = "staff" | "patient";

export function demoCreds(kind: DemoKind) {
  return kind === "staff" ? DEMO_STAFF : DEMO_PATIENT;
}

export function demoDest(kind: DemoKind) {
  return kind === "staff" ? "/app" : "/care";
}

/** Seed demo users if needed, then sign in. Returns the portal path. */
export async function enterDemo(kind: DemoKind) {
  const creds = demoCreds(kind);
  await ensureDemoAccounts();
  const { error } = await authClient.signIn.email({
    email: creds.email,
    password: creds.password,
  });
  if (error) throw new Error(error.message ?? "Could not open the demo");
  return demoDest(kind);
}
