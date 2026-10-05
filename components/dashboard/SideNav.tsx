"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import Spinner from "@/components/ui/Spinner";

/* ── Nav icons ─────────────────────────────────────────────────────────── */

const HOME_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const EVENTS_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const REGISTRATIONS_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

/**
 * Nav items by role — Home for everyone; "My Events" is organizer-only
 * (attendees don't create events); "My Registrations" for everyone, since
 * both roles can attend any event.
 */
function navItems(role: "organizer" | "attendee") {
  const items = [
    { label: "Home", href: "/", icon: HOME_ICON },
    ...(role === "organizer" ? [{ label: "My Events", href: "/events", icon: EVENTS_ICON }] : []),
    {
      label: "My Registrations",
      href: "/events/registrations",
      icon: REGISTRATIONS_ICON,
    },
  ];
  return items;
}

const LOGOUT_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/**
 * Shared nav body — used by both the desktop rail (collapsed/expanded) and
 * the mobile drawer (always expanded). `onNavigate` closes the mobile
 * drawer after a link tap; omitted on desktop.
 */
function SideNavContent({
  collapsed,
  role,
  onNavigate,
  onSignOut,
  signingOut,
}: {
  collapsed: boolean;
  role: "organizer" | "attendee";
  onNavigate?: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
        {navItems(role).map((item) => {
          // "/" is the public landing — exact match only, or it would
          // highlight on every dashboard route.
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-main-orange/10 text-main-orange"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign out — bottom of the nav */}
      <div className="border-t border-border p-3 dark:border-zinc-700">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          title={collapsed ? "Sign out" : undefined}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {signingOut ? (
            <Spinner size="sm" className="shrink-0" />
          ) : (
            <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{LOGOUT_ICON}</span>
          )}
          {!collapsed && <span>{signingOut ? "Signing out..." : "Sign out"}</span>}
        </button>
      </div>
    </>
  );
}

/**
 * Collapsible side navigation.
 *
 * - Desktop (lg+): a static rail beside the content — expanded (w-64) by
 *   default, collapsing to an icon rail (w-[4.5rem]) via the navbar
 *   hamburger. The choice is persisted by DashboardShell (localStorage).
 * - Mobile: closed by default; opens as an overlay drawer with a dark
 *   backdrop. Closes on backdrop click, Escape key, or link tap — the
 *   same interaction pattern as the Konneqta reference project's SideNav.
 */
export default function SideNav({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onSignOut,
  signingOut,
  role,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  role: "organizer" | "attendee";
}) {
  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* ---- Mobile backdrop ---- */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* ---- Mobile drawer (always expanded, slides over content) ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden dark:border-zinc-700 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation menu"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <SideNavContent
          collapsed={false}
          role={role}
          onNavigate={onCloseMobile}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      </aside>

      {/* ---- Desktop rail (static, collapsible to icons) ---- */}
      <aside
        className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 lg:flex dark:border-zinc-700 ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
        aria-label="Dashboard navigation"
      >
        <SideNavContent
          collapsed={collapsed}
          role={role}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      </aside>
    </>
  );
}

