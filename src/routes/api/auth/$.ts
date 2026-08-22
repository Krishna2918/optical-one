import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { dbSource, isPgliteReady } from "@/lib/db";

function isGetSession(request: Request) {
  const path = new URL(request.url).pathname;
  return path.includes("/get-session");
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        // Cold serverless + embedded Postgres: this instance has no session
        // rows until someone signs in here. Don't compile wasm just to say
        // "signed out" — that was hanging the first paint.
        if (
          isGetSession(request) &&
          dbSource === "pglite" &&
          !isPgliteReady()
        ) {
          return Response.json({ session: null, user: null });
        }
        return auth.handler(request);
      },
      POST: ({ request }) => auth.handler(request),
    },
  },
});
