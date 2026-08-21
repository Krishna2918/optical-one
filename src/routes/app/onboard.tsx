import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { savePatient } from "@/lib/server/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/onboard")({ component: OnboardPage });

const STEPS = ["Identity", "Contact", "Coverage", "Consent"];

function OnboardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    first_name: "",
    last_name: "",
    sex: "",
    dob: "",
    email: "",
    phone_cell: "",
    phone_home: "",
    address1: "",
    city: "",
    province: "ON",
    postal: "",
    employer: "",
    health_card: "",
    notes: "",
    phipa_consent: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function finish() {
    if (!form.first_name || !form.last_name) {
      toast.error("First and last name are required");
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const res = await savePatient({
        data: { ...form, completeOnboarding: true },
      });
      toast.success(`Chart #${res.patient_no} opened — welcome mail queued`);
      await navigate({ to: "/app/patients/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          Client onboarding
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">New chart</h1>
      </header>
      <ol className="flex gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex-1 rounded-full px-2 py-1 text-center text-[11px] ${
              i === step ? "bg-navy text-navy-fg" : i < step ? "bg-accent-soft text-accent" : "bg-bg-warm text-subtle"
            }`}
          >
            {s}
          </li>
        ))}
      </ol>
      <Card className="space-y-4">
        {step === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Sex">
              <Input value={form.sex} onChange={(e) => set("sex", e.target.value)} />
            </Field>
            <Field label="First name">
              <Input required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </Field>
            <Field label="Birth date">
              <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input value={form.phone_cell} onChange={(e) => set("phone_cell", e.target.value)} />
            </Field>
            <Field label="Home">
              <Input value={form.phone_home} onChange={(e) => set("phone_home", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={form.address1} onChange={(e) => set("address1", e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Postal">
              <Input value={form.postal} onChange={(e) => set("postal", e.target.value)} />
            </Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employer">
              <Input value={form.employer} onChange={(e) => set("employer", e.target.value)} />
            </Field>
            <Field label="Health card">
              <Input value={form.health_card} onChange={(e) => set("health_card", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-fg">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={form.phipa_consent}
                onChange={(e) => set("phipa_consent", e.target.checked)}
              />
              Patient consents to PHIPA collection and use of this chart for care, billing, and recall.
            </label>
            <p className="text-sm text-muted">
              Completing this step marks the journey as Ready and sends a welcome email if an address is on file.
            </p>
          </div>
        ) : null}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={() => void finish()} disabled={busy || !form.phipa_consent}>
              {busy ? "Saving…" : "Open chart"}
            </Button>
          )}
        </div>
      </Card>
    </div>
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
