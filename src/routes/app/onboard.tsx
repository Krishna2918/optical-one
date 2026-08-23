import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { savePatient } from "@/lib/server/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/onboard")({ component: OnboardPage });

const STEPS = [
  { id: 0, label: "Identity", hint: "Name and date of birth" },
  { id: 1, label: "Contact", hint: "How we reach them" },
  { id: 2, label: "Coverage", hint: "Work and health card" },
  { id: 3, label: "Consent", hint: "PHIPA before the chart opens" },
] as const;

const TITLES = ["", "Mr", "Ms", "Mrs", "Miss", "Mx", "Dr"];
const SEXES = ["", "Female", "Male", "Non-binary", "Prefer not to say"];

const selectClass =
  "flex h-11 w-full rounded-lg bg-card px-3 text-sm text-fg shadow-border outline-none transition-[box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-accent/35";

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

  function identityOk() {
    return Boolean(form.first_name.trim() && form.last_name.trim());
  }

  function go(next: number) {
    if (next > 0 && !identityOk()) {
      toast.error("First and last name are required");
      setStep(0);
      return;
    }
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  }

  async function finish() {
    if (!identityOk()) {
      toast.error("First and last name are required");
      setStep(0);
      return;
    }
    if (!form.phipa_consent) {
      toast.error("PHIPA consent is required to open the chart");
      setStep(3);
      return;
    }
    setBusy(true);
    try {
      const res = await savePatient({
        data: {
          ...form,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          completeOnboarding: true,
        },
      });
      toast.success(`Chart #${res.patient_no} opened — welcome mail queued`);
      await navigate({ to: "/app/patients/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32 lg:pb-0">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          Client onboarding
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">New chart</h1>
        <p className="mt-2 text-sm text-muted">
          Step {step + 1} of {STEPS.length} — {STEPS[step].hint}
        </p>
      </header>

      <ol className="flex gap-2">
        {STEPS.map((s) => (
          <li key={s.id} className="flex-1">
            <button
              type="button"
              data-testid={`onboard-step-${s.label}`}
              onClick={() => go(s.id)}
              className={cn(
                "w-full rounded-full px-2 py-2 text-center text-[11px] font-medium transition-colors",
                s.id === step
                  ? "bg-navy text-navy-fg"
                  : s.id < step
                    ? "bg-accent-soft text-accent"
                    : "bg-bg-warm text-subtle",
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <Card className="space-y-4">
        {step === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ob-title" label="Title">
              <select
                id="ob-title"
                className={selectClass}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              >
                {TITLES.map((t) => (
                  <option key={t || "none"} value={t}>
                    {t || "—"}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="ob-sex" label="Sex">
              <select
                id="ob-sex"
                className={selectClass}
                value={form.sex}
                onChange={(e) => set("sex", e.target.value)}
              >
                {SEXES.map((t) => (
                  <option key={t || "none"} value={t}>
                    {t || "—"}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="ob-first" label="First name">
              <Input
                id="ob-first"
                required
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
              />
            </Field>
            <Field id="ob-last" label="Last name">
              <Input
                id="ob-last"
                required
                autoComplete="family-name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
              />
            </Field>
            <Field id="ob-dob" label="Birth date">
              <Input
                id="ob-dob"
                type="date"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ob-email" label="Email">
              <Input
                id="ob-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field id="ob-mobile" label="Mobile">
              <Input
                id="ob-mobile"
                autoComplete="tel"
                value={form.phone_cell}
                onChange={(e) => set("phone_cell", e.target.value)}
              />
            </Field>
            <Field id="ob-home" label="Home">
              <Input
                id="ob-home"
                value={form.phone_home}
                onChange={(e) => set("phone_home", e.target.value)}
              />
            </Field>
            <Field id="ob-address" label="Address">
              <Input
                id="ob-address"
                autoComplete="street-address"
                value={form.address1}
                onChange={(e) => set("address1", e.target.value)}
              />
            </Field>
            <Field id="ob-city" label="City">
              <Input
                id="ob-city"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field id="ob-province" label="Province">
              <Input
                id="ob-province"
                autoComplete="address-level1"
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
              />
            </Field>
            <Field id="ob-postal" label="Postal">
              <Input
                id="ob-postal"
                autoComplete="postal-code"
                value={form.postal}
                onChange={(e) => set("postal", e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="ob-employer" label="Employer">
              <Input
                id="ob-employer"
                value={form.employer}
                onChange={(e) => set("employer", e.target.value)}
              />
            </Field>
            <Field id="ob-health" label="Health card">
              <Input
                id="ob-health"
                value={form.health_card}
                onChange={(e) => set("health_card", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="ob-notes" label="Notes">
                <Textarea
                  id="ob-notes"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <label htmlFor="ob-phipa" className="flex items-start gap-3 text-sm text-fg">
              <input
                id="ob-phipa"
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
      </Card>

      <div className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:bottom-auto lg:z-auto lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="mx-auto flex max-w-2xl justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            data-testid="onboard-back"
            disabled={step === 0 || busy}
            onClick={() => go(step - 1)}
          >
            Back
          </Button>
          {last ? (
            <Button
              type="button"
              data-testid="onboard-open"
              onClick={() => void finish()}
              disabled={busy}
            >
              {busy ? "Saving…" : "Open chart"}
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="onboard-continue"
              disabled={busy}
              onClick={() => go(step + 1)}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
