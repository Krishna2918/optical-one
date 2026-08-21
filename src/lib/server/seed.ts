import type { Sql } from "@/lib/db";
import { clockIso, clinicYmd, shiftClinicDate } from "@/lib/slots";

function id() {
  return crypto.randomUUID();
}

export async function seedPractice(sql: Sql, clinicId: string) {
  const existing = (
    await sql<{ n: number }>`select count(*)::int as n from doctors where clinic_id = ${clinicId}`
  )[0];
  if ((existing?.n ?? 0) > 0) return;

  const doctors = [
    { id: id(), name: "Dr. Amrik Dhaliwal", cred: "OD", color: "doc-1", spec: "Primary care" },
    { id: id(), name: "Dr. Rajesh Batra", cred: "OD", color: "doc-3", spec: "Contact lenses" },
    { id: id(), name: "Dr. Raman Dhaliwal", cred: "OD", color: "doc-2", spec: "Pediatrics" },
    { id: id(), name: "Dr. Arshdeep Kaur", cred: "OD", color: "doc-4", spec: "Ocular disease" },
  ];

  for (const d of doctors) {
    await sql`
      insert into doctors (id, clinic_id, name, credentials, color, specialty)
      values (${d.id}, ${clinicId}, ${d.name}, ${d.cred}, ${d.color}, ${d.spec})
    `;
  }

  const patients = [
    {
      no: 4966,
      title: "Ms.",
      first: "Ciara",
      last: "Hart",
      sex: "F",
      dob: "1974-01-02",
      email: "ciara.hart@example.com",
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
      first: "Jasneet",
      last: "Brar",
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
      first: "Jasvir",
      last: "Brar",
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
      first: "Omran",
      last: "Abidi",
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
      first: "Jashanjot",
      last: "Gill",
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
      first: "Maeve",
      last: "Wilson",
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
      first: "Zohair",
      last: "Omran",
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
      first: "Sara",
      last: "Omran",
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
  ];

  const pids: string[] = [];
  for (const p of patients) {
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

  // Family: Sara + Zohair Omran
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
      ${"2026-08-18"}, ${"Harjinder Gahir"}, ${189.0}, ${250.0}
    )
  `;
  await sql`
    insert into orders (
      id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
      promised_date, sold_by, patient_total, insurance_total
    ) values (
      ${id()}, ${clinicId}, ${pids[4]}, ${doctors[0].id}, ${"Spectacle lens"}, ${"ready_to_call"},
      ${"Oliver Peoples Cary Grant"}, ${"Single vision — Transitions"},
      ${"2026-08-12"}, ${"Harjinder Gahir"}, ${240.0}, ${175.0}
    )
  `;
  await sql`
    insert into orders (
      id, clinic_id, patient_id, doctor_id, type, status, frame_name, lens_type,
      promised_date, sold_by, patient_total, insurance_total
    ) values (
      ${id()}, ${clinicId}, ${pids[5]}, ${doctors[0].id}, ${"Contact lens"}, ${"paid"},
      ${""}, ${"Acuvue Oasys 1-Day"},
      ${"2026-08-01"}, ${"Harjinder Gahir"}, ${0}, ${86.0}
    )
  `;

  const mails = [
    {
      to: "ciara.hart@example.com",
      name: "Ciara Hart",
      sub: "Your visit is confirmed — Friday 2:00 PM",
      body: "Hi Ciara — your comprehensive exam with Dr. Amrik Dhaliwal is booked for Friday at 2:00 PM at Optical One. Please arrive 10 minutes early with your current glasses.",
      kind: "appointment",
    },
    {
      to: "jash.gill@example.com",
      name: "Jashanjot Gill",
      sub: "Your glasses are ready for pickup",
      body: "Good news — your Oliver Peoples pair is back from the lab and ready. Reply to this note or call the front desk to book a dispense.",
      kind: "order",
    },
    {
      to: "maeve.wilson@example.com",
      name: "Maeve Wilson",
      sub: "Welcome to Optical One",
      body: "Maeve, your chart is open. Complete onboarding anytime from the patient portal — insurance, family, and health history take about four minutes.",
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
  const today = clinicYmd();
  const day1 = shiftClinicDate(today, 1);
  const day2 = shiftClinicDate(today, 2);

  const amrik = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and name = ${"Dr. Amrik Dhaliwal"} limit 1`
  )[0];
  const rajesh = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and name = ${"Dr. Rajesh Batra"} limit 1`
  )[0];
  const raman = (
    await sql<{ id: string }>`select id from doctors where clinic_id = ${clinicId} and name = ${"Dr. Raman Dhaliwal"} limit 1`
  )[0];
  const ciara = (
    await sql<{ id: string }>`select id from patients where clinic_id = ${clinicId} and email = ${"ciara.hart@example.com"} limit 1`
  )[0];
  const zohair = (
    await sql<{ id: string }>`select id from patients where clinic_id = ${clinicId} and first_name = ${"Zohair"} limit 1`
  )[0];
  const omran = (
    await sql<{ id: string }>`select id from patients where clinic_id = ${clinicId} and email = ${"omran.abidi@example.com"} limit 1`
  )[0];
  if (!amrik || !rajesh || !raman || !ciara || !zohair || !omran) return;

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

  await upsert(ciara.id, amrik.id, clockIso(day2, 14 * 60), "confirmed", "Comprehensive exam");
  await upsert(zohair.id, raman.id, clockIso(today, 11 * 60), "confirmed", "Pediatric exam");
  await upsert(omran.id, rajesh.id, clockIso(day1, 10 * 60 + 20), "pre", "Contact lens fitting");
}
