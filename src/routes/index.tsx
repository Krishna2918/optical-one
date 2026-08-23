import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Mail, Route as RouteIcon, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { DemoLaunch, HeaderDemoButton } from "@/components/demo-launch";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

const pillars = [
  {
    icon: CalendarClock,
    title: "Cluster booking",
    body: "A 2:00 visit opens 1:00 and 3:00. The day fills from the middle out — no orphan slots at 9 and 4.",
  },
  {
    icon: RouteIcon,
    title: "One journey",
    body: "Lead to paid, with lab statuses that actually match the tray. Everyone sees the same stage.",
  },
  {
    icon: Users,
    title: "Three portals",
    body: "Admin, staff, and patient — same chart, different doors. Family, insurance, and Rx travel together.",
  },
  {
    icon: Mail,
    title: "Mail that sends",
    body: "Onboarding, confirmations, and “ready to call” go out the moment the status moves.",
  },
];

function Home() {
  const { user, isPending } = useCurrentUserState();
  const inApp = !isPending && user;

  return (
    <div className="min-h-svh bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {inApp ? (
            <Button asChild size="sm">
              <Link to="/app">Open practice</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <HeaderDemoButton />
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
              Practice OS for optical
            </p>
            <h1 className="mt-4 max-w-xl font-display text-5xl text-ink sm:text-6xl">
              The book your doctors actually share.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted">
              Lumen replaces the beige Windows desk with a calm, multi-doctor
              practice — time-clustered booking, a living patient journey, and
              portals for the floor, the owner, and the family.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {inApp ? (
                <Button size="lg" asChild>
                  <Link to="/app">
                    Continue to the floor
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <HeaderDemoButton size="lg" />
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
            {inApp ? null : (
              <p className="mt-4 text-sm text-muted">
                Or{" "}
                <Link to="/signup" className="text-accent underline-offset-4 hover:underline">
                  create a practice
                </Link>
              </p>
            )}
          </div>
          <figure className="overflow-hidden rounded-2xl shadow-lift">
            <img
              src="/images/hero-boutique.jpg"
              alt="Quiet optical boutique with walnut millwork"
              className="aspect-4/3 w-full object-cover sm:aspect-16/10"
            />
          </figure>
        </section>

        {inApp ? null : (
          <section className="border-t border-border bg-surface">
            <div className="mx-auto max-w-6xl px-5 py-12">
              <DemoLaunch />
            </div>
          </section>
        )}

        <section className="border-t border-border bg-bg-warm/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <article key={p.title}>
                <p.icon className="size-5 text-accent" strokeWidth={1.6} />
                <h2 className="mt-4 font-display text-2xl text-ink">{p.title}</h2>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl shadow-border">
            <img
              src="/images/still-frames.jpg"
              alt="Frames beside an appointment book"
              className="aspect-4/3 w-full object-cover"
            />
          </figure>
          <div className="flex flex-col justify-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
              How the book fills
            </p>
            <h2 className="mt-3 font-display text-4xl text-ink">
              First visit at two. Neighbors open at one and three.
            </h2>
            <p className="mt-4 text-muted">
              Empty days stay flexible — any hour can take the first booking.
              After that, Lumen only opens the hour before and the hour after
              each visit. The schedule clusters, doctors stay busy, and the
              waiting room stays quiet.
            </p>
            <ol className="mt-6 space-y-3 text-sm text-fg">
              <li className="flex gap-3">
                <span className="font-mono text-subtle">01</span>
                Register every doctor with their own color, hours, and slot length.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-subtle">02</span>
                Book the first patient wherever they asked — say 2:00.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-subtle">03</span>
                1:00 and 3:00 unlock. Distant hours stay closed until the cluster reaches them.
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-subtle">
        Lumen — practice software for optical, built to replace the old desk.
      </footer>
    </div>
  );
}
