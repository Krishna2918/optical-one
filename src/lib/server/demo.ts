import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { DEMO_PATIENT, DEMO_STAFF } from "@/lib/demo";
import { requireWorkspace } from "./workspace";
import { refreshDemoSchedule } from "./seed";

async function ensureUser(email: string, password: string, name: string) {
  const sql = await getSql();
  const existing = (
    await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`
  )[0];
  if (existing) return existing.id;

  const { auth } = await import("@/lib/auth/server");
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });
    return result.user.id;
  } catch {
    const again = (
      await sql<{ id: string }>`select id from "user" where email = ${email} limit 1`
    )[0];
    return again?.id ?? null;
  }
}

/** Create the staff + patient demo accounts (idempotent) and seed Optical One. */
export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(
  async () => {
    const staffId = await ensureUser(
      DEMO_STAFF.email,
      DEMO_STAFF.password,
      DEMO_STAFF.name,
    );
    if (staffId) {
      const ws = await requireWorkspace(staffId);
      const sql = await getSql();
      await refreshDemoSchedule(sql, ws.clinic.id);
    }

    const patientId = await ensureUser(
      DEMO_PATIENT.email,
      DEMO_PATIENT.password,
      DEMO_PATIENT.name,
    );
    if (patientId) await requireWorkspace(patientId);

    return { ok: true as const };
  },
);
