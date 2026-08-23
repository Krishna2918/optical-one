import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { myCare, savePatient } from "@/lib/server/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/care/onboard")({ component: CareOnboard });

const FIELDS = [
  ["first_name", "First name", "text"],
  ["last_name", "Last name", "text"],
  ["email", "Email", "email"],
  ["phone_cell", "Mobile", "tel"],
  ["address1", "Address", "text"],
  ["city", "City", "text"],
  ["postal", "Postal", "text"],
  ["dob", "Birth date", "date"],
] as const;

function CareOnboard() {
  const navigate = useNavigate();
  const [id, setId] = useState<string | undefined>();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_cell: "",
    address1: "",
    city: "",
    postal: "",
    dob: "",
    phipa_consent: false,
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    myCare()
      .then((c) => {
        if (!live || !c.patient) return;
        setId(c.patient.id);
        setForm({
          first_name: c.patient.first_name,
          last_name: c.patient.last_name,
          email: c.patient.email,
          phone_cell: c.patient.phone_cell,
          address1: c.patient.address1,
          city: c.patient.city,
          postal: c.patient.postal,
          dob: c.patient.dob ?? "",
          phipa_consent: c.patient.phipa_consent,
        });
      })
      .catch((e: unknown) => {
        if (live) toast.error(e instanceof Error ? e.message : "Could not load your chart");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!form.phipa_consent) {
      toast.error("PHIPA consent is required");
      return;
    }
    setBusy(true);
    try {
      await savePatient({
        data: {
          id,
          ...form,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          completeOnboarding: true,
        },
      });
      toast.success("Chart saved — welcome mail sent");
      await navigate({ to: "/care" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-bg-warm" />;
  }

  return (
    <Card className="space-y-4">
      <h1 className="font-display text-3xl text-ink">Your details</h1>
      <p className="text-sm text-muted">
        Four minutes. Completing this step emails a welcome note and marks your journey Ready.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(([k, lab, type]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`care-${k}`}>{lab}</Label>
            <Input
              id={`care-${k}`}
              type={type}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <label htmlFor="care-phipa" className="flex items-start gap-2 text-sm">
        <input
          id="care-phipa"
          type="checkbox"
          className="mt-1 size-4"
          checked={form.phipa_consent}
          onChange={(e) => setForm({ ...form, phipa_consent: e.target.checked })}
        />
        I consent to PHIPA use of this information for care and recall.
      </label>
      <Button
        type="button"
        data-testid="care-save"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? "Saving…" : "Save and continue"}
      </Button>
    </Card>
  );
}
