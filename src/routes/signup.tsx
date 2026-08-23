import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/app" });
  }, [isPending, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: name || email.split("@")[0] || "Owner",
      });
      if (error) throw new Error(error.message ?? "Could not create account");
      try {
        await authClient.getSession();
      } catch {
        /* session store recovers on next fetch */
      }
      toast.success("Practice workspace is ready");
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          <h1 className="font-display text-4xl text-ink">Open a practice</h1>
          <p className="mt-2 text-sm text-muted">
            First account becomes owner and seeds a working Optical One demo —
            doctors, patients, and a 2:00 booking that opens 1:00 and 3:00.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create workspace"}
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
            Already have access?{" "}
            <Link to="/login" className="text-accent underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/images/hero-boutique.jpg"
          alt="Optical boutique"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/35" />
      </section>
    </main>
  );
}
