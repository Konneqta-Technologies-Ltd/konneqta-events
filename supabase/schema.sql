-- ─────────────────────────────────────────────────────────────────────────
-- Konneqta Events — initial Supabase schema
--
-- Run once in the NEW Supabase project: SQL Editor → New query → paste → Run.
--
-- Mirrors the signup flow in components/AuthPanel.tsx: the app sends
-- first_name / last_name / display_name as signup metadata, and Google
-- OAuth supplies its own name/avatar — handle_new_user() copies all of it
-- into public.profiles so every user has a row from day one.
-- Safe to re-run (everything is guarded with if-not-exists / or-replace).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Profiles — one row per auth user.
create table if not exists public.profiles (
    id           uuid primary key references auth.users (id) on delete cascade,
    email        text,
    first_name   text,
    last_name    text,
    display_name text,
    avatar_url   text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- 2. Row Level Security — users can only see/edit their own profile.
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- 3. Keep updated_at current on edits.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- 4. Auto-create a profile whenever a user signs up (email or Google).
--    SECURITY DEFINER lets the trigger write to public.profiles during the
--    auth.users insert, which runs outside the user's own RLS context.
--    Email signups send first_name/last_name/display_name metadata;
--    Google sends full_name/name/avatar_url.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, first_name, last_name, display_name, avatar_url)
    values (
        new.id,
        new.email,
        nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), ''),
        nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), ''),
        coalesce(
            nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
            split_part(new.email, '@', 1)
        ),
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Avatars storage bucket — public READ, owner-only WRITE (RLS).
--    Path convention: <user_id>/avatar.ext
--
--    Note: Google OAuth signups already carry an external avatar URL in
--    profiles.avatar_url (no bucket involved). This bucket is for
--    user-uploaded avatars later (e.g. profile settings). Policies follow
--    the hardened owner-scoped pattern from the Konneqta reference project:
--    public URL reads are served by the bucket's public flag — RLS gates
--    listing/writes to the owner's folder only.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Owner-scoped listing (blocks bucket-wide enumeration by other users).
drop policy if exists "Users can list own avatars" on storage.objects;
create policy "Users can list own avatars" on storage.objects for
select to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped upload: <user_id>/avatar.ext
drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars" on storage.objects for
insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped update/replace.
drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars" on storage.objects for
update to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped delete.
drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars" on storage.objects for
delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);


-- ─────────────────────────────────────────────────────────────────────────
-- 7. Events — one row per event, drafts included.
--
-- The create-event wizard (app/events/create/[step]) writes to this table
-- as the user moves through the 6-step flow; "Save as draft" persists
-- partial data (status = 'draft') so an event can be resumed or edited
-- later from My Events. Step 1 "Basic Information" owns the columns
-- below — later steps will add their own.
--
-- Note: category is app-validated (lib/events/constants.ts) rather than
-- CHECK-constrained so the list can grow without a migration; event_type
-- is a stable 3-value enum and stays constrained here.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
    id              uuid primary key default gen_random_uuid(),
    owner_id        uuid not null references auth.users (id) on delete cascade,
    status          text not null default 'draft'
                    check (status in ('draft', 'published')),
    current_step    int  not null default 1 check (current_step between 1 and 6),

    -- Step 1 — Basic Information
    name            text,
    theme           text,
    description     text,
    category        text,
    category_other  text,
    event_type      text check (event_type in ('in_person', 'online', 'hybrid')),
    cover_image_url text,
    hashtags        text[] not null default '{}',

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists events_owner_id_idx on public.events (owner_id);

-- Row Level Security — owners see and edit only their own events.
alter table public.events enable row level security;

drop policy if exists "Owners can view own events" on public.events;
create policy "Owners can view own events"
    on public.events for select
    using (auth.uid() = owner_id);

drop policy if exists "Owners can insert own events" on public.events;
create policy "Owners can insert own events"
    on public.events for insert
    with check (auth.uid() = owner_id);

drop policy if exists "Owners can update own events" on public.events;
create policy "Owners can update own events"
    on public.events for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete own events" on public.events;
create policy "Owners can delete own events"
    on public.events for delete
    using (auth.uid() = owner_id);

-- Keep updated_at current on edits (reuses the trigger function above).
drop trigger if exists on_event_updated on public.events;
create trigger on_event_updated
    before update on public.events
    for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Event covers storage bucket — public READ, owner-only WRITE (RLS).
--    Path convention: <user_id>/<event_id>/cover.ext
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

-- Owner-scoped listing (blocks bucket-wide enumeration by other users).
drop policy if exists "Users can list own event covers" on storage.objects;
create policy "Users can list own event covers" on storage.objects for
    select to authenticated using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped upload: <user_id>/<event_id>/cover.ext
drop policy if exists "Users can upload own event covers" on storage.objects;
create policy "Users can upload own event covers" on storage.objects for
    insert to authenticated with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped update/replace.
drop policy if exists "Users can update own event covers" on storage.objects;
create policy "Users can update own event covers" on storage.objects for
    update to authenticated using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
) with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-scoped delete.
drop policy if exists "Users can delete own event covers" on storage.objects;
create policy "Users can delete own event covers" on storage.objects for
    delete to authenticated using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
);


-- ─────────────────────────────────────────────────────────────────────────
-- 9. Events — Step 2 "Date, Time & Location" columns.
--
--    Dates/times/time zone are stored exactly as the form round-trips
--    them (date / time / IANA zone name). streaming_outlets is a jsonb
--    array of { platform, link } rows for multi-platform broadcasts.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.events
    add column if not exists start_date        date,
    add column if not exists end_date          date,
    add column if not exists start_time        time,
    add column if not exists end_time          time,
    add column if not exists timezone          text,
    add column if not exists venue_name        text,
    add column if not exists venue_address     text,
    add column if not exists venue_city        text,
    add column if not exists venue_country     text,
    add column if not exists map_location      text,
    add column if not exists platform          text,
    add column if not exists meeting_link      text,
    add column if not exists meeting_id        text,
    add column if not exists streaming_outlets jsonb not null default '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. Events — Step 3 "Registration" columns.
--
--     Status / capacity / approval drive how the public side behaves
--     later; attendee_questions is a jsonb array of
--     { id, label, answerType, required, options } custom form questions
--     (first name / last name / email are always collected and are never
--     stored here).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.events
    add column if not exists registration_status text
        check (registration_status in ('open', 'scheduled', 'closed'))
        default 'open',
    add column if not exists registration_opens  date,
    add column if not exists registration_closes date,
    add column if not exists capacity_type      text
        check (capacity_type in ('unlimited', 'limited'))
        default 'unlimited',
    add column if not exists max_attendees      int check (max_attendees > 0),
    add column if not exists approval_type      text
        check (approval_type in ('automatic', 'manual'))
        default 'automatic',
    add column if not exists attendee_questions jsonb not null default '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. Standard table grants.
--
--     The tables above were created through a connection that doesn't
--     carry Supabase's default privileges (the SQL editor does), leaving
--     anon/authenticated/service_role with NO table access — every client
--     request failed with "permission denied for table events" (surfaced
--     as HTTP 401 on inserts). RLS still scopes row access; these GRANTs
--     only restore the standard role privileges.
-- ─────────────────────────────────────────────────────────────────────────
grant all on public.profiles to anon, authenticated, service_role;
grant all on public.events  to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────
-- 12. Event tickets — Step 4 "Tickets".
--
--     One row per ticket type (General Admission, VIP, Student …); the
--     create-event wizard syncs these on every save. price/currency/
--     sales window are payments-ready even though the MVP only creates
--     free tickets — an "early bird" is simply a cheaper ticket whose
--     sales window closes earlier. Form-derived columns stay nullable
--     so partial drafts can persist (same philosophy as public.events).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.event_tickets (
    id           uuid primary key default gen_random_uuid(),
    event_id     uuid not null references public.events (id) on delete cascade,
    name         text,
    description  text,
    price        numeric(10, 2) not null default 0 check (price >= 0),
    currency     char(3) not null default 'NGN',
    quantity     int check (quantity is null or quantity > 0),
    sales_start  date,
    sales_end    date,
    status       text not null default 'active'
                 check (status in ('active', 'hidden', 'paused')),
    sort_order   int not null default 0,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists event_tickets_event_id_idx on public.event_tickets (event_id);

-- Row Level Security — owners manage only their own events' tickets.
alter table public.event_tickets enable row level security;

drop policy if exists "Owners can view own event tickets" on public.event_tickets;
create policy "Owners can view own event tickets"
    on public.event_tickets for select
    using (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.owner_id = auth.uid()
    ));

drop policy if exists "Owners can insert own event tickets" on public.event_tickets;
create policy "Owners can insert own event tickets"
    on public.event_tickets for insert
    with check (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.owner_id = auth.uid()
    ));

drop policy if exists "Owners can update own event tickets" on public.event_tickets;
create policy "Owners can update own event tickets"
    on public.event_tickets for update
    using (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.owner_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.owner_id = auth.uid()
    ));

drop policy if exists "Owners can delete own event tickets" on public.event_tickets;
create policy "Owners can delete own event tickets"
    on public.event_tickets for delete
    using (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.owner_id = auth.uid()
    ));

-- Keep updated_at current on edits (reuses the trigger function above).
drop trigger if exists on_event_ticket_updated on public.event_tickets;
create trigger on_event_ticket_updated
    before update on public.event_tickets
    for each row execute function public.set_updated_at();

-- Standard role privileges (see section 11).
grant all on public.event_tickets to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────
-- 13. Events — Step 5 "Event Details" columns.
--
--     The content that makes the public event page richer: audience,
--     expectations, requirements, dress code, accessibility options and
--     the age requirement. Values are app-validated (constants.ts) like
--     category, and stay nullable so partial drafts persist.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.events
    add column if not exists who_should_attend      text,
    add column if not exists what_to_expect         text,
    add column if not exists requirements           text,
    add column if not exists dress_code             text,
    add column if not exists accessibility          text[] not null default '{}',
    add column if not exists additional_info        text,
    add column if not exists age_restriction        text,
    add column if not exists age_restriction_custom text;


-- ─────────────────────────────────────────────────────────────────────────
-- 14. Public read access — the Tour page.
--
--     Anyone (signed-out visitors included) can browse published events
--     and the tickets belonging to them; drafts and unpublished work
--     stay visible to their owner only via the owner policies above.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "Anyone can view published events" on public.events;
create policy "Anyone can view published events"
    on public.events for select
    using (status = 'published');

drop policy if exists "Anyone can view tickets of published events" on public.event_tickets;
create policy "Anyone can view tickets of published events"
    on public.event_tickets for select
    using (exists (
        select 1 from public.events e
        where e.id = event_tickets.event_id and e.status = 'published'
    ));


-- ─────────────────────────────────────────────────────────────────────────
-- 15. Events — cancellation support.
--
--     `cancelled_at` marks an event as called off while it stays published
--     (direct links keep working, a banner explains what happened, and the
--     register_attendee RPC refuses new registrations). Unpublishing is a
--     different action — it flips status back to 'draft' and removes the
--     event from Tour entirely. Nullable = not cancelled; reversible by
--     setting the column back to null.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.events
    add column if not exists cancelled_at timestamptz;


-- ─────────────────────────────────────────────────────────────────────────
-- 16. Event registrations — one row per attendee per event.
--
--     Written exclusively by the public.register_attendee RPC (section 17):
--     there is deliberately NO insert policy, so capacity and registration
--     windows can only be enforced in one race-free place. Attendees can
--     read and cancel their own row; organizers can read every row for
--     their events and flip pending rows to approved/rejected.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.event_registrations (
    id         uuid primary key default gen_random_uuid(),
    event_id   uuid not null references public.events (id) on delete cascade,
    user_id    uuid not null references auth.users (id) on delete cascade,
    first_name text not null,
    last_name  text not null,
    email      text not null,
    ticket_id  uuid references public.event_tickets (id) on delete set null,
    -- [{ questionId, label, answerType, answer }] mirrors attendee_questions
    answers    jsonb not null default '[]'::jsonb,
    -- 'pending' until the organizer approves (manual approval events).
    status     text not null default 'approved'
               check (status in ('pending', 'approved', 'rejected', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (event_id, user_id)
);

create index if not exists event_registrations_event_id_idx
    on public.event_registrations (event_id);
create index if not exists event_registrations_user_id_idx
    on public.event_registrations (user_id);

alter table public.event_registrations enable row level security;

drop policy if exists "Attendees can view own registrations" on public.event_registrations;
create policy "Attendees can view own registrations"
    on public.event_registrations for select
    using (auth.uid() = user_id);

drop policy if exists "Organizers can view registrations for own events" on public.event_registrations;
create policy "Organizers can view registrations for own events"
    on public.event_registrations for select
    using (exists (
        select 1 from public.events e
        where e.id = event_registrations.event_id and e.owner_id = auth.uid()
    ));

-- Attendee self-service: cancelling their own registration (frees capacity).
drop policy if exists "Attendees can update own registrations" on public.event_registrations;
create policy "Attendees can update own registrations"
    on public.event_registrations for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Organizer decisions: approve / reject pending registrations.
drop policy if exists "Organizers can update registrations for own events" on public.event_registrations;
create policy "Organizers can update registrations for own events"
    on public.event_registrations for update
    using (exists (
        select 1 from public.events e
        where e.id = event_registrations.event_id and e.owner_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.events e
        where e.id = event_registrations.event_id and e.owner_id = auth.uid()
    ));

-- Keep updated_at current on edits (reuses the trigger function above).
drop trigger if exists on_event_registration_updated on public.event_registrations;
create trigger on_event_registration_updated
    before update on public.event_registrations
    for each row execute function public.set_updated_at();

-- Standard role privileges (see section 11). No insert policy — the RPC only.
grant all on public.event_registrations to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────
-- 17. register_attendee — the only way in.
--
--     SUPERSEDED by the section 20 definition (guests + email uniqueness);
--     the later create-or-replace wins. Kept here for the narrative.
--
--     Security-definer RPC that atomically checks everything the public
--     registration form depends on: the event is published and not
--     cancelled, the registration window is open, the attendee hasn't
--     already registered (a cancelled registration can be revived), the
--     chosen ticket belongs to the event, and capacity is available
--     (approved + pending rows hold spots). Returns
--     { ok, registration_id?, status?, error? } so the client can toast
--     a friendly message per case.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.register_attendee(
    p_event_id   uuid,
    p_first_name text,
    p_last_name  text,
    p_email      text,
    p_ticket_id  uuid default null,
    p_answers    jsonb  default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
    v_event     public.events;
    v_existing  text;
    v_status    text;
    v_reg_id    uuid;
    v_active    int;
begin
    if auth.uid() is null then
        return jsonb_build_object('ok', false, 'error', 'sign_in_required');
    end if;

    select * into v_event from public.events
    where id = p_event_id and status = 'published';
    if v_event.id is null then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;

    if v_event.cancelled_at is not null then
        return jsonb_build_object('ok', false, 'error', 'event_cancelled');
    end if;

    -- Registration window: 'open' is always open; 'scheduled' respects the
    -- configured dates; 'closed' is closed.
    if v_event.registration_status = 'closed' then
        return jsonb_build_object('ok', false, 'error', 'registration_closed');
    elsif v_event.registration_status = 'scheduled' then
        if v_event.registration_opens is null or current_date < v_event.registration_opens then
            return jsonb_build_object('ok', false, 'error', 'registration_not_open');
        end if;
        if v_event.registration_closes is not null and current_date > v_event.registration_closes then
            return jsonb_build_object('ok', false, 'error', 'registration_closed');
        end if;
    end if;

    -- One registration per attendee per event. Approved / pending / rejected
    -- rows block a second attempt; a cancelled row is revived by the upsert.
    select status into v_existing from public.event_registrations
    where event_id = p_event_id and user_id = auth.uid();
    if v_existing in ('approved', 'pending', 'rejected') then
        return jsonb_build_object('ok', false, 'error', 'already_registered');
    end if;

    -- Optional ticket must belong to this event.
    if p_ticket_id is not null and not exists (
        select 1 from public.event_tickets t
        where t.id = p_ticket_id and t.event_id = p_event_id
    ) then
        return jsonb_build_object('ok', false, 'error', 'invalid_ticket');
    end if;

    -- Capacity — approved + pending registrations hold spots.
    if v_event.capacity_type = 'limited' then
        select count(*) into v_active from public.event_registrations r
        where r.event_id = p_event_id and r.status in ('approved', 'pending');
        if v_active >= coalesce(v_event.max_attendees, 0) then
            return jsonb_build_object('ok', false, 'error', 'event_full');
        end if;
    end if;

    v_status := case when v_event.approval_type = 'manual' then 'pending' else 'approved' end;

    insert into public.event_registrations
        (event_id, user_id, first_name, last_name, email, ticket_id, answers, status)
    values
        (p_event_id, auth.uid(), trim(p_first_name), trim(p_last_name),
         lower(trim(p_email)), p_ticket_id, p_answers, v_status)
    on conflict (event_id, user_id) do update
        set first_name = trim(p_first_name),
            last_name  = trim(p_last_name),
            email      = lower(trim(p_email)),
            ticket_id  = p_ticket_id,
            answers    = p_answers,
            status     = v_status,
            updated_at = now()
    returning id into v_reg_id;

    return jsonb_build_object('ok', true, 'registration_id', v_reg_id, 'status', v_status);
end;
$$;

grant execute on function public.register_attendee(uuid, text, text, text, uuid, jsonb)
    to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 18. Public-facing views.
--
--     published_events_public backs the /e/[id] page: profiles are
--     RLS-private, so the page can't join for the organizer's name —
--     this view (owner privileges, status = 'published' only) exposes a
--     safe column set plus organizer_name / organizer_avatar. Deliberately
--     excludes meeting_link / meeting_id, which stay gated behind an
--     approved registration (they remain readable via the events table's
--     public policy for now — the UI simply doesn't surface them).
--
--     event_registration_stats powers the "X of Y spots filled" hint with
--     aggregate counts only.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.published_events_public as
select
    e.id,
    e.name,
    e.theme,
    e.description,
    e.category,
    e.category_other,
    e.event_type,
    e.cover_image_url,
    e.hashtags,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.timezone,
    e.venue_name,
    e.venue_address,
    e.venue_city,
    e.venue_country,
    e.map_location,
    e.platform,
    e.streaming_outlets,
    e.registration_status,
    e.registration_opens,
    e.registration_closes,
    e.capacity_type,
    e.max_attendees,
    e.approval_type,
    e.attendee_questions,
    e.who_should_attend,
    e.what_to_expect,
    e.requirements,
    e.dress_code,
    e.accessibility,
    e.additional_info,
    e.age_restriction,
    e.age_restriction_custom,
    e.cancelled_at,
    e.updated_at,
    p.display_name as organizer_name,
    p.avatar_url  as organizer_avatar
from public.events e
join public.profiles p on p.id = e.owner_id
where e.status = 'published';

grant select on public.published_events_public to anon, authenticated;

create or replace view public.event_registration_stats as
select
    r.event_id,
    count(*) filter (where r.status = 'approved') as approved_count,
    count(*) filter (where r.status = 'pending') as pending_count,
    count(*) filter (where r.status in ('approved', 'pending')) as active_count
from public.event_registrations r
group by r.event_id;

grant select on public.event_registration_stats to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 19. Public copy — the tables stay owner-only; the views ARE the public.
--
--     With /e/[id], Tour and the sitemap reading from
--     published_events_public, the broad "anyone can view published
--     events" policies are no longer needed — and they leak full rows
--     (meeting links, attendee questions, capacity settings) to the API.
--     Dropping them makes public.events / public.event_tickets strictly
--     owner-readable; the public side is exactly the view surface:
--
--       - published_events_public   → one event's public page (section 18)
--       - published_event_tickets   → tickets of published events, below
--       - get_event_join_details    → join link/ID, approved attendees only
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "Anyone can view published events" on public.events;
drop policy if exists "Anyone can view tickets of published events" on public.event_tickets;

-- Tickets of published events — the public selector / price hints.
create or replace view public.published_event_tickets as
select
    t.id,
    t.event_id,
    t.name,
    t.description,
    t.price,
    t.currency,
    t.sort_order
from public.event_tickets t
join public.events e on e.id = t.event_id
where e.status = 'published';

grant select on public.published_event_tickets to anon, authenticated;

-- Join details for online/hybrid events — returned only when the caller
-- holds an approved registration for a live published event (matched by
-- user id, or by account email so guest registrations carry over).
create or replace function public.get_event_join_details(p_event_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
    v_email  text;
    v_result jsonb;
begin
    if auth.uid() is null then
        return jsonb_build_object('ok', false);
    end if;
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

    select jsonb_build_object(
        'ok', true,
        'meeting_link', e.meeting_link,
        'meeting_id', e.meeting_id
    )
    into v_result
    from public.events e
    where e.id = p_event_id
      and e.status = 'published'
      and e.cancelled_at is null
      and e.event_type in ('online', 'hybrid')
      and exists (
          select 1 from public.event_registrations r
          where r.event_id = p_event_id
            and r.status = 'approved'
            and (r.user_id = auth.uid() or (v_email <> '' and lower(r.email) = v_email))
      );

    if not found then
        return jsonb_build_object('ok', false);
    end if;
    return v_result;
end;
$$;

grant execute on function public.get_event_join_details(uuid) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 20. Roles & guest registration.
--
--     Two kinds of people use Konneqta Events: organizers (who need an
--     account to create events) and attendees (who can browse and register
--     without one — email is their identity anchor). Both kinds can
--     register for any event, and organizers can attend too.
-- ─────────────────────────────────────────────────────────────────────────

-- a) profiles.role — chosen at signup, switchable in-app ("Become an
--    organizer"). Attendee is the default (Google signups included).
alter table public.profiles
    add column if not exists role text
        check (role in ('attendee', 'organizer'))
        default 'attendee';

-- b) carry the signup role choice into profiles (defaults to attendee).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, first_name, last_name, display_name, avatar_url, role)
    values (
        new.id,
        new.email,
        nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), ''),
        nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), ''),
        coalesce(
            nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
            nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
            split_part(new.email, '@', 1)
        ),
        new.raw_user_meta_data->>'avatar_url',
        case
            when new.raw_user_meta_data->>'role' in ('attendee', 'organizer')
                then new.raw_user_meta_data->>'role'
            else 'attendee'
        end
    );
    return new;
end;
$$;

-- c) creating events is organizer-gated (the app offers a one-click
--    upgrade; this policy is the backstop).
drop policy if exists "Owners can insert own events" on public.events;
create policy "Owners can insert own events"
    on public.events for insert
    with check (
        auth.uid() = owner_id
        and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'organizer'
        )
    );

-- d) registrations open up to guests: user_id becomes optional (email is
--    the identity anchor) and uniqueness moves to (event_id, email) so a
--    person registers once per event whether they have an account or not.
alter table public.event_registrations
    alter column user_id drop not null;

alter table public.event_registrations
    drop constraint if exists event_registrations_event_id_user_id_key;

create unique index if not exists event_registrations_event_email_key
    on public.event_registrations (event_id, email);

-- Self-service stays available to the row's user — and, for rows made as
-- a guest, to the signed-in account with the same email (continuity:
-- register without an account today, manage it after signing up).
drop policy if exists "Attendees can update own registrations" on public.event_registrations;
create policy "Attendees can update own registrations"
    on public.event_registrations for update
    using (
        auth.uid() = user_id
        or (auth.jwt() ->> 'email' is not null and lower(auth.jwt() ->> 'email') = lower(email))
    )
    with check (
        auth.uid() = user_id
        or (auth.jwt() ->> 'email' is not null and lower(auth.jwt() ->> 'email') = lower(email))
    );

-- e) register_attendee — now works with or without a session. Guests pass
--    identity checks on email; signed-in users get their registration
--    linked to their account (and a guest row is claimed on re-register).
create or replace function public.register_attendee(
    p_event_id   uuid,
    p_first_name text,
    p_last_name  text,
    p_email      text,
    p_ticket_id  uuid default null,
    p_answers    jsonb  default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
    v_event    public.events;
    v_existing text;
    v_status   text;
    v_reg_id   uuid;
    v_active   int;
    v_email    text := lower(trim(p_email));
begin
    select * into v_event from public.events
    where id = p_event_id and status = 'published';
    if v_event.id is null then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;

    if v_event.cancelled_at is not null then
        return jsonb_build_object('ok', false, 'error', 'event_cancelled');
    end if;

    -- Registration window: 'open' is always open; 'scheduled' respects the
    -- configured dates; 'closed' is closed.
    if v_event.registration_status = 'closed' then
        return jsonb_build_object('ok', false, 'error', 'registration_closed');
    elsif v_event.registration_status = 'scheduled' then
        if v_event.registration_opens is null or current_date < v_event.registration_opens then
            return jsonb_build_object('ok', false, 'error', 'registration_not_open');
        end if;
        if v_event.registration_closes is not null and current_date > v_event.registration_closes then
            return jsonb_build_object('ok', false, 'error', 'registration_closed');
        end if;
    end if;

    -- One registration per email per event. Approved / pending / rejected
    -- rows block a second attempt; a cancelled row is revived by the upsert.
    select status into v_existing from public.event_registrations
    where event_id = p_event_id and email = v_email;
    if v_existing in ('approved', 'pending', 'rejected') then
        return jsonb_build_object('ok', false, 'error', 'already_registered');
    end if;

    -- Optional ticket must belong to this event.
    if p_ticket_id is not null and not exists (
        select 1 from public.event_tickets t
        where t.id = p_ticket_id and t.event_id = p_event_id
    ) then
        return jsonb_build_object('ok', false, 'error', 'invalid_ticket');
    end if;

    -- Capacity — approved + pending registrations hold spots.
    if v_event.capacity_type = 'limited' then
        select count(*) into v_active from public.event_registrations r
        where r.event_id = p_event_id and r.status in ('approved', 'pending');
        if v_active >= coalesce(v_event.max_attendees, 0) then
            return jsonb_build_object('ok', false, 'error', 'event_full');
        end if;
    end if;

    v_status := case when v_event.approval_type = 'manual' then 'pending' else 'approved' end;

    insert into public.event_registrations
        (event_id, user_id, first_name, last_name, email, ticket_id, answers, status)
    values
        (p_event_id, auth.uid(), trim(p_first_name), trim(p_last_name),
         v_email, p_ticket_id, p_answers, v_status)
    on conflict (event_id, email) do update
        set first_name = trim(p_first_name),
            last_name  = trim(p_last_name),
            email      = v_email,
            -- A signed-in re-register claims an earlier guest row.
            user_id    = coalesce(auth.uid(), public.event_registrations.user_id),
            ticket_id  = p_ticket_id,
            answers    = p_answers,
            status     = v_status,
            updated_at = now()
    returning id into v_reg_id;

    return jsonb_build_object('ok', true, 'registration_id', v_reg_id, 'status', v_status);
end;
$$;

-- f) my_event_registrations — the caller's own registrations (by user id
--    or account email) joined with the event basics their attendee
--    dashboard needs. Owner-scoped by construction; powers /events/registrations.
create or replace view public.my_event_registrations as
select
    r.id,
    r.event_id,
    r.status,
    r.ticket_id,
    r.created_at,
    r.first_name,
    r.last_name,
    r.email,
    e.name as event_name,
    e.theme as event_theme,
    e.cover_image_url,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.timezone,
    e.event_type,
    e.venue_city,
    e.venue_country,
    e.cancelled_at,
    e.approval_type
from public.event_registrations r
join public.events e on e.id = r.event_id
where r.user_id = auth.uid()
   or (auth.jwt() ->> 'email' is not null and r.email = lower(auth.jwt() ->> 'email'));

grant select on public.my_event_registrations to authenticated;