import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh (Next 16 renamed Middleware → Proxy; same pattern as the
 * Konneqta reference project's proxy.ts). Calling auth.getUser() here
 * refreshes the auth cookies on matched requests so Server Components can
 * always read a valid session.
 *
 * There are no protected routes yet — auth lives inline on the public
 * /create page, so no redirects are performed here.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fresh clone before .env.local is filled in — pass through untouched so
  // the rest of the app keeps working without Supabase configured.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes auth cookies when needed; the result isn't used yet.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
