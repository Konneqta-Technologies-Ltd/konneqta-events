# Konneqta Events

A simple event management application — an extension of Konneqta, the platform for digital business card generation. Discover events happening around you, or create and share your own in minutes.

## Features

- **Tour events** — a public, searchable listing of published events: text search, category / type / city filters, a when-window, and pagination. Every filtered view is a shareable URL.
- **Create event wizard** — a 6-step flow (Basic Information → Date, Time & Location → Registration → Tickets → Event Details → Review & Publish) with per-step validation, cover image uploads, and drafts you can resume any time.
- **Public event pages** — every published event gets a shareable `/e/<id>` page: banner, schedule, venue or stream details, tickets, the Step-5 content (audience, what to expect, dress code, accessibility, age limits), per-event SEO/OG metadata, and a copy-link share button. Owners can preview unpublished drafts on the same URL.
- **Guest registration** — no account needed to register: name, email, a ticket choice, and the organizer's custom questions (short/long answer, email, phone, number, dropdown, multiple choice, checkbox). Email is the identity anchor — capacity limits, registration windows, manual approval, and duplicate prevention are all enforced atomically by a Postgres RPC, and a registration made as a guest automatically links to the account created later with the same email.
- **Two account types** — at signup you pick Attendee (discover & register) or Organizer (create & manage). Both can register for any event; organizers also get the My Events dashboard. Attendees get My Registrations — their registrations across all events, with status and self-service cancel — and can switch to organizer any time with one click.
- **Organizer tools** — a registrations dashboard per event (`/events/<id>/registrations`) with counts vs capacity, status filters, approve/reject for manual-approval events, custom-answer review, and CSV export; plus event lifecycle actions: edit, unpublish, and cancel/restore.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, React 19, TypeScript)
- [Supabase](https://supabase.com) — Postgres, Auth (email + Google), storage, row-level security, RPCs
- [Tailwind CSS v4](https://tailwindcss.com) + a manual black & white (dark) mode
- [Joi](https://joi.dev) for form validation, [Sonner](https://sonner.emilkowal.ski) for toasts
- [Vitest](https://vitest.dev) for unit tests

## Getting started

### 1. Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io) (`corepack enable`)
- A Supabase project (free tier works)

### 2. Environment

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project (**Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and run it. The file is safe to re-run — everything is guarded with `if not exists` / `or replace` / `drop policy if exists` — so re-running it after pulling changes applies new sections.

It creates:

- `profiles` (auto-created per user by a trigger, with an `attendee`/`organizer` role), `events`, `event_tickets`, `event_registrations`
- RLS policies so owners only see/edit their own events and registrations — published events are public **only through the views** below, never the raw tables
- The `register_attendee` RPC — the single, race-free entry point for registrations (capacity, windows, approval, duplicates; works with or without an account)
- The public-copy views: `published_events_public` and `published_event_tickets` (what visitors may see), plus `event_registration_stats` and `my_event_registrations` (the caller's own registrations)
- The `get_event_join_details` RPC — meeting link/ID, returned only to approved attendees
- The `avatars` and `event-covers` storage buckets with owner-scoped write policies

### 4. Auth providers

Email/password works out of the box. For Google sign-in, add a Google provider under **Authentication → Providers** and add `http://localhost:3000/auth/callback` (and your production callback) to the authorized redirect URLs.

### 5. Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts:

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint (next config) |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests / watch mode |

CI (`.github/workflows/ci.yml`) runs lint, type-check, tests, and a build on every push/PR to `main` and `dev`.

## Project structure

```
app/
  page.tsx                     # Landing page
  tour/                        # Public event listing (search, filters, pagination)
  e/[id]/                      # Public event page + registration (draft preview for owners)
  create/                      # Inline auth (email + Google, attendee/organizer role picker)
  events/                      # Signed-in dashboard (auth-gated layout)
    page.tsx                   # My Events — organizer dashboard (drafts + published, lifecycle actions)
    registrations/             # My Registrations — attendee dashboard
    create/                    # The 6-step create wizard (organizer-gated; attendees get the upgrade prompt)
    [id]/registrations/        # Organizer registrations view (approve/reject/CSV)
  sitemap.ts                   # Static pages + live events
components/
  AuthPanel.tsx                # Login/signup card (role picker, ?next= redirects)
  events/                      # Cards + the wizard + registration + organizer tables
  tour/TourFilters.tsx         # URL-driven filter bar
  dashboard/                   # Shell, sidenav, topnavbar, BecomeOrganizer
lib/
  events/                      # Types, row mappers, validation, registration form logic
  supabase/                    # Browser + server clients
  dates.ts                     # Shared date helpers
supabase/
  schema.sql                   # The whole database schema (run in the SQL editor)
```

## Deployment

The easiest path is [Vercel](https://vercel.com) — set the three environment variables above for the project (with `NEXT_PUBLIC_SITE_URL` pointed at your domain) and deploy. After deploying, apply any new `schema.sql` sections to your Supabase project as described above.

## Known limitations

- **Payments** — tickets are RSVP-style selections; no payment collection is wired up yet.
- **Konneqta integration** — the business-card tie-in (event links on cards, attendee networking) is planned but not built yet.
- **Guest cancellations** — a guest (no account) changes or cancels through the organizer; once they sign up with the same email, their registrations appear under My Registrations with full self-service.

