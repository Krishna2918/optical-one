import { getSql } from "@/lib/db";
import { DEMO_ACCOUNTS, type DemoKind, demoAccount } from "@/lib/demo";
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

export async function seedDemoCast() {
  const sql = await getSql();
  let clinicId: string | null = null;

  for (const account of DEMO_ACCOUNTS) {
    const userId = await ensureUser(account.email, account.password, account.name);
    if (!userId) continue;
    const ws = await requireWorkspace(userId);
    clinicId = ws.clinic.id;

    if (account.kind === "owner") {
      await sql`
        update profiles
        set role = 'owner', display_name = ${account.name}, doctor_id = null, patient_id = null
        where user_id = ${userId}
      `;
      continue;
    }

    if (account.kind === "staff") {
      await sql`
        update profiles
        set role = 'staff', display_name = ${account.name}, doctor_id = null, patient_id = null
        where user_id = ${userId}
      `;
      continue;
    }

    if (account.kind === "doctor") {
      const doc = (
        await sql<{ id: string }>`
          select id from doctors
          where clinic_id = ${ws.clinic.id} and color = ${"doc-1"}
          limit 1
        `
      )[0];
      await sql`
        update profiles
        set role = 'doctor', display_name = ${account.name},
            doctor_id = ${doc?.id ?? null}, patient_id = null
        where user_id = ${userId}
      `;
      if (doc) {
        await sql`update doctors set user_id = ${userId} where id = ${doc.id}`;
      }
      continue;
    }

    await sql`
      update profiles
      set role = 'patient', display_name = ${account.name}
      where user_id = ${userId}
    `;
  }

  if (clinicId) await refreshDemoSchedule(sql, clinicId);
  return { ok: true as const };
}

export async function userIdForDemoKind(kind: DemoKind) {
  const sql = await getSql();
  const account = demoAccount(kind);
  const existing = (
    await sql<{ id: string }>`select id from "user" where email = ${account.email} limit 1`
  )[0];
  if (existing) return existing.id;
  await seedDemoCast();
  const row = (
    await sql<{ id: string }>`select id from "user" where email = ${account.email} limit 1`
  )[0];
  if (!row) throw new Error("Demo user missing");
  return row.id;
}
