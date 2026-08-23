import type { Sql } from "@/lib/db";
import { DEMO_STAFF } from "@/lib/demo";
import { clockIso, clinicYmd, shiftClinicDate } from "@/lib/slots";

function id() {
  return crypto.randomUUID();
}

const DEMO_DOCTORS = [
  { color: "doc-1", name: "Dr. Quinn Adler", cred: "OD", spec: "Primary care" },
  { color: "doc-3", name: "Dr. Mina Calder", cred: "OD", spec: "Contact lenses" },
  { color: "doc-2", name: "Dr. Theo Maren", cred: "OD", spec: "Pediatrics" },
  { color: "doc-4", name: "Dr. Jules Aoki", cred: "OD", spec: "Ocular disease" },
] as const;

const DEMO_CHARTS = [
  {
    no: 4966,
    title: "Ms.",
    first: "Lila",
    last: "Voss",
    sex: "F",
    dob: "1974-01-02",
    email: "lila@opticalone.care",
    cell: "(416) 555-0188",
    city: "Toronto",
    addr: "1098 Meredith Ave",
    postal: "M4B 1B3",
    stage: "scheduled",
    onboarded: true,
  },
  {
    no: 13672,
    title: "",
    first: "Nico",
    last: "Pell",
    sex: "F",
    dob: "1988-04-14",
    email: "jasneet.brar@example.com",
    cell: "(647) 555-0138",
    city: "Brampton",
    addr: "55 Geranium Cres",
    postal: "L6S 0A5",
    stage: "at_lab",
    onboarded: true,
  },
  {
    no: 17261,
    title: "",
    first: "June",
    last: "Pell",
    sex: "F",
    dob: "1956-05-10",
    email: "jasvir.brar@example.com",
    cell: "(236) 555-0132",
    city: "Brampton",
    addr: "14 Yuille Court",
    postal: "L6Y 5J3",
    stage: "onboarding",
    onboarded: false,
  },
  {
    no: 5623,
    title: "Mr.",
    first: "Owen",
    last: "Pike",
    sex: "M",
    dob: "1991-09-22",
    email: "omran.abidi@example.com",
    cell: "(647) 555-0329",
    city: "Mississauga",
    addr: "Unit 2113-35 Trailwood Dr",
    postal: "L4Z 3K6",
    stage: "rx_ready",
    onboarded: true,
  },
  {
    no: 6669,
    title: "",
    first: "Soren",
    last: "Flint",
    sex: "M",
    dob: "1999-11-03",
    email: "jash.gill@example.com",
    cell: "(647) 555-5908",
    city: "Brampton",
    addr: "33 Polonia Ave",
    postal: "L6Y 0K3",
    stage: "ready_to_call",
    onboarded: true,
  },
  {
    no: 10041,
    title: "Ms.",
    first: "Maren",
    last: "Quill",
    sex: "F",
    dob: "1982-07-19",
    email: "maeve.wilson@example.com",
    cell: "(416) 555-9041",
    city: "Brampton",
    addr: "69 Nipissing Cres",
    postal: "L6S 4Z8",
    stage: "paid",
    onboarded: true,
  },
  {
    no: 16152,
    title: "",
    first: "Kit",
    last: "Solis",
    sex: "M",
    dob: "2014-03-08",
    email: "sara.omran@example.com",
    cell: "(647) 555-8437",
    city: "Mississauga",
    addr: "2113-35 Trailwood Dr",
    postal: "L4Z 3K6",
    stage: "scheduled",
    onboarded: true,
  },
  {
    no: 5631,
    title: "",
    first: "Wren",
    last: "Solis",
    sex: "F",
    dob: "1986-12-01",
    email: "sara.omran@example.com",
    cell: "(647) 555-8437",
    city: "Mississauga",
    addr: "2113-35 Trailwood Dr",
    postal: "L4Z 3K6",
    stage: "onboarded",
    onboarded: true,
  },
] as const;

let relabelStamp = "";

/** Rename the seeded cast in-place so a running clinic picks up new names. */
export async function relabelDemoCast(sql: Sql, clinicId: string) {
  const stamp = `${clinicId}:${DEMO_STAFF.email}:${DEMO_STAFF.name}:${DEMO_DOCTORS.map((d) => d.name).join("|")}:${DEMO_CHARTS.map((p) => `${p.first}:${p.email}`).join("|")}`;
  if (relabelStamp === stamp) return;
  relabelStamp = stamp;
  for (const d of DEMO_DOCTORS) {
    await sql`
      update doctors set name = ${d.name}, credentials = ${d.cred}, specialty = ${d.spec}
      where clinic_id = ${clinicId} and color = ${d.color}
    `;
  }
  for (const p of DEMO_CHARTS) {
    await sql`
      update patients
      set title = ${p.title}, first_name = ${p.first}, last_name = ${p.last}, email = ${p.email}
      where clinic_id = ${clinicId} and patient_no = ${p.no}
    `;
  }
  await sql`
    update orders set sold_by = ${DEMO_STAFF.name} where clinic_id = ${clinicId}
  `;
  await sql`
    update profiles set display_name = ${DEMO_STAFF.name}
    where clinic_id = ${clinicId} and email = ${DEMO_STAFF.email}
  `;
  await sql`
    update "user" set name = ${DEMO_STAFF.name} where email = ${DEMO_STAFF.email}
  `;
  const portal = DEMO_CHARTS[0];
  const portalName = `${portal.first} ${portal.last}`;
  await sql`
    update profiles set display_name = ${portalName}
    where clinic_id = ${clinicId} and email = ${portal.email}
  `;
  await sql`
    update "user" set name = ${portalName} where email = ${portal.email}
  `;

  const lilaMail = `Hi ${portal.first} — your comprehensive exam with ${DEMO_DOCTORS[0].name} is booked for Friday at 2:00 PM at Optical One. Please arrive 10 minutes early with your current glasses.`;
  await sql`
    update emails
    set to_name = ${portalName}, body = ${lilaMail},
        subject = ${"Your visit is confirmed — Friday 2:00 PM"},
        to_email = ${portal.email}
    where clinic_id = ${clinicId}
      and (to_email = ${portal.email} or to_email = ${"ciara.hart@example.com"})
  `;
  const soren = DEMO_CHARTS[4];
  const sorenName = `${soren.first} ${soren.last}`;
  await sql`
    update emails
    set to_name = ${sorenName},
        body = ${`Good news — your Oliver Peoples pair is back from the lab and ready. Reply to this note or call the front desk to book a dispense.`}
    where clinic_id = ${clinicId} and to_email = ${soren.email}
  `;
  const maren = DEMO_CHARTS[5];
  const marenName = `${maren.first} ${maren.last}`;
  await sql`
    update emails
    set to_name = ${marenName},
        body = ${`${maren.first}, your chart is open. Complete onboarding anytime from the patient portal — insurance, family, and health history take about four minutes.`}
    where clinic_id = ${clinicId} and to_email = ${maren.email}
  `;
}

export async function seedPractice(sql: Sql, clinicId: string) {
  const existing = (
    await sql<{ n: number }>`select count(*)::int as n from doctors where clinic_id = ${clinicId}`
  )[0];
  if ((existing?.n ?? 0) > 0) {
    await relabelDemoCast(sql, clinicId);
    return;
  }

  const doctors = DEMO_DOCTORS.map((d) => ({ ...d, id: id() }));

  for (const d of doctors) {
    await sql`
      insert into doctors (id, clinic_id, name, credentials, color, specialty)
      values (${d.id}, ${clinicId}, ${d.name}, ${d.cred}, ${d.color}, ${d.spec})
    `;
  }

  const pids: string[] = [];
  for (const p of DEMO_CHARTS) {
    const pid = id();
    pids.push(pid);
    await sql`
      insert into patients (
        id, clinic_id, patient_no, title, first_name, last_name, sex, dob, email,
        phone_cell, city, address1, postal, province, journey_stage, onboarded, phipa_consent
      ) values (
        ${pid}, ${clinicId}, ${p.no}, ${p.title}, ${p.first}, ${p.last}, ${p.sex},
        ${p.dob}, ${p.email}, ${p.cell}, ${p.city}, ${p.addr}, ${p.postal}, ${"ON"},
        ${p.stage}, ${p.onboarded}, ${p.onboarded}
      )
    `;
    await sql`
      insert into journey_events (id, patient_id, stage, note)
      values (${id()}, ${pid}, ${p.stage}, ${"Seeded chart"})
    `;
  }

  // Family: Wren + Kit Solis
  await sql`
    insert into family_links (id, clinic_id, patient_id, related_patient_id, relationship, is_guarantor)
    values (${id()}, ${clinicId}, ${pids[6]}, ${pids[7]}, ${"Parent"}, ${true})
  `;
  await sql`
    insert into family_links (id, clinic_id, patient_id, related_patient_id, relationship, is_guarantor)
    values (${id()}, ${clinicId}, ${pids[7]}, ${pids[6]}, ${"Child"}, ${false})
  `;

  await sql`
    insert into insurance (id, patient_id, carrier, plan_name, member_id, group_no, copay, is_primary)
    values (${id()}, ${pids[0]}, ${"Great-West Life"}, ${"Family vision"}, ${"GWL-88421"}, ${"204"}, ${25}, ${true})
  `;
  await sql`
    insert into insurance (id, patient_id, carrier, plan_name, member_id, group_no, copay, is_primary)
    values (${id()}, ${pids[1]}, ${"Sun Life"}, ${"Employee plus"}, ${"SL-55201"}, ${"91"}, ${20}, ${true})
  `;

  await sql`
    insert into vision_rx (
      id, patient_id, doctor_id, exam_date,
      od_sphere, od_cyl, od_axis, od_add,
      os_sphere, os_cyl, os_axis, os_add, pd
    ) values (
      ${id()}, ${pids[0]}, ${doctors[0].id}, ${"2026-06-12"},
      ${"-1.25"}, ${"-0.50"}, ${"180"}, ${"+2.00"},
      ${"-1.50"}, ${"-0.25"}, ${"175"}, ${"+2.00"}, ${"62"}
    )
  `;
  await sql`
    insert into vision_rx (
      id, patient_id, doctor_id, exam_date,
      od_sphere, od_cyl, od_axis, od_add,
      os_sphere, os_cyl, os_axis, os_add, pd
    ) values (
      ${id()}, ${pids[1]}, ${doctors[1].id}, ${"2026-07-28"},
      ${"-3.00"}, ${"-0.75"}, ${"90"}, ${""},
      ${"-2.75"}, ${"-0.50"}, ${"85"}, ${""}, ${"61"}
    )
  `;

  const today = clinicYmd();
  const day1 = shiftClinicDate(today, 1);
  const day2 = shiftClinicDate(today, 2);

  await sql`
    insert into appointments (id, clinic_id, patient_id, doctor_id, start_at, duration_min, status, service)
    values (${id()}, ${clinicId}, ${pids[0]}, ${doctors[0].id}, ${clockIso(day2, 14 * 60)}, ${20}, ${"confirmed"}, ${"Comprehensive exam"})
  `;
  await sql`
    insert into appointments (id, clinic_id, patient_id, doctor_id, start_at, duration_min, status, service)
    values (${id()}, ${clinicId}, ${pids[6]}, ${doctors[2].id}, ${clockIso(today, 11 * 60)}, ${20}, ${"confirmed"}, ${"Pediatric exam"})
  `;
  await sql`
    insert into appointments (id, clinic_id, patient_id, doctor_id, start_at, duration_min, status, service)
    values (${id()}, ${clinicId}, ${pids[3]}, ${doctors[1].id}, ${clockIso(day1, 10 * 60 + 20)}, ${20}, ${"pre"}, ${"Contact lens fitting"})
  `;

  await sql`
    insert into orders (
      id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
      promised_date, sold_by, patient_total, insurance_total
    ) values (
      ${id()}, ${clinicId}, ${pids[1]}, ${doctors[1].id}, ${"Spectacle lens"}, ${"at_lab"},
      ${"Ray-Ban RB5154"}, ${"Progressive — Crizal"},
      ${"2026-08-18"}, ${DEMO_STAFF.name}, ${189.0}, ${250.0}
    )
  `;
  await sql`
    insert into orders (
      id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
      promised_date, sold_by, patient_total, insurance_total
    ) values (
      ${id()}, ${clinicId}, ${pids[4]}, ${doctors[0].id}, ${"Spectacle lens"}, ${"ready_to_call"},
      ${"Oliver Peoples Cary Grant"}, ${"Single vision — Transitions"},
      ${"2026-08-12"}, ${DEMO_STAFF.name}, ${240.0}, ${175.0}
    )
  `;
  await sql`
    insert into orders (
      id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
      promised_date, sold_by, patient_total, insurance_total
    ) values (
      ${id()}, ${clinicId}, ${pids[5]}, ${doctors[0].id}, ${"Contact lens"}, ${"paid"},
      ${""}, ${"Acuvue Oasys 1-Day"},
      ${"2026-08-01"}, ${DEMO_STAFF.name}, ${0}, ${86.0}
    )
  `;

  const mails = [
    {
      to: DEMO_CHARTS[0].email,
      name: `${DEMO_CHARTS[0].first} ${DEMO_CHARTS[0].last}`,
      sub: "Your visit is confirmed — Friday 2:00 PM",
      body: `Hi ${DEMO_CHARTS[0].first} — your comprehensive exam with ${doctors[0].name} is booked for Friday at 2:00 PM at Optical One. Please arrive 10 minutes early with your current glasses.`,
      kind: "appointment",
    },
    {
      to: DEMO_CHARTS[4].email,
      name: `${DEMO_CHARTS[4].first} ${DEMO_CHARTS[4].last}`,
      sub: "Your glasses are ready for pickup",
      body: "Good news — your Oliver Peoples pair is back from the lab and ready. Reply to this note or call the front desk to book a dispense.",
      kind: "order",
    },
    {
      to: DEMO_CHARTS[5].email,
      name: `${DEMO_CHARTS[5].first} ${DEMO_CHARTS[5].last}`,
      sub: "Welcome to Optical One",
      body: `${DEMO_CHARTS[5].first}, your chart is open. Complete onboarding anytime from the patient portal — insurance, family, and health history take about four minutes.`,
      kind: "onboarding",
    },
  ];
  for (const m of mails) {
    await sql`
      insert into emails (id, clinic_id, to_email, to_name, subject, body, kind)
      values (${id()}, ${clinicId}, ${m.to}, ${m.name}, ${m.sub}, ${m.body}, ${m.kind})
    `;
  }
}

/** Keep the cluster showcase on a live date after the sandbox sits idle. */
export async function refreshDemoSchedule(sql: Sql, clinicId: string) {
  await relabelDemoCast(sql, clinicId);

  const today = clinicYmd();
  const day1 = shiftClinicDate(today, 1);
  const day2 = shiftClinicDate(today, 2);

  const primary = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and color = ${"doc-1"} limit 1`
  )[0];
  const contacts = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and color = ${"doc-3"} limit 1`
  )[0];
  const peds = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and color = ${"doc-2"} limit 1`
  )[0];
  const lila = (
    await sql<{ id: string }>`
      select id from patients
      where clinic_id = ${clinicId} and email = ${DEMO_CHARTS[0].email}
      limit 1
    `
  )[0];
  const kit = (
    await sql<{ id: string }>`
      select id from patients
      where clinic_id = ${clinicId} and patient_no = ${DEMO_CHARTS[6].no}
      limit 1
    `
  )[0];
  const owen = (
    await sql<{ id: string }>`
      select id from patients
      where clinic_id = ${clinicId} and email = ${DEMO_CHARTS[3].email}
      limit 1
    `
  )[0];
  if (!primary || !contacts || !peds || !lila || !kit || !owen) return;

  async function upsert(
    patientId: string,
    doctorId: string,
    start: string,
    status: string,
    service: string,
  ) {
    const row = (
      await sql<{ id: string }>`
        select id from appointments
        where clinic_id = ${clinicId} and patient_id = ${patientId} and service = ${service}
        order by start_at desc
        limit 1
      `
    )[0];
    if (row) {
      await sql`
        update appointments
        set start_at = ${start}, doctor_id = ${doctorId}, status = ${status}, duration_min = ${20}
        where id = ${row.id}
      `;
    } else {
      await sql`
        insert into appointments (id, clinic_id, patient_id, doctor_id, start_at, duration_min, status, service)
        values (${id()}, ${clinicId}, ${patientId}, ${doctorId}, ${start}, ${20}, ${status}, ${service})
      `;
    }
  }

  await upsert(lila.id, primary.id, clockIso(day2, 14 * 60), "confirmed", "Comprehensive exam");
  await upsert(kit.id, peds.id, clockIso(today, 11 * 60), "confirmed", "Pediatric exam");
  await upsert(owen.id, contacts.id, clockIso(day1, 10 * 60 + 20), "pre", "Contact lens fitting");
}
