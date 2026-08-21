import type { Appointment, Doctor } from "./types";

export type SlotState = "open" | "booked" | "locked";

export type DaySlot = {
  start: Date;
  iso: string;
  label: string;
  minutes: number;
  state: SlotState;
  appointment?: Appointment;
};

const HOUR = 60;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function asIso(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.endsWith("Z") ? s : s.replace(" ", "T") + (s.includes("Z") ? "" : "Z");
  if (/^\d{4}-\d{2}-\d{2} /.test(s)) return s.replace(" ", "T") + "Z";
  return s;
}

export function parseHm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function clockIso(dateStr: string, minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${dateStr}T${hh}:${mm}:00.000Z`;
}

export function clockLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export function minutesFromIso(iso: string | Date) {
  const t = asIso(iso).slice(11, 16);
  return parseHm(t);
}

export function datePart(iso: string | Date) {
  return asIso(iso).slice(0, 10);
}

/** Local calendar day (not UTC). `yyyy-MM-dd` next/prev must use this. */
export function clinicYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftClinicDate(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return clinicYmd(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
}

export function clinicDateLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export function visitLabel(iso: string | Date) {
  return `${datePart(iso)} · ${clockLabel(minutesFromIso(iso))}`;
}

/** Cluster scheduling: first visit of the day may land anywhere.
 *  After a booking at T, the hour before and after T open. */
export function buildDaySlots(
  doctor: Doctor,
  dateStr: string,
  appointments: Appointment[],
): DaySlot[] {
  const workStart = parseHm(doctor.work_start || "09:00");
  const workEnd = parseHm(doctor.work_end || "17:00");
  const step = doctor.slot_minutes || 20;

  const dayAppts = appointments
    .filter((a) => a.doctor_id === doctor.id && a.status !== "canceled")
    .filter((a) => datePart(a.start_at) === dateStr)
    .map((a) => ({
      ...a,
      minutes: minutesFromIso(a.start_at),
    }));

  const slots: DaySlot[] = [];
  for (let t = workStart; t + step <= workEnd; t += step) {
    const hit = dayAppts.find((a) => t >= a.minutes && t < a.minutes + a.duration_min);
    slots.push({
      start: new Date(clockIso(dateStr, t)),
      iso: clockIso(dateStr, t),
      label: clockLabel(t),
      minutes: t,
      state: "open",
      appointment: hit,
    });
  }

  if (dayAppts.length === 0) {
    return slots.map((s) => ({ ...s, state: "open" as const, appointment: undefined }));
  }

  const windows = dayAppts.map((a) => ({
    from: a.minutes - HOUR,
    to: a.minutes + a.duration_min + HOUR,
  }));

  return slots.map((s) => {
    if (s.appointment) return { ...s, state: "booked" as const };
    const open = windows.some((w) => s.minutes >= w.from && s.minutes < w.to);
    return { ...s, state: open ? "open" : "locked", appointment: undefined };
  });
}

export function neighborLabels(minutes: number) {
  return `${clockLabel(minutes - 60)} and ${clockLabel(minutes + 60)}`;
}
