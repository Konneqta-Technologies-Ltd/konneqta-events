"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import SideNav from "./SideNav";
import TopNavbar from "./TopNavbar";

const COLLAPSED_STORAGE_KEY = "sidenav-collapsed";

/**
 * Signed-in app shell: top navbar (nav toggle + display name/avatar +
 * dark mode toggle) above a collapsible sidenav + content row. Owns the
 * sidenav state so the navbar hamburger can drive it:
 *
 * - Desktop (lg+): hamburger collapses/expands the icon rail; the choice
 *   is persisted to localStorage (expanded by default).
 * - Mobile: hamburger opens/closes the overlay drawer (closed by default).
 */
export default function DashboardShell({
  displayName,
  avatarUrl,
  initial,
  role,
  children,
}: {
  displayName: string;
  avatarUrl: string | null;
  initial: string;
  /** "organizer" sees My Events; everyone sees My Registrations. */
  role: "organizer" | "attendee";
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Browser-only state sync after mount (setState inside the timer
  // callback, not the effect body — lint rule: react-hooks/set-state-in-effect).
  useEffect(() => {
    let removeMqListener: (() => void) | undefined;

    const timer = setTimeout(() => {
      try {
        setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
      } catch {
        // localStorage can throw in odd embeds — default expanded.
      }
      const mq = window.matchMedia("(min-width: 1024px)");
      const update = () => setIsDesktop(mq.matches);
      update();
      mq.addEventListener("change", update);
      removeMqListener = () => mq.removeEventListener("change", update);
    }, 0);

    return () => {
      clearTimeout(timer);
      removeMqListener?.();
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Persistence is best-effort.
      }
      return next;
    });
  };

  const handleMenuClick = () => {
    if (isDesktop) toggleCollapsed();
    else setMobileOpen((open) => !open);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
        setSigningOut(false);
        return;
      }
      toast.success("Signed out");
      // Back to the sign-in entry point on /create.
      router.replace("/create");
    } catch {
      // e.g. Supabase not configured — let the user retry.
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNavbar
        onMenuClick={handleMenuClick}
        displayName={displayName}
        avatarUrl={avatarUrl}
        initial={initial}
      />
      <div className="flex flex-1">
        <SideNav
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          role={role}
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
