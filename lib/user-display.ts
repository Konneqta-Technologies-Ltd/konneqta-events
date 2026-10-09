import type { User } from "@supabase/supabase-js";

export type UserDisplay = {
  /** Best-effort name: our signup metadata → Google metadata → email. */
  displayName: string;
  /** External avatar URL (e.g. Google photo) or null — uploaded avatars later. */
  avatarUrl: string | null;
  /** First letter (uppercased) for the fallback initial circle. */
  initial: string;
};

/**
 * Resolve what to show for a signed-in user. Shared by the auth panel and
 * the dashboard navbar so both render the same name/avatar.
 */
export function getUserDisplay(user: User | null | undefined): UserDisplay {
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const displayName =
    meta.display_name?.trim() ||
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "";
  const avatarUrl = meta.avatar_url?.trim() || null;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "K";
  return { displayName, avatarUrl, initial };
}
