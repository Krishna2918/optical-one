import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { visitLabel } from "@/lib/slots";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  addFamily,
  getPatient,
  grantPortal,
  saveInsurance,
  saveOrder,
  saveRx,
  setJourney,
} from "@/lib/server/actions";
import { JOURNEY_STAGES, ORDER_STATUSES, RELATIONSHIPS } from "@/lib/constants";
import type { Patient } from "@/lib/types";
import { JourneyBadge, OrderStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/patients_/$id")({ component: ChartPage });

const TABS = ["Profile", "Family", "Insurance", "Vision Rx", "Orders", "Journey"] as const;

function ChartPage() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const [data, setData] = useState<Awaited<ReturnType<typeof getPatient>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const d = await getPatient({ data: id });
    setData(d);
    setError(null);
  }

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    getPatient({ data: id })
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : "Could not open this chart");
      });
    return () => {
      live = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            void reload().catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Could not open this chart"),
            );
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return <div data-testid="chart-skeleton" className="h-64 animate-pulse rounded-2xl bg-bg-warm" />;
  const p = data.patient;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/app/patients" className="text-xs text-accent">
            All charts
          </Link>
          <h1 data-testid="chart-name" className="mt-1 font-display text-4xl text-ink">
            {p.first_name} {p.last_name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            #{p.patient_no}
            {p.dob ? ` · ${p.dob}` : ""}
            {p.city ? ` · ${p.city}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JourneyBadge stage={p.journey_stage} />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void grantPortal({ data: { patientId: p.id } })
                .then(() => toast.success("Portal invite mailed"))
                .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"))
            }
          >
            Invite to portal
          </Button>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto" data-testid="chart-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            data-testid={`chart-tab-${t.replace(/\s+/g, "-")}`}
            aria-label={t}
            onClick={() => setTab(t)}
            className={`h-10 shrink-0 rounded-lg px-3 text-sm ${
              tab === t ? "bg-navy text-navy-fg" : "text-muted hover:bg-bg-warm"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" ? (
        <Card className="grid gap-4 sm:grid-cols-2">
          <Info k="Email" v={p.email} />
          <Info k="Mobile" v={p.phone_cell} />
          <Info k="Home" v={p.phone_home} />
          <Info k="Work" v={p.phone_work} />
          <Info k="Address" v={[p.address1, p.city, p.province, p.postal].filter(Boolean).join(", ")} />
          <Info k="Employer" v={p.employer} />
          <Info k="Health card" v={p.health_card} />
          <Info k="Language" v={p.language} />
          <div className="sm:col-span-2">
            <Info k="Notes" v={p.notes} />
          </div>
        </Card>
      ) : null}

      {tab === "Family" ? (
        <Card className="space-y-4">
          <ul className="divide-y divide-border">
            {data.family.length === 0 ? (
              <li className="py-4 text-sm text-muted">No household on file.</li>
            ) : (
              data.family.map((f) => (
                <li key={f.id} className="flex justify-between py-3 text-sm">
                  <Link to="/app/patients/$id" params={{ id: f.related_patient_id }} className="text-ink">
                    {f.related_name}
                  </Link>
                  <span className="text-muted">
                    {f.relationship}
                    {f.is_guarantor ? " · guarantor" : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
          <FamilyForm
            key={p.id}
            people={data.people}
            onAdd={async (relatedPatientId, relationship, isGuarantor) => {
              await addFamily({ data: { patientId: p.id, relatedPatientId, relationship, isGuarantor } });
              toast.success("Family linked");
              await reload();
            }}
          />
        </Card>
      ) : null}

      {tab === "Insurance" ? (
        <Card className="space-y-4">
          <ul className="space-y-3">
            {data.insurance.map((i) => (
              <li key={i.id} className="rounded-xl bg-bg-warm p-3">
                <p className="text-sm font-medium text-ink">{i.carrier}</p>
                <p className="text-xs text-muted">
                  {i.plan_name} · {i.member_id} · group {i.group_no} · copay ${i.copay}
                </p>
              </li>
            ))}
          </ul>
          <InsuranceForm
            onSave={async (payload) => {
              await saveInsurance({ data: { patientId: p.id, ...payload } });
              toast.success("Coverage saved");
              await reload();
            }}
          />
        </Card>
      ) : null}

      {tab === "Vision Rx" ? (
        <div className="space-y-4">
          {data.rx.map((r) => (
            <Card key={r.id}>
              <p className="text-xs text-subtle">
                {r.exam_date} · {r.doctor_name ?? "Unassigned"}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                <span />
                <span className="text-subtle">Sph</span>
                <span className="text-subtle">Cyl</span>
                <span className="text-subtle">Axis</span>
                <span className="text-subtle">Add</span>
                <span className="text-muted">OD</span>
                <span className="tabular-nums">{r.od_sphere || "—"}</span>
                <span className="tabular-nums">{r.od_cyl || "—"}</span>
                <span className="tabular-nums">{r.od_axis || "—"}</span>
                <span className="tabular-nums">{r.od_add || "—"}</span>
                <span className="text-muted">OS</span>
                <span className="tabular-nums">{r.os_sphere || "—"}</span>
                <span className="tabular-nums">{r.os_cyl || "—"}</span>
                <span className="tabular-nums">{r.os_axis || "—"}</span>
                <span className="tabular-nums">{r.os_add || "—"}</span>
              </div>
              {r.pd ? <p className="mt-2 text-xs text-muted">PD {r.pd}</p> : null}
            </Card>
          ))}
          <RxForm
            onSave={async (payload) => {
              await saveRx({ data: { patientId: p.id, ...payload } });
              toast.success("Rx filed — journey moved to Rx ready");
              await reload();
            }}
          />
        </div>
      ) : null}

      {tab === "Orders" ? (
        <div className="space-y-4">
          {data.orders.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {o.type} {o.frame_name ? `· ${o.frame_name}` : ""}
                </p>
                <p className="text-xs text-muted">{o.lens_type}</p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <select
                  className="h-10 rounded-lg bg-card px-2 text-xs shadow-border"
                  value={o.status}
                  onChange={(e) =>
                    void saveOrder({
                      data: {
                        id: o.id,
                        patientId: p.id,
                        status: e.target.value,
                        type: o.type,
                        frame_name: o.frame_name,
                        lens_type: o.lens_type,
                      },
                    })
                      .then(() => toast.success("Status mailed if an email is on file"))
                      .then(reload)
                  }
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          ))}
          <NewOrder
            onCreate={async (payload) => {
              await saveOrder({ data: { patientId: p.id, ...payload } });
              toast.success("Order opened");
              await reload();
            }}
          />
        </div>
      ) : null}

      {tab === "Journey" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h2 className="mb-3 font-display text-xl">Advance</h2>
            <div className="flex flex-wrap gap-2">
              {JOURNEY_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    void setJourney({ data: { patientId: p.id, stage: s.id } }).then(reload)
                  }
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    p.journey_stage === s.id ? "bg-navy text-navy-fg" : "bg-bg-warm text-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-xl">Trail</h2>
            <ul className="space-y-3">
              {data.journey.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-ink">{e.note || e.stage}</p>
                  <p className="text-xs text-subtle">
                    {format(new Date(e.created_at), "MMM d, h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "Profile" ? (
        <Card data-testid="chart-visits">
          <h2 className="mb-3 font-display text-xl">Visits</h2>
          <ul className="divide-y divide-border">
            {data.appointments.length === 0 ? (
              <li className="py-3 text-sm text-muted">Nothing on the book yet.</li>
            ) : (
              data.appointments.map((a) => (
                <li key={a.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {visitLabel(a.start_at)} · {a.doctor_name ?? "Unassigned"}
                  </span>
                  <span className="text-muted">{a.service}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-subtle">{k}</p>
      <p className="text-sm text-ink">{v || "—"}</p>
    </div>
  );
}

function FamilyForm({
  people,
  onAdd,
}: {
  people: Patient[];
  onAdd: (id: string, rel: string, g: boolean) => Promise<void>;
}) {
  const [related, setRelated] = useState(people[0]?.id ?? "");
  const [rel, setRel] = useState<string>(RELATIONSHIPS[0]);
  const [g, setG] = useState(false);
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
      <select
        className="h-11 rounded-lg bg-card px-3 text-sm shadow-border"
        value={related}
        onChange={(e) => setRelated(e.target.value)}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.last_name}, {p.first_name}
          </option>
        ))}
      </select>
      <select
        className="h-11 rounded-lg bg-card px-3 text-sm shadow-border"
        value={rel}
        onChange={(e) => setRel(e.target.value)}
      >
        {RELATIONSHIPS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-muted">
          <input type="checkbox" checked={g} onChange={(e) => setG(e.target.checked)} />
          Guarantor
        </label>
        <Button
          size="sm"
          disabled={!related}
          onClick={() => void onAdd(related, rel, g)}
        >
          Link
        </Button>
      </div>
    </div>
  );
}

function InsuranceForm({
  onSave,
}: {
  onSave: (v: {
    carrier: string;
    plan_name: string;
    member_id: string;
    group_no: string;
    copay: number;
  }) => Promise<void>;
}) {
  const [carrier, setCarrier] = useState("");
  const [plan, setPlan] = useState("");
  const [member, setMember] = useState("");
  const [group, setGroup] = useState("");
  const [copay, setCopay] = useState("0");
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Carrier">
        <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
      </Field>
      <Field label="Plan">
        <Input value={plan} onChange={(e) => setPlan(e.target.value)} />
      </Field>
      <Field label="Member ID">
        <Input value={member} onChange={(e) => setMember(e.target.value)} />
      </Field>
      <Field label="Group">
        <Input value={group} onChange={(e) => setGroup(e.target.value)} />
      </Field>
      <Field label="Copay">
        <Input value={copay} onChange={(e) => setCopay(e.target.value)} />
      </Field>
      <div className="flex items-end">
        <Button
          disabled={!carrier}
          onClick={() =>
            void onSave({
              carrier,
              plan_name: plan,
              member_id: member,
              group_no: group,
              copay: Number(copay) || 0,
            })
          }
        >
          Add coverage
        </Button>
      </div>
    </div>
  );
}

function RxForm({
  onSave,
}: {
  onSave: (v: {
    exam_date: string;
    od_sphere: string;
    od_cyl: string;
    od_axis: string;
    od_add: string;
    os_sphere: string;
    os_cyl: string;
    os_axis: string;
    os_add: string;
    pd: string;
  }) => Promise<void>;
}) {
  const [f, setF] = useState({
    exam_date: format(new Date(), "yyyy-MM-dd"),
    od_sphere: "",
    od_cyl: "",
    od_axis: "",
    od_add: "",
    os_sphere: "",
    os_cyl: "",
    os_axis: "",
    os_add: "",
    pd: "",
  });
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-xl">New refraction</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["exam_date", "Date"],
            ["od_sphere", "OD sph"],
            ["od_cyl", "OD cyl"],
            ["od_axis", "OD axis"],
            ["od_add", "OD add"],
            ["pd", "PD"],
            ["os_sphere", "OS sph"],
            ["os_cyl", "OS cyl"],
            ["os_axis", "OS axis"],
            ["os_add", "OS add"],
          ] as const
        ).map(([k, lab]) => (
          <Field key={k} label={lab}>
            <Input
              type={k === "exam_date" ? "date" : "text"}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Button onClick={() => void onSave(f)}>File Rx</Button>
    </Card>
  );
}

function NewOrder({
  onCreate,
}: {
  onCreate: (v: {
    type: string;
    frame_name: string;
    lens_type: string;
    status: string;
    patient_total: number;
  }) => Promise<void>;
}) {
  const [type, setType] = useState("Spectacle lens");
  const [frame, setFrame] = useState("");
  const [lens, setLens] = useState("");
  const [total, setTotal] = useState("0");
  return (
    <Card className="grid gap-2 sm:grid-cols-2">
      <Field label="Type">
        <Input value={type} onChange={(e) => setType(e.target.value)} />
      </Field>
      <Field label="Frame">
        <Input value={frame} onChange={(e) => setFrame(e.target.value)} />
      </Field>
      <Field label="Lens">
        <Input value={lens} onChange={(e) => setLens(e.target.value)} />
      </Field>
      <Field label="Patient total">
        <Input value={total} onChange={(e) => setTotal(e.target.value)} />
      </Field>
      <Button
        onClick={() =>
          void onCreate({
            type,
            frame_name: frame,
            lens_type: lens,
            status: "open",
            patient_total: Number(total) || 0,
          })
        }
      >
        Create order
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
