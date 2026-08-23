import { createServerFn } from "@tanstack/react-start";
import { DEMO_COOKIE, parseDemoKind } from "@/lib/demo-session";

/** Create every sample login (idempotent) and seed Optical One. */
export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { seedDemoCast } = await import("./demo-cast");
  return seedDemoCast();
});

/** Read the demo-role cookie from the incoming request (SSR-safe). */
export const peekDemoKind = createServerFn({ method: "GET" }).handler(async () => {
  const { getCookie } = await import("@tanstack/react-start/server");
  try {
    return parseDemoKind(getCookie(DEMO_COOKIE));
  } catch {
    return null;
  }
});
