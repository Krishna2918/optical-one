import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { inviteUser, listUsers, saveDoctor, updateClinic, updateUserRole } from "@/lib/server/actions";
import { DOCTOR_COLORS, LETTER_TEMPLATES, ROLES, type Role } from "@/lib/constants";
import type { Clinic, Doctor, Invite, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/admin")({ component: AdminPage });

function AdminPage() {
  const [tab, setTab] = useState<"people" | "doctors" | "clinic" | "letters">("people");
  const [users, setUsers] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [docName, setDocName] = useState("");
  const [spec, setSpec] = useState("Optometry");

  async function reload() {
    const d = await listUsers();
    setUsers(d.users);
    setInvites(d.invites);
    setDoctors(d.doctors);
    setClinic(d.clinic);
  }

  useEffect(() => {
    reload().catch((e: unknown) =>
      setBlocked(e instanceof Error ? e.message : "Admin only"),
    );
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Control</p>
        <h1 className="mt-1 font-display text-4xl text-ink">Admin</h1>
      </header>
      {blocked ? (
        <Card>
          <p className="text-sm text-muted">{blocked}. Ask an owner to promote this account.</p>
        </Card>
      ) : null}
      <div className="flex gap-1">
        {(["people", "doctors", "clinic", "letters"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-10 rounded-lg px-3 text-sm capitalize ${
              tab === t ? "bg-navy text-navy-fg" : "text-muted hover:bg-bg-warm"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "people" && !blocked ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{u.display_name}</p>
                    <p className="text-xs text-muted">{u.email || u.user_id}</p>
                  </div>
                  <select
                    className="h-10 rounded-lg bg-card px-2 text-xs shadow-border"
                    value={u.role}
                    onChange={(e) =>
                      void updateUserRole({ data: { userId: u.user_id, role: e.target.value as Role } })
                        .then(reload)
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="h-fit space-y-3">
            <h2 className="font-display text-xl">Invite</h2>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Role">
              <select
                className="h-11 w-full rounded-lg bg-card px-3 text-sm shadow-border"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              className="w-full"
              disabled={!email}
              onClick={() =>
                void inviteUser({ data: { email, role, name } })
                  .then(() => {
                    toast.success("Invite mailed");
                    setEmail("");
                    setName("");
                    return reload();
                  })
                  .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"))
              }
            >
              Send invite
            </Button>
            {invites.length > 0 ? (
              <ul className="space-y-1 pt-2 text-xs text-muted">
                {invites.map((i) => (
                  <li key={i.id}>
                    {i.email} · {i.role}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === "doctors" && !blocked ? (
        <div className="space-y-3">
          {doctors.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ background: `var(--color-${d.color})` }}
                />
                <div>
                  <p className="text-sm font-medium text-ink">{d.name}</p>
                  <p className="text-xs text-muted">
                    {d.specialty} · {d.work_start}–{d.work_end} · {d.slot_minutes}m
                  </p>
                </div>
              </div>
            </Card>
          ))}
          <Card className="grid gap-2 sm:grid-cols-3">
            <Field label="Name">
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
            </Field>
            <Field label="Specialty">
              <Input value={spec} onChange={(e) => setSpec(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button
                disabled={!docName}
                onClick={() =>
                  void saveDoctor({
                    data: {
                      name: docName,
                      specialty: spec,
                      color: DOCTOR_COLORS[doctors.length % DOCTOR_COLORS.length],
                    },
                  }).then(() => {
                    toast.success("Doctor registered");
                    setDocName("");
                    return reload();
                  })
                }
              >
                Register doctor
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "clinic" && clinic && !blocked ? (
        <ClinicForm clinic={clinic} onSave={reload} />
      ) : null}

      {tab === "letters" ? (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {LETTER_TEMPLATES.map((l) => (
              <li key={l.name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink">{l.name}</span>
                <span className="text-xs text-subtle">{l.type}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function ClinicForm({ clinic, onSave }: { clinic: Clinic; onSave: () => Promise<void> }) {
  const [name, setName] = useState(clinic.name);
  const [phone, setPhone] = useState(clinic.phone);
  const [address, setAddress] = useState(clinic.address);
  const [city, setCity] = useState(clinic.city);
  const [start, setStart] = useState(clinic.work_start);
  const [end, setEnd] = useState(clinic.work_end);
  return (
    <Card className="grid max-w-xl gap-3">
      <Field label="Practice name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label="Address">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="City">
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Open">
          <Input value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Close">
          <Input value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Button
        onClick={() =>
          void updateClinic({
            data: { name, phone, address, city, work_start: start, work_end: end },
          }).then(() => {
            toast.success("Clinic saved");
            return onSave();
          })
        }
      >
        Save clinic
      </Button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
