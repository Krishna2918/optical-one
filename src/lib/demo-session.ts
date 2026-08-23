import { DEMO_ACCOUNTS, type DemoKind } from "@/lib/demo";

export const DEMO_COOKIE = "lumen-demo";

export function parseDemoKind(raw: string | null | undefined): DemoKind | null {
  const value = raw?.trim();
  if (value === "owner" || value === "staff" || value === "doctor" || value === "patient") {
    return value;
  }
  return null;
}

export function demoEnterPath(kind: DemoKind) {
  return `/api/demo?kind=${kind}`;
}

export function demoCookieLine(kind: DemoKind | null, secure: boolean) {
  const extra = secure ? "; Secure" : "";
  if (!kind) return `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${extra}`;
  return `${DEMO_COOKIE}=${kind}; Path=/; Max-Age=86400; SameSite=Lax${extra}`;
}

export function demoUserFromKind(kind: DemoKind) {
  const account = DEMO_ACCOUNTS.find((row) => row.kind === kind) ?? DEMO_ACCOUNTS[0];
  return {
    id: `demo-${kind}`,
    displayName: account.name,
    primaryEmail: account.email,
    profileImageUrl: null as string | null,
    isDevFallback: false,
  };
}

export function readDemoKindClient(): DemoKind | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )lumen-demo=([^;]*)/);
  const fromCookie = parseDemoKind(match?.[1] ? decodeURIComponent(match[1]) : null);
  if (fromCookie) return fromCookie;
  try {
    return parseDemoKind(window.localStorage.getItem(DEMO_COOKIE));
  } catch {
    return null;
  }
}

export function writeDemoKind(kind: DemoKind | null) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:";
  document.cookie = demoCookieLine(kind, secure);
  try {
    if (kind) window.localStorage.setItem(DEMO_COOKIE, kind);
    else window.localStorage.removeItem(DEMO_COOKIE);
  } catch {
    /* ignore */
  }
}
