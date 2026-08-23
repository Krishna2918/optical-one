import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { demoUserFromKind } from "@/lib/demo-session";
import { peekDemoKind } from "@/lib/server/demo";

export const Route = createFileRoute("/care")({
  loader: async () => ({ demoKind: await peekDemoKind() }),
  component: CareLayout,
});

function CareLayout() {
  const { demoKind } = Route.useLoaderData();
  const session = useCurrentUserState();
  const user = session.user ?? (demoKind ? demoUserFromKind(demoKind) : null);
  const isPending = user ? false : session.isPending;
  if (isPending) return <div className="min-h-svh bg-bg" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-svh bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link to="/care">
          <Logo />
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/care">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/care/book">Book</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/care/onboard">Onboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app">Staff</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut("/")}>
            Out
          </Button>
        </nav>
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <Outlet />
      </div>
    </div>
  );
}
