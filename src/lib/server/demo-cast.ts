import { getSql } from "@/lib/db";
import { DEMO_ACCOUNTS, type DemoKind, demoAccount } from "@/lib/demo";
import { requireWorkspace } from "./workspace";
import { refreshDemoSchedule } from "./seed";

/** Insert a demo person directly — no Better Auth round-trip (too slow on cold Vercel). */
async function ensureUser(kind: DemoKind) {
  const sql = await getSql();
  const account = demoAccount(kind);
  const existing = (
    await sql<{ id: string }>`select id from "user" where email = ${account.email} limit 1`
  )[0];
  if (existing) return existing.id;

  const userId = `demo-${kind}`;
  await sql`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${userId}, ${account.name}, ${account.email}, ${true}, now(), now())
    on conflict (email) do nothing
  `;
  const row = (
    await sql<{ id: string }>`select id from "user" where email = ${account.email} limit 1`
  )[0];
  if (!row) throw new Error("Demo user missing");
  return row.id;
}

export async function seedDemoCast() {
  const sql = await getSql();
  const ownerId = await ensureUser("owner");
  const ws = await requireWorkspace(ownerId);
  const clinicId = ws.clinic.id;

  for (const account of DEMO_ACCOUNTS) {
    const userId = await ensureUser(account.kind);
    if (account.kind === "owner") {
      await sql`
        update profiles
        set role = 'owner', display_name = ${account.name}, doctor_id = null, patient_id = null
        where user_id = ${userId}
      `;
      continue;
    }
    if (account.kind === "staff") {
      await requireWorkspace(userId);
      await sql`
        update profiles
        set role = 'staff', display_name = ${account.name}, doctor_id = null, patient_id = null
        where user_id = ${userId}
      `;
      continue;
    }
    if (account.kind === "doctor") {
      await requireWorkspace(userId);
      const doc = (
        await sql<{ id: string }>`
          select id from doctors
          where clinic_id = ${clinicId} and color = ${"doc-1"}
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
    await requireWorkspace(userId);
    await sql`
      update profiles
      set role = 'patient', display_name = ${account.name}
      where user_id = ${userId}
    `;
  }

  await refreshDemoSchedule(sql, clinicId);
  return { ok: true as const };
}

export async function userIdForDemoKind(kind: DemoKind) {
  return ensureUser(kind);
}

/** Boot Postgres + owner clinic so Enter demo is already warm. */
export async function warmOwnerFloor() {
  const ownerId = await ensureUser("owner");
  await requireWorkspace(ownerId);
  return { ok: true as const };
}
