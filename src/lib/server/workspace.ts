import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type {
  Appointment,
  Clinic,
  DashboardStats,
  Doctor,
  EmailRow,
  FamilyLink,
  Insurance,
  Invite,
  Patient,
  Profile,
  VisionRx,
  Order,
  JourneyEvent,
} from "@/lib/types";
import { patientName } from "@/lib/types";
import type { JourneyStage, OrderStatus, Role } from "@/lib/constants";
import { clinicYmd, clockIso, shiftClinicDate } from "@/lib/slots";
import { seedPractice } from "./seed";

export type Workspace = {
  profile: Profile;
  clinic: Clinic;
  doctors: Doctor[];
};

export async function requireWorkspace(userId: string): Promise<Workspace> {
  const sql = await getSql();
  let profile = (
    await sql<Profile>`select * from profiles where user_id = ${userId} limit 1`
  )[0];

  if (!profile) {
    const authUser = (
      await sql<{ email: string; name: string }>`
        select email, name from "user" where id = ${userId} limit 1
      `
    )[0];
    const email = (authUser?.email ?? "").toLowerCase();
    const display =
      authUser?.name || email.split("@")[0]?.replace(/[._]/g, " ") || "Practice owner";

    const invite = email
      ? (
          await sql<Invite>`
            select * from invites
            where lower(email) = ${email}
            order by created_at desc
            limit 1
          `
        )[0]
      : undefined;

    const patientMatch = email
      ? (
          await sql<Patient>`
            select * from patients
            where lower(email) = ${email}
            limit 1
          `
        )[0]
      : undefined;

    const existingClinic = (await sql<Clinic>`select * from clinics limit 1`)[0];

    let clinicId: string;
    let role: Role = "staff";
    let patientId: string | null = null;
    let doctorId: string | null = null;
    let name = display;

    if (invite) {
      clinicId = invite.clinic_id;
      role = invite.role;
      name = invite.name || display;
      await sql`delete from invites where id = ${invite.id}`;
    } else if (patientMatch) {
      clinicId = patientMatch.clinic_id;
      role = "patient";
      patientId = patientMatch.id;
      name = patientName(patientMatch);
      await sql`update patients set user_id = ${userId} where id = ${patientMatch.id}`;
    } else if (!existingClinic) {
      clinicId = crypto.randomUUID();
      role = "owner";
      await sql`
        insert into clinics (id, name, address, city, province, postal, phone, email)
        values (
          ${clinicId},
          ${"Optical One"},
          ${"35 Trailwood Drive"},
          ${"Mississauga"},
          ${"ON"},
          ${"L4Z 3K6"},
          ${"(905) 555-0140"},
          ${"hello@opticalone.care"}
        )
      `;
      await seedPractice(sql, clinicId);
    } else {
      clinicId = existingClinic.id;
      role = "staff";
    }

    if (role === "doctor") {
      const doc = (
        await sql<Doctor>`
          select * from doctors
          where clinic_id = ${clinicId} and (user_id = ${userId} or lower(name) = ${name.toLowerCase()})
          limit 1
        `
      )[0];
      if (doc) {
        doctorId = doc.id;
        await sql`update doctors set user_id = ${userId} where id = ${doc.id}`;
      }
    }

    await sql`
      insert into profiles (user_id, clinic_id, role, display_name, email, patient_id, doctor_id)
      values (
        ${userId},
        ${clinicId},
        ${role},
        ${name},
        ${email},
        ${patientId},
        ${doctorId}
      )
    `;
    profile = (
      await sql<Profile>`select * from profiles where user_id = ${userId} limit 1`
    )[0];
  }

  const clinic = (
    await sql<Clinic>`select * from clinics where id = ${profile.clinic_id} limit 1`
  )[0];
  const doctors = await sql<Doctor>`
    select * from doctors
    where clinic_id = ${profile.clinic_id}
    order by name
  `;
  return { profile, clinic, doctors };
}

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => requireWorkspace(context.userId));

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const today = clinicYmd();
    const tomorrow = shiftClinicDate(today, 1);
    const dayStart = clockIso(today, 0);
    const dayEnd = clockIso(tomorrow, 0);
    const patients = (
      await sql<{ n: number }>`select count(*)::int as n from patients where clinic_id = ${clinic.id}`
    )[0]?.n ?? 0;
    const appointmentsToday = (
      await sql<{ n: number }>`
        select count(*)::int as n from appointments
        where clinic_id = ${clinic.id}
          and start_at >= ${dayStart}
          and start_at < ${dayEnd}
          and status <> 'canceled'
      `
    )[0]?.n ?? 0;
    const openOrders = (
      await sql<{ n: number }>`
        select count(*)::int as n from orders
        where clinic_id = ${clinic.id}
          and status not in ('paid','canceled','delivered')
      `
    )[0]?.n ?? 0;
    const readyToCall = (
      await sql<{ n: number }>`
        select count(*)::int as n from orders
        where clinic_id = ${clinic.id} and status = 'ready_to_call'
      `
    )[0]?.n ?? 0;
    const emailsToday = (
      await sql<{ n: number }>`
        select count(*)::int as n from emails
        where clinic_id = ${clinic.id} and substring(cast(sent_at as text), 1, 10) = ${today}
      `
    )[0]?.n ?? 0;
    const onboarding = (
      await sql<{ n: number }>`
        select count(*)::int as n from patients
        where clinic_id = ${clinic.id} and onboarded = false
      `
    )[0]?.n ?? 0;
    const stats: DashboardStats = {
      patients,
      appointmentsToday,
      openOrders,
      readyToCall,
      emailsToday,
      onboarding,
    };
    const upcoming = await sql<Appointment>`
      select a.*, (p.first_name || ' ' || p.last_name) as patient_name,
             d.name as doctor_name, d.color as doctor_color
      from appointments a
      join patients p on p.id = a.patient_id
      join doctors d on d.id = a.doctor_id
      where a.clinic_id = ${clinic.id}
        and a.start_at >= now()
        and a.status <> 'canceled'
      order by a.start_at
      limit 6
    `;
    const recentMail = await sql<EmailRow>`
      select * from emails
      where clinic_id = ${clinic.id}
      order by sent_at desc
      limit 5
    `;
    const pipeline = await sql<{ stage: string; n: number }>`
      select journey_stage as stage, count(*)::int as n
      from patients where clinic_id = ${clinic.id}
      group by journey_stage
    `;
    return { stats, upcoming, recentMail, pipeline };
  });
