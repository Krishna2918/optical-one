import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { DemoLaunch } from "@/components/demo-launch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_PATIENT, DEMO_STAFF } from "@/lib/demo";
import { ensureDemoAccounts } from "@/lib/server/demo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(DEMO_STAFF.email);
  const [password, setPassword] = useState<string>(DEMO_STAFF.password);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/app" });
  }, [isPending, user, navigate]);

  useEffect(() => {
    void ensureDemoAccounts().catch(() => undefined);
  }, []);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await ensureDemoAccounts();
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? "Could not sign in");
      toast.success("Welcome back");
      await navigate({
        to: email.toLowerCase() === DEMO_PATIENT.email ? "/care" : "/app",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/images/exam-lane.jpg"
          alt="Exam lane"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-navy/50" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-3xl text-navy-fg">
          One book. Every doctor. A quieter front desk.
        </p>
      </section>
      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          <h1 className="font-display text-4xl text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Demo is filled in. Enter the floor, or walk in as a patient.
          </p>

          <DemoLaunch className="mt-8" />

          <form onSubmit={onEmail} className="mt-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-subtle">
              Or continue with these credentials
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="text"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                spellCheck={false}
              />
            </div>
            <Button type="submit" className="w-full" variant="navy" disabled={busy}>
              {busy ? "Signing in…" : "Continue with email"}
            </Button>
          </form>

          {authEnabled ? (
            <div className="mt-6 space-y-2">
              <p className="text-center text-xs uppercase tracking-widest text-subtle">
                or
              </p>
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void signIn(p.providerId, { callbackURL: "/app" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          ) : null}
          <p className="mt-8 text-sm text-muted">
            New practice?{" "}
            <Link to="/signup" className="text-accent underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
