import { createFileRoute } from "@tanstack/react-router";
import { buildDaySlots, clinicDateLabel, clinicYmd, clockLabel, minutesFromIso, shiftClinicDate } from "@/lib/slots";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookAppointment, getSchedule, listPatients, updateAppointment } from "@/lib/server/actions";
import { SERVICES } from "@/lib/constants";
import type { Appointment, Doctor, Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const [date, setDate] = useState(() => shiftClinicDate(clinicYmd(), 2));
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [draft, setDraft] = useState<{
    doctor: Doctor;
    iso: string;
    label: string;
  } | null>(null);
  const [patientId, setPatientId] = useState("");
  const [service, setService] = useState<string>(SERVICES[0]);
  const [q, setQ] = useState("");

  async function reload() {
    const s = await getSchedule({ data: { date } });
    const p = await listPatients({ data: {} });
    setDoctors(s.doctors);
    setAppts(s.appointments);
    setPatients(p);
  }

  useEffect(() => {
    let live = true;
    reload().catch((e: unknown) => {
      if (live) toast.error(e instanceof Error ? e.message : "Could not load the book");
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filtered = useMemo(() => {
    const n = q.toLowerCase();
    return patients.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.patient_no}`.toLowerCase().includes(n),
    );
  }, [patients, q]);

  async function book() {
    if (!draft || !patientId) return;
    try {
      const res = await bookAppointment({
        data: {
          patientId,
          doctorId: draft.doctor.id,
          startAt: draft.iso,
          service,
        },
      });
      toast.success(`Booked. Opened neighboring hours: ${res.openedNeighbors}`);
      setDraft(null);
      setPatientId("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not book");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
            Cluster book
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink">Schedule</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            First visit of the day can land anywhere. After that, only the hour
            before and after an existing visit stay open — a 2:00 booking unlocks 1:00 and 3:00.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDate(shiftClinicDate(date, -1))}>
            Prev
          </Button>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button variant="outline" onClick={() => setDate(clinicYmd())}>
            Today
          </Button>
          <Button variant="outline" onClick={() => setDate(shiftClinicDate(date, 1))}>
            Next
          </Button>
        </div>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {doctors.map((d) => {
          const slots = buildDaySlots(d, date, appts);
          const color = `var(--color-${d.color})`;
          return (
            <Card key={d.id} className="min-w-64 flex-1 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="size-2.5 rounded-full" style={{ background: color }} />
                <div>
                  <p className="text-sm font-medium text-ink">{d.name}</p>
                  <p className="text-[11px] text-subtle">
                    {d.specialty} · {d.slot_minutes}m
                  </p>
                </div>
              </div>
              <ul className="space-y-1">
                {slots.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      disabled={s.state === "booked"}
                      onClick={() => {
                        if (s.state === "locked") {
                          toast.message("Hour is closed until a nearby visit opens it.");
                          return;
                        }
                        if (s.state !== "open") return;
                        setDraft({
                          doctor: d,
                          iso: s.iso,
                          label: s.label,
                        });
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 text-left text-xs transition-colors duration-150",
                        s.state === "booked" && "bg-navy text-navy-fg",
                        s.state === "open" && "bg-accent-soft text-accent hover:opacity-90",
                        s.state === "locked" && "bg-bg-warm text-subtle",
                      )}
                    >
                      <span className="tabular-nums">{s.label}</span>
                      <span className="truncate pl-2">
                        {s.state === "booked"
                          ? s.appointment?.patient_name
                          : s.state === "open"
                            ? "Open"
                            : "Closed"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {draft ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-ink/30 p-4 sm:place-items-center">
          <Card className="w-full max-w-md p-5">
            <h2 className="font-display text-2xl text-ink">New visit</h2>
            <p className="mt-1 text-sm text-muted">
              {draft.doctor.name} · {clinicDateLabel(date)} · {draft.label}
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Find patient</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or chart #" />
              </div>
              <div className="max-h-40 overflow-auto rounded-lg bg-bg-warm p-1">
                {filtered.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatientId(p.id)}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between rounded-md px-2 text-left text-sm",
                      patientId === p.id ? "bg-card text-ink shadow-border" : "text-muted",
                    )}
                  >
                    <span>
                      {p.last_name}, {p.first_name}
                    </span>
                    <span className="tabular-nums text-xs text-subtle">#{p.patient_no}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Service</Label>
                <select
                  className="h-11 w-full rounded-lg bg-card px-3 text-sm shadow-border"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => void book()} disabled={!patientId}>
                  Confirm
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <Card>
        <h2 className="mb-3 font-display text-xl text-ink">Today’s roster</h2>
        <ul className="divide-y divide-border">
          {appts.length === 0 ? (
            <li className="py-6 text-sm text-muted">No visits this day — first booking can land anywhere.</li>
          ) : (
            appts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{a.patient_name}</p>
                  <p className="text-xs text-muted">
                    {clockLabel(minutesFromIso(a.start_at))} · {a.doctor_name} · {a.service}
                  </p>
                </div>
                <div className="flex gap-2">
                  {a.status !== "checked_in" && a.status !== "canceled" ? (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        void updateAppointment({ data: { id: a.id, status: "checked_in" } }).then(reload)
                      }
                    >
                      Check in
                    </Button>
                  ) : null}
                  <span className="self-center text-xs capitalize text-subtle">
                    {a.status.replaceAll("_", " ")}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
