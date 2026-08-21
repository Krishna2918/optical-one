import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listEmails, sendManualEmail } from "@/lib/server/actions";
import type { EmailRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/inbox")({ component: InboxPage });

function InboxPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [open, setOpen] = useState<EmailRow | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    listEmails().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Outbox</p>
          <h1 className="mt-1 font-display text-4xl text-ink">Mail</h1>
          <p className="mt-2 text-sm text-muted">
            Automatic notes fire on onboarding, bookings, and order status. Everything lands here.
          </p>
        </header>
        <Card className="divide-y divide-border p-0">
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpen(m)}
              className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-bg-warm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{m.subject}</p>
                <p className="truncate text-xs text-muted">
                  {m.to_name || m.to_email} · {m.to_email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="accent">{m.kind}</Badge>
                <span className="text-[11px] tabular-nums text-subtle">
                  {format(new Date(m.sent_at), "MMM d, h:mm a")}
                </span>
              </div>
            </button>
          ))}
        </Card>
        {open ? (
          <Card>
            <p className="text-xs text-subtle">{open.to_email}</p>
            <h2 className="mt-1 font-display text-2xl text-ink">{open.subject}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm text-fg">{open.body}</p>
          </Card>
        ) : null}
      </div>
      <Card className="h-fit space-y-3">
        <h2 className="font-display text-xl">Write</h2>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <Button
          className="w-full"
          disabled={!to || !subject}
          onClick={() =>
            void sendManualEmail({ data: { to_email: to, subject, body } })
              .then(() => {
                toast.success("Sent");
                setTo("");
                setSubject("");
                setBody("");
                return listEmails().then(setRows);
              })
              .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"))
          }
        >
          Send
        </Button>
      </Card>
    </div>
  );
}
