import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { myCare, savePatient } from "@/lib/server/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/care/onboard")({ component: CareOnboard });

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

  useEffect(() => {
    myCare().then((c) => {
      if (!c.patient) return;
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
    });
  }, []);

  return (
    <Card className="space-y-4">
      <h1 className="font-display text-3xl text-ink">Your details</h1>
      <p className="text-sm text-muted">
        Four minutes. Completing this step emails a welcome note and marks your journey Ready.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["first_name", "First name"],
            ["last_name", "Last name"],
            ["email", "Email"],
            ["phone_cell", "Mobile"],
            ["address1", "Address"],
            ["city", "City"],
            ["postal", "Postal"],
            ["dob", "Birth date"],
          ] as const
        ).map(([k, lab]) => (
          <div key={k} className="space-y-1.5">
            <Label>{lab}</Label>
            <Input
              type={k === "dob" ? "date" : k === "email" ? "email" : "text"}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.phipa_consent}
          onChange={(e) => setForm({ ...form, phipa_consent: e.target.checked })}
        />
        I consent to PHIPA use of this information for care and recall.
      </label>
      <Button
        disabled={busy || !form.first_name || !form.last_name || !form.phipa_consent}
        onClick={() => {
          setBusy(true);
          void savePatient({
            data: { id, ...form, completeOnboarding: true },
          })
            .then(() => {
              toast.success("Chart saved — welcome mail sent");
              return navigate({ to: "/care" });
            })
            .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Saving…" : "Save and continue"}
      </Button>
    </Card>
  );
}
