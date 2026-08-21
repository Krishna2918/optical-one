import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type {
  Appointment,
  Doctor,
  EmailRow,
  FamilyLink,
  Insurance,
  Invite,
  JourneyEvent,
  Order,
  Patient,
  Profile,
  VisionRx,
} from "@/lib/types";
import { patientName } from "@/lib/types";
import type { JourneyStage, OrderStatus, Role } from "@/lib/constants";
import { buildDaySlots, clockIso, clockLabel, minutesFromIso, neighborLabels, shiftClinicDate } from "@/lib/slots";
import { requireWorkspace } from "./workspace";

function nid() {
  return crypto.randomUUID();
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function sendMail(
  clinicId: string,
  toEmail: string,
  toName: string,
  subject: string,
  body: string,
  kind: string,
  relatedType?: string,
  relatedId?: string,
) {
  if (!toEmail) return null;
  const sql = await getSql();
  const row = {
    id: nid(),
    clinic_id: clinicId,
    to_email: toEmail,
    to_name: toName,
    subject,
    body,
    kind,
    related_type: relatedType ?? null,
    related_id: relatedId ?? null,
  };
  await sql`
    insert into emails (id, clinic_id, to_email, to_name, subject, body, kind, related_type, related_id)
    values (
      ${row.id}, ${row.clinic_id}, ${row.to_email}, ${row.to_name}, ${row.subject},
      ${row.body}, ${row.kind}, ${row.related_type}, ${row.related_id}
    )
  `;
  return row;
}

export const listPatients = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((q: { query?: string; stage?: string } = {}) => q)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const q = (data.query ?? "").trim();
    const stage = data.stage ?? "";
    let rows = await sql<Patient>`
      select * from patients
      where clinic_id = ${clinic.id}
      order by last_name, first_name
    `;
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((p) => {
        const blob = [
          p.first_name,
          p.last_name,
          p.email,
          p.phone_cell,
          p.phone_home,
          String(p.patient_no),
          p.city,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }
    if (stage) rows = rows.filter((p) => p.journey_stage === stage);
    return rows;
  });

export const getPatient = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const patient = (
      await sql<Patient>`
        select * from patients where id = ${id} and clinic_id = ${clinic.id} limit 1
      `
    )[0];
    if (!patient) throw new Error("Patient not found");
    const family = await sql<FamilyLink>`
      select f.*, (r.first_name || ' ' || r.last_name) as related_name, r.patient_no as related_no
      from family_links f
      join patients r on r.id = f.related_patient_id
      where f.patient_id = ${id}
    `;
    const insurance = await sql<Insurance>`
      select * from insurance where patient_id = ${id} order by is_primary desc
    `;
    const rx = await sql<VisionRx>`
      select v.*, d.name as doctor_name
      from vision_rx v
      left join doctors d on d.id = v.doctor_id
      where v.patient_id = ${id}
      order by v.exam_date desc
    `;
    const appointments = await sql<Appointment>`
      select a.*, d.name as doctor_name, d.color as doctor_color
      from appointments a
      left join doctors d on d.id = a.doctor_id
      where a.patient_id = ${id}
      order by a.start_at desc
    `;
    const orders = await sql<Order>`
      select * from orders where patient_id = ${id} order by created_at desc
    `;
    const journey = await sql<JourneyEvent>`
      select * from journey_events where patient_id = ${id} order by created_at desc
    `;
    const people = await sql<Patient>`
      select * from patients
      where clinic_id = ${clinic.id} and id <> ${id}
      order by last_name, first_name
    `;
    return {
      patient,
      family,
      insurance: insurance.map((i) => ({ ...i, copay: num(i.copay) })),
      rx,
      appointments,
      orders: orders.map((o) => ({
        ...o,
        patient_total: num(o.patient_total),
        insurance_total: num(o.insurance_total),
      })),
      journey,
      people,
    };
  });

const patientInput = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  first_name: z.string().min(1),
  middle_name: z.string().optional(),
  last_name: z.string().min(1),
  suffix: z.string().optional(),
  sex: z.string().optional(),
  dob: z.string().optional(),
  email: z.string().optional(),
  phone_home: z.string().optional(),
  phone_cell: z.string().optional(),
  phone_work: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
  employer: z.string().optional(),
  occupation: z.string().optional(),
  marital: z.string().optional(),
  language: z.string().optional(),
  health_card: z.string().optional(),
  notes: z.string().optional(),
  phipa_consent: z.boolean().optional(),
  completeOnboarding: z.boolean().optional(),
});

export const savePatient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => patientInput.parse(v))
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const existing = data.id
      ? (
          await sql<Patient>`
            select * from patients where id = ${data.id} and clinic_id = ${clinic.id} limit 1
          `
        )[0]
      : undefined;

    const id = existing?.id ?? nid();
    const nextNo =
      existing?.patient_no ??
      ((
        await sql<{ n: number }>`
          select coalesce(max(patient_no), 1000)::int + 1 as n
          from patients where clinic_id = ${clinic.id}
        `
      )[0]?.n ?? 1001);

    const onboarded = Boolean(data.completeOnboarding || existing?.onboarded);
    const stage = onboarded
      ? existing?.journey_stage && existing.journey_stage !== "lead" && existing.journey_stage !== "onboarding"
        ? existing.journey_stage
        : "onboarded"
      : existing
        ? "onboarding"
        : "lead";

    if (existing) {
      await sql`
        update patients set
          title = ${data.title ?? ""},
          first_name = ${data.first_name},
          middle_name = ${data.middle_name ?? ""},
          last_name = ${data.last_name},
          suffix = ${data.suffix ?? ""},
          sex = ${data.sex ?? ""},
          dob = ${data.dob || null},
          email = ${data.email ?? ""},
          phone_home = ${data.phone_home ?? ""},
          phone_cell = ${data.phone_cell ?? ""},
          phone_work = ${data.phone_work ?? ""},
          address1 = ${data.address1 ?? ""},
          address2 = ${data.address2 ?? ""},
          city = ${data.city ?? ""},
          province = ${data.province ?? "ON"},
          postal = ${data.postal ?? ""},
          country = ${data.country ?? "Canada"},
          employer = ${data.employer ?? ""},
          occupation = ${data.occupation ?? ""},
          marital = ${data.marital ?? ""},
          language = ${data.language ?? "English"},
          health_card = ${data.health_card ?? ""},
          notes = ${data.notes ?? ""},
          phipa_consent = ${Boolean(data.phipa_consent)},
          onboarded = ${onboarded},
          journey_stage = ${stage}
        where id = ${id}
      `;
    } else {
      await sql`
        insert into patients (
          id, clinic_id, patient_no, title, first_name, middle_name, last_name, suffix,
          sex, dob, email, phone_home, phone_cell, phone_work, address1, address2,
          city, province, postal, country, employer, occupation, marital, language,
          health_card, notes, phipa_consent, onboarded, journey_stage
        ) values (
          ${id}, ${clinic.id}, ${nextNo}, ${data.title ?? ""}, ${data.first_name},
          ${data.middle_name ?? ""}, ${data.last_name}, ${data.suffix ?? ""},
          ${data.sex ?? ""}, ${data.dob || null}, ${data.email ?? ""},
          ${data.phone_home ?? ""}, ${data.phone_cell ?? ""}, ${data.phone_work ?? ""},
          ${data.address1 ?? ""}, ${data.address2 ?? ""}, ${data.city ?? ""},
          ${data.province ?? "ON"}, ${data.postal ?? ""}, ${data.country ?? "Canada"},
          ${data.employer ?? ""}, ${data.occupation ?? ""}, ${data.marital ?? ""},
          ${data.language ?? "English"}, ${data.health_card ?? ""}, ${data.notes ?? ""},
          ${Boolean(data.phipa_consent)}, ${onboarded}, ${stage}
        )
      `;
    }

    if (data.completeOnboarding && !existing?.onboarded) {
      await sql`
        insert into journey_events (id, patient_id, stage, note)
        values (${nid()}, ${id}, ${"onboarded"}, ${"Onboarding completed"})
      `;
      await sendMail(
        clinic.id,
        data.email ?? "",
        `${data.first_name} ${data.last_name}`,
        "Welcome to Optical One — your chart is ready",
        `Hi ${data.first_name},\n\nYour onboarding is complete. You can book visits, review orders, and add family from the patient portal.\n\n— Optical One`,
        "onboarding",
        "patient",
        id,
      );
    } else if (!existing) {
      await sql`
        insert into journey_events (id, patient_id, stage, note)
        values (${nid()}, ${id}, ${stage}, ${"Patient created"})
      `;
      if (data.email) {
        await sendMail(
          clinic.id,
          data.email,
          `${data.first_name} ${data.last_name}`,
          "Finish setting up your Optical One chart",
          `Hi ${data.first_name},\n\nA chart was opened for you. Sign in to the patient portal to finish onboarding — insurance, family, and health history.\n\n— Optical One`,
          "onboarding",
          "patient",
          id,
        );
      }
    }

    return { id, patient_no: nextNo };
  });

export const setJourney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { patientId: string; stage: string; note?: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const p = (
      await sql<Patient>`
        select * from patients where id = ${data.patientId} and clinic_id = ${clinic.id} limit 1
      `
    )[0];
    if (!p) throw new Error("Patient not found");
    await sql`update patients set journey_stage = ${data.stage} where id = ${p.id}`;
    await sql`
      insert into journey_events (id, patient_id, stage, note)
      values (${nid()}, ${p.id}, ${data.stage}, ${data.note ?? ""})
    `;
    return { ok: true };
  });

export const addFamily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    patientId: string;
    relatedPatientId: string;
    relationship: string;
    isGuarantor?: boolean;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    await sql`
      insert into family_links (id, clinic_id, patient_id, related_patient_id, relationship, is_guarantor)
      values (
        ${nid()}, ${clinic.id}, ${data.patientId}, ${data.relatedPatientId},
        ${data.relationship}, ${Boolean(data.isGuarantor)}
      )
    `;
    return { ok: true };
  });

export const saveInsurance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    patientId: string;
    carrier: string;
    plan_name?: string;
    member_id?: string;
    group_no?: string;
    copay?: number;
  }) => v)
  .handler(async ({ context, data }) => {
    await requireWorkspace(context.userId);
    const sql = await getSql();
    await sql`
      insert into insurance (id, patient_id, carrier, plan_name, member_id, group_no, copay, is_primary)
      values (
        ${nid()}, ${data.patientId}, ${data.carrier}, ${data.plan_name ?? ""},
        ${data.member_id ?? ""}, ${data.group_no ?? ""}, ${data.copay ?? 0}, ${true}
      )
    `;
    return { ok: true };
  });

export const saveRx = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    patientId: string;
    doctorId?: string;
    exam_date: string;
    od_sphere?: string;
    od_cyl?: string;
    od_axis?: string;
    od_add?: string;
    os_sphere?: string;
    os_cyl?: string;
    os_axis?: string;
    os_add?: string;
    pd?: string;
    notes?: string;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    await sql`
      insert into vision_rx (
        id, patient_id, doctor_id, exam_date,
        od_sphere, od_cyl, od_axis, od_add,
        os_sphere, os_cyl, os_axis, os_add, pd, notes
      ) values (
        ${nid()}, ${data.patientId}, ${data.doctorId ?? null}, ${data.exam_date},
        ${data.od_sphere ?? ""}, ${data.od_cyl ?? ""}, ${data.od_axis ?? ""}, ${data.od_add ?? ""},
        ${data.os_sphere ?? ""}, ${data.os_cyl ?? ""}, ${data.os_axis ?? ""}, ${data.os_add ?? ""},
        ${data.pd ?? ""}, ${data.notes ?? ""}
      )
    `;
    await sql`
      update patients set journey_stage = ${"rx_ready"}
      where id = ${data.patientId} and clinic_id = ${clinic.id}
        and journey_stage not in ('order_placed','at_lab','ready_to_call','notified','delivered','paid')
    `;
    await sql`
      insert into journey_events (id, patient_id, stage, note)
      values (${nid()}, ${data.patientId}, ${"rx_ready"}, ${"Prescription written"})
    `;
    return { ok: true };
  });

export const getSchedule = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((v: { date: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, doctors } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const dayStart = clockIso(data.date, 0);
    const dayEnd = clockIso(shiftClinicDate(data.date, 1), 0);
    const rows = await sql<Appointment>`
      select a.*, (p.first_name || ' ' || p.last_name) as patient_name,
             d.name as doctor_name, d.color as doctor_color
      from appointments a
      join patients p on p.id = a.patient_id
      join doctors d on d.id = a.doctor_id
      where a.clinic_id = ${clinic.id}
        and a.start_at >= ${dayStart}
        and a.start_at < ${dayEnd}
      order by a.start_at
    `;
    return { clinic, doctors: doctors.filter((d) => d.active), appointments: rows };
  });

export const previewSlots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((v: { date: string; doctorId: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, doctors } = await requireWorkspace(context.userId);
    const doctor = doctors.find((d) => d.id === data.doctorId);
    if (!doctor) throw new Error("Doctor not found");
    const sql = await getSql();
    const dayStart = clockIso(data.date, 0);
    const dayEnd = clockIso(shiftClinicDate(data.date, 1), 0);
    const rows = await sql<Appointment>`
      select a.*, (p.first_name || ' ' || p.last_name) as patient_name
      from appointments a
      join patients p on p.id = a.patient_id
      where a.clinic_id = ${clinic.id}
        and a.doctor_id = ${data.doctorId}
        and a.start_at >= ${dayStart}
        and a.start_at < ${dayEnd}
    `;
    const day = data.date;
    return buildDaySlots(doctor, day, rows).map((s) => ({
      iso: s.iso,
      label: s.label,
      state: s.state,
      appointment: s.appointment
        ? { id: s.appointment.id, patient_name: s.appointment.patient_name, service: s.appointment.service }
        : null,
    }));
  });

export const bookAppointment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    patientId: string;
    doctorId: string;
    startAt: string;
    duration?: number;
    service?: string;
    notes?: string;
    force?: boolean;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, doctors, profile } = await requireWorkspace(context.userId);
    const doctor = doctors.find((d) => d.id === data.doctorId);
    if (!doctor) throw new Error("Doctor not found");
    const sql = await getSql();

    const patient = (
      await sql<Patient>`
        select * from patients where id = ${data.patientId} and clinic_id = ${clinic.id} limit 1
      `
    )[0];
    if (!patient) throw new Error("Patient not found");

    const startIso = data.startAt;
    const dateStr = startIso.slice(0, 10);
    const dayStart = clockIso(dateStr, 0);
    const dayEnd = clockIso(shiftClinicDate(dateStr, 1), 0);
    const dayAppts = await sql<Appointment>`
      select * from appointments
      where clinic_id = ${clinic.id}
        and doctor_id = ${data.doctorId}
        and start_at >= ${dayStart}
        and start_at < ${dayEnd}
        and status <> 'canceled'
    `;

    if (!data.force) {
      const slots = buildDaySlots(doctor, dateStr, dayAppts);
      const hit = slots.find((s) => s.iso === startIso || s.iso.slice(0, 16) === startIso.slice(0, 16));
      if (!hit) throw new Error("Outside working hours");
      if (hit.state === "booked") throw new Error("That slot is already taken");
      if (hit.state === "locked") {
        throw new Error(
          "That hour is closed. Book next to an existing visit — a 2:00 booking opens 1:00 and 3:00.",
        );
      }
    }

    const id = nid();
    const duration = data.duration ?? doctor.slot_minutes;
    await sql`
      insert into appointments (id, clinic_id, patient_id, doctor_id, start_at, duration_min, status, service, notes)
      values (
        ${id}, ${clinic.id}, ${patient.id}, ${doctor.id}, ${startIso},
        ${duration}, ${"confirmed"}, ${data.service ?? "Comprehensive exam"}, ${data.notes ?? ""}
      )
    `;

    if (["lead", "onboarding", "onboarded"].includes(patient.journey_stage)) {
      await sql`update patients set journey_stage = ${"scheduled"} where id = ${patient.id}`;
      await sql`
        insert into journey_events (id, patient_id, stage, note)
        values (${nid()}, ${patient.id}, ${"scheduled"}, ${`Booked with ${doctor.name}`})
      `;
    }

    const mins = minutesFromIso(startIso);
    const when = `${dateStr} at ${clockLabel(mins)}`;
    const opened = neighborLabels(mins);

    await sendMail(
      clinic.id,
      patient.email,
      patientName(patient),
      `Visit confirmed — ${when}`,
      `Hi ${patient.first_name},\n\nYou're booked with ${doctor.name} on ${when} (${duration} minutes).\n\nBooking this hour opened neighboring times at ${opened} for the rest of the team.\n\n— ${clinic.name}`,
      "appointment",
      "appointment",
      id,
    );

    void profile;
    return { id, openedNeighbors: opened };
  });

export const updateAppointment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { id: string; status: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    await sql`
      update appointments set status = ${data.status}
      where id = ${data.id} and clinic_id = ${clinic.id}
    `;
    const appt = (
      await sql<Appointment>`select * from appointments where id = ${data.id} limit 1`
    )[0];
    if (appt && data.status === "checked_in") {
      await sql`update patients set journey_stage = ${"checked_in"} where id = ${appt.patient_id}`;
      await sql`
        insert into journey_events (id, patient_id, stage, note)
        values (${nid()}, ${appt.patient_id}, ${"checked_in"}, ${"Arrived"})
      `;
    }
    return { ok: true };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const rows = await sql<Order>`
      select o.*, (p.first_name || ' ' || p.last_name) as patient_name
      from orders o
      join patients p on p.id = o.patient_id
      where o.clinic_id = ${clinic.id}
      order by o.created_at desc
    `;
    return rows.map((o) => ({
      ...o,
      patient_total: num(o.patient_total),
      insurance_total: num(o.insurance_total),
    }));
  });

export const saveOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    id?: string;
    patientId: string;
    doctorId?: string;
    type?: string;
    status?: string;
    frame_name?: string;
    lens_type?: string;
    promised_date?: string;
    sold_by?: string;
    patient_total?: number;
    insurance_total?: number;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const id = data.id ?? nid();
    const status = (data.status ?? "open") as OrderStatus;
    if (data.id) {
      await sql`
        update orders set
          type = ${data.type ?? "Spectacle lens"},
          status = ${status},
          frame_name = ${data.frame_name ?? ""},
          lens_type = ${data.lens_type ?? ""},
          promised_date = ${data.promised_date || null},
          sold_by = ${data.sold_by ?? profile.display_name},
          patient_total = ${data.patient_total ?? 0},
          insurance_total = ${data.insurance_total ?? 0}
        where id = ${id} and clinic_id = ${clinic.id}
      `;
    } else {
      await sql`
        insert into orders (
          id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
          promised_date, sold_by, patient_total, insurance_total
        ) values (
          ${id}, ${clinic.id}, ${data.patientId}, ${data.doctorId ?? null},
          ${data.type ?? "Spectacle lens"}, ${status}, ${data.frame_name ?? ""},
          ${data.lens_type ?? ""}, ${data.promised_date || null},
          ${data.sold_by ?? profile.display_name}, ${data.patient_total ?? 0},
          ${data.insurance_total ?? 0}
        )
      `;
    }

    const map: Record<string, string> = {
      open: "order_placed",
      quote: "order_placed",
      at_lab: "at_lab",
      ready_to_call: "ready_to_call",
      notified: "notified",
      delivered: "delivered",
      paid: "paid",
    };
    const stage = map[status];
    if (stage) {
      await sql`update patients set journey_stage = ${stage} where id = ${data.patientId}`;
      await sql`
        insert into journey_events (id, patient_id, stage, note)
        values (${nid()}, ${data.patientId}, ${stage}, ${`Order ${status.replaceAll("_", " ")}`})
      `;
    }

    const patient = (
      await sql<Patient>`select * from patients where id = ${data.patientId} limit 1`
    )[0];
    if (patient?.email && ["ready_to_call", "notified", "delivered", "at_lab"].includes(status)) {
      const subjects: Record<string, string> = {
        at_lab: "Your order is at the lab",
        ready_to_call: "Your glasses are ready for pickup",
        notified: "Reminder — your order is waiting",
        delivered: "Thank you — your order was dispensed",
      };
      await sendMail(
        clinic.id,
        patient.email,
        patientName(patient),
        subjects[status] ?? "Order update",
        `Hi ${patient.first_name},\n\nYour ${data.type ?? "order"} (${data.frame_name || data.lens_type || "optical"}) is now “${status.replaceAll("_", " ")}”.\n\n— ${clinic.name}`,
        "order",
        "order",
        id,
      );
    }
    return { id };
  });

export const listEmails = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    return sql<EmailRow>`
      select * from emails where clinic_id = ${clinic.id} order by sent_at desc limit 80
    `;
  });

export const sendManualEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { to_email: string; to_name?: string; subject: string; body: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    await sendMail(
      clinic.id,
      data.to_email,
      data.to_name ?? "",
      data.subject,
      data.body,
      "manual",
    );
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    if (profile.role === "patient") throw new Error("Admin only");
    const sql = await getSql();
    const users = await sql<Profile>`
      select * from profiles where clinic_id = ${clinic.id} order by display_name
    `;
    const invites = await sql<Invite>`
      select * from invites where clinic_id = ${clinic.id} order by created_at desc
    `;
    const doctors = await sql<Doctor>`
      select * from doctors where clinic_id = ${clinic.id} order by name
    `;
    return { users, invites, doctors, clinic };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { email: string; role: Role; name?: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    if (profile.role === "patient") throw new Error("Admin only");
    const sql = await getSql();
    await sql`
      insert into invites (id, clinic_id, email, role, name)
      values (${nid()}, ${clinic.id}, ${data.email.toLowerCase()}, ${data.role}, ${data.name ?? ""})
    `;
    await sendMail(
      clinic.id,
      data.email,
      data.name ?? data.email,
      `You're invited to ${clinic.name} on Lumen`,
      `Hi${data.name ? ` ${data.name}` : ""},\n\n${profile.display_name} invited you as ${data.role}. Sign in with this email to join the practice.\n\n— Lumen`,
      "invite",
    );
    return { ok: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { userId: string; role: Role }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    if (profile.role === "patient") throw new Error("Admin only");
    const sql = await getSql();
    await sql`
      update profiles set role = ${data.role}
      where user_id = ${data.userId} and clinic_id = ${clinic.id}
    `;
    return { ok: true };
  });

export const saveDoctor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    id?: string;
    name: string;
    credentials?: string;
    color?: string;
    specialty?: string;
    work_start?: string;
    work_end?: string;
    slot_minutes?: number;
    active?: boolean;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    if (profile.role === "patient") throw new Error("Admin only");
    const sql = await getSql();
    const id = data.id ?? nid();
    if (data.id) {
      await sql`
        update doctors set
          name = ${data.name},
          credentials = ${data.credentials ?? "OD"},
          color = ${data.color ?? "doc-1"},
          specialty = ${data.specialty ?? "Optometry"},
          work_start = ${data.work_start ?? "09:00"},
          work_end = ${data.work_end ?? "17:00"},
          slot_minutes = ${data.slot_minutes ?? 20},
          active = ${data.active ?? true}
        where id = ${id} and clinic_id = ${clinic.id}
      `;
    } else {
      await sql`
        insert into doctors (id, clinic_id, name, credentials, color, specialty, work_start, work_end, slot_minutes)
        values (
          ${id}, ${clinic.id}, ${data.name}, ${data.credentials ?? "OD"}, ${data.color ?? "doc-1"},
          ${data.specialty ?? "Optometry"}, ${data.work_start ?? "09:00"}, ${data.work_end ?? "17:00"},
          ${data.slot_minutes ?? 20}
        )
      `;
    }
    return { id };
  });

export const updateClinic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: {
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    work_start?: string;
    work_end?: string;
    slot_minutes?: number;
  }) => v)
  .handler(async ({ context, data }) => {
    const { clinic, profile } = await requireWorkspace(context.userId);
    if (profile.role === "patient") throw new Error("Admin only");
    const sql = await getSql();
    await sql`
      update clinics set
        name = ${data.name ?? clinic.name},
        address = ${data.address ?? clinic.address},
        city = ${data.city ?? clinic.city},
        phone = ${data.phone ?? clinic.phone},
        email = ${data.email ?? clinic.email},
        work_start = ${data.work_start ?? clinic.work_start},
        work_end = ${data.work_end ?? clinic.work_end},
        slot_minutes = ${data.slot_minutes ?? clinic.slot_minutes}
      where id = ${clinic.id}
    `;
    return { ok: true };
  });

export const grantPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: { patientId: string }) => v)
  .handler(async ({ context, data }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    const p = (
      await sql<Patient>`
        select * from patients where id = ${data.patientId} and clinic_id = ${clinic.id} limit 1
      `
    )[0];
    if (!p?.email) throw new Error("Patient needs an email first");
    await sql`
      insert into invites (id, clinic_id, email, role, name)
      values (${nid()}, ${clinic.id}, ${p.email.toLowerCase()}, ${"patient"}, ${patientName(p)})
    `;
    await sendMail(
      clinic.id,
      p.email,
      patientName(p),
      "Your Optical One patient portal is ready",
      `Hi ${p.first_name},\n\nCreate an account with this email to open your chart, book visits, and follow orders.\n\n— ${clinic.name}`,
      "portal",
      "patient",
      p.id,
    );
    return { ok: true };
  });

export const myCare = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const ws = await requireWorkspace(context.userId);
    const sql = await getSql();
    let patient: Patient | undefined;
    if (ws.profile.patient_id) {
      patient = (
        await sql<Patient>`select * from patients where id = ${ws.profile.patient_id} limit 1`
      )[0];
    } else if (ws.profile.email) {
      patient = (
        await sql<Patient>`
          select * from patients
          where clinic_id = ${ws.clinic.id} and lower(email) = ${ws.profile.email.toLowerCase()}
          limit 1
        `
      )[0];
    }
    if (!patient && ["owner", "admin", "staff", "doctor"].includes(ws.profile.role)) {
      patient = (
        await sql<Patient>`
          select * from patients where clinic_id = ${ws.clinic.id} order by last_name limit 1
        `
      )[0];
    }
    if (!patient) return { workspace: ws, patient: null, appointments: [], orders: [], family: [], rx: [] };
    const appointments = await sql<Appointment>`
      select a.*, d.name as doctor_name, d.color as doctor_color
      from appointments a join doctors d on d.id = a.doctor_id
      where a.patient_id = ${patient.id}
      order by a.start_at desc
    `;
    const orders = await sql<Order>`
      select * from orders where patient_id = ${patient.id} order by created_at desc
    `;
    const family = await sql<FamilyLink>`
      select f.*, (r.first_name || ' ' || r.last_name) as related_name, r.patient_no as related_no
      from family_links f
      join patients r on r.id = f.related_patient_id
      where f.patient_id = ${patient.id}
    `;
    const rx = await sql<VisionRx>`
      select v.*, d.name as doctor_name
      from vision_rx v left join doctors d on d.id = v.doctor_id
      where v.patient_id = ${patient.id}
      order by v.exam_date desc
    `;
    return {
      workspace: ws,
      patient,
      appointments,
      orders: orders.map((o) => ({
        ...o,
        patient_total: num(o.patient_total),
        insurance_total: num(o.insurance_total),
      })),
      family,
      rx,
    };
  });

export const journeyBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { clinic } = await requireWorkspace(context.userId);
    const sql = await getSql();
    return sql<Patient>`
      select * from patients where clinic_id = ${clinic.id} order by last_name
    `;
  });
