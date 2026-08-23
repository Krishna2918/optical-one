/** Public sample logins. Real Better Auth users, seeded on first Enter demo. */
export const DEMO_PASSWORD = "demo1234";

export type DemoKind = "owner" | "staff" | "doctor" | "patient";

export type DemoAccount = {
  kind: DemoKind;
  name: string;
  email: string;
  password: string;
  roleLabel: string;
  dest: "/app" | "/care";
  blurb: string;
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    kind: "owner",
    name: "Reed Halley",
    email: "reed@opticalone.care",
    password: DEMO_PASSWORD,
    roleLabel: "Owner",
    dest: "/app",
    blurb: "Practice admin — floor, book, people, mail",
  },
  {
    kind: "staff",
    name: "Eden Rowe",
    email: "eden@opticalone.care",
    password: DEMO_PASSWORD,
    roleLabel: "Front desk",
    dest: "/app",
    blurb: "Staff floor — schedule, charts, onboarding",
  },
  {
    kind: "doctor",
    name: "Dr. Quinn Adler",
    email: "quinn@opticalone.care",
    password: DEMO_PASSWORD,
    roleLabel: "Doctor",
    dest: "/app",
    blurb: "Doctor lane — same book, own color",
  },
  {
    kind: "patient",
    name: "Lila Voss",
    email: "lila@opticalone.care",
    password: DEMO_PASSWORD,
    roleLabel: "Patient",
    dest: "/care",
    blurb: "Customer portal — chart, book, orders",
  },
] as const;

export const DEMO_STAFF = DEMO_ACCOUNTS[0];
export const DEMO_PATIENT = DEMO_ACCOUNTS[3];

export function demoAccount(kind: DemoKind) {
  return DEMO_ACCOUNTS.find((a) => a.kind === kind) ?? DEMO_STAFF;
}

export function destForEmail(email: string) {
  const hit = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  return hit?.dest ?? "/app";
}
