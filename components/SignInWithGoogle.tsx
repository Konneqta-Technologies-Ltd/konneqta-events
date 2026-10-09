'use client';

import { GoogleIcon } from './GoogleIcon';
import Spinner from './ui/Spinner';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

/**
 * Auth card Google button — full-width bordered button that mirrors the
 * form inputs (border-zinc-700 dark:border-white/50, rounded-xl) and is
 * dark-mode aware. Ported from the Konneqta reference project ("auth"
 * variant) — the events app doesn't need the homepage "hero" variant.
 */
const AUTH_CLASSES =
  'flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/50 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800';
      
export default function SignInWithGoogle({
  label = 'Sign in with Google',
  next,
}: {
  label?: string;
  /** Path to resume on after the OAuth callback (open-redirect-safe: callers pass site-relative paths). */
  next?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    // Created here (not at render time) so prerendering/static generation
    // never needs the Supabase env vars — and createBrowserClient
    // memoizes, so this shares the singleton instance.
    const supabase = createClient();
    setLoading(true);
    try {
      const callback = next && next.startsWith('/')
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : `${window.location.origin}/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback,
        },
      });
    } catch {
      // If the OAuth redirect fails (rare), reset so the user can retry.
      setLoading(false);
    }
    // Note: on success the browser navigates away, so we intentionally
    // do NOT setLoading(false) in a finally block — that would flicker
    // the button back to idle right before the redirect fires.
  }

  return (
    <button className={AUTH_CLASSES} onClick={handleSignIn} disabled={loading}>
      {loading ? <Spinner size="sm" className="" /> : <GoogleIcon />}
      {loading ? 'Redirecting…' : label}
    </button>
  );
}
