import { createFileRoute } from "@tanstack/react-router";
import { demoAccount } from "@/lib/demo";
import { demoCookieLine, parseDemoKind } from "@/lib/demo-session";

function isHttps(request: Request) {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  const forwarded = request.headers.get("x-forwarded-proto");
  return forwarded?.split(",")[0]?.trim() === "https";
}

export const Route = createFileRoute("/api/demo")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const kind = parseDemoKind(url.searchParams.get("kind")) ?? "owner";
        const dest = demoAccount(kind).dest;
        return new Response(null, {
          status: 302,
          headers: {
            Location: dest,
            "Set-Cookie": demoCookieLine(kind, isHttps(request)),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
