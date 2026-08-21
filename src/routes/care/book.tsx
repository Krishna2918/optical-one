import { createFileRoute } from "@tanstack/react-router";
import { clinicYmd, clockLabel, minutesFromIso, shiftClinicDate } from "@/lib/slots";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bookAppointment, myCare, previewSlots } from "@/lib/server/actions";
import { SERVICES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/care/book")({ component: CareBook });

function CareBook() {
  const [date, setDate] = useState(() => shiftClinicDate(clinicYmd(), 2));
  const [care, setCare] = useState<Awaited<ReturnType<typeof myCare>> | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState<
    { iso: string; label: string; state: string; appointment: { patient_name?: string } | null }[]
  >([]);
  const [service, setService] = useState<string>(SERVICES[0]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    myCare().then((c) => {
      setCare(c);
      setDoctorId(c.workspace.doctors[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    previewSlots({ data: { date, doctorId } })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [date, doctorId]);

  if (!care?.patient) {
    return <p className="text-sm text-muted">Open a chart before booking.</p>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl text-ink">Book a visit</h1>
        <p className="mt-2 text-sm text-muted">
          The first booking of the day can be any hour. After that, only neighboring hours stay open.
        </p>
      </header>
      <Card className="space-y-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {care.workspace.doctors
            .filter((d) => d.active)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDoctorId(d.id)}
                className={cn(
                  "h-10 rounded-lg px-3 text-sm",
                  doctorId === d.id ? "bg-navy text-navy-fg" : "bg-bg-warm text-muted",
                )}
              >
                {d.name}
              </button>
            ))}
        </div>
        <select
          className="h-11 w-full rounded-lg bg-card px-3 text-sm shadow-border"
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          {SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((s) => (
            <li key={s.iso}>
              <button
                type="button"
                disabled={s.state === "booked"}
                onClick={() => {
                  if (s.state === "locked") {
                    toast.message("This hour opens when a nearby visit is booked.");
                    return;
                  }
                  setPicked(s.iso);
                }}
                className={cn(
                  "flex min-h-12 w-full flex-col items-start justify-center rounded-lg px-3 text-left text-xs",
                  s.state === "open" && picked === s.iso && "bg-accent text-accent-fg",
                  s.state === "open" && picked !== s.iso && "bg-accent-soft text-accent",
                  s.state === "locked" && "bg-bg-warm text-subtle",
                  s.state === "booked" && "bg-navy/80 text-navy-fg",
                )}
              >
                <span className="tabular-nums">{s.label}</span>
                <span>{s.state === "booked" ? "Taken" : s.state === "locked" ? "Closed" : "Available"}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          disabled={!picked}
          onClick={() => {
            if (!picked || !care.patient) return;
            void bookAppointment({
              data: {
                patientId: care.patient.id,
                doctorId,
                startAt: picked,
                service,
              },
            })
              .then((r) => {
                toast.success(`Booked. Neighboring hours opened: ${r.openedNeighbors}`);
                setPicked(null);
                return previewSlots({ data: { date, doctorId } }).then(setSlots);
              })
              .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not book"));
          }}
        >
          Confirm {picked ? clockLabel(minutesFromIso(picked)) : ""}
        </Button>
      </Card>
    </div>
  );
}
