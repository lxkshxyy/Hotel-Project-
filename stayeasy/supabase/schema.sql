-- StayEasy database schema for Supabase (Postgres).
-- Run this once in Supabase → SQL Editor, then run seed.sql.

-- ─────────────────────────── Hotels ───────────────────────────
create table if not exists public.hotels (
  slug        text primary key,
  city        text not null,
  name        text not null,
  published   boolean not null default true,
  data        jsonb not null,           -- full hotel object (see src/data/types.ts → Hotel)
  updated_at  timestamptz not null default now()
);

create index if not exists hotels_city_idx on public.hotels (city) where published;

alter table public.hotels enable row level security;

drop policy if exists "Anyone can read published hotels" on public.hotels;
create policy "Anyone can read published hotels"
  on public.hotels for select
  using (published);

-- ─────────────────────────── Profiles ───────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  points      integer not null default 0 check (points >= 0),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- No update policy: points and profile rows are only changed by the
-- security-definer functions below, so users can't edit their own points.

-- Create a profile for every new sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── Bookings ───────────────────────────
create table if not exists public.bookings (
  id                text primary key,                       -- e.g. SE-7KQ2MX
  user_id           uuid not null references auth.users (id) on delete cascade,
  hotel_slug        text not null references public.hotels (slug),
  hotel_name        text not null,
  hotel_city        text not null,
  room_name         text not null,
  check_in          date not null,
  check_out         date not null,
  nights            integer not null check (nights > 0),
  rooms             integer not null check (rooms between 1 and 8),
  guests            integer not null check (guests between 1 and 40),
  guest_name        text not null,
  guest_phone       text not null,
  guest_email       text not null,
  special_requests  text,
  pay_mode          text not null default 'hotel' check (pay_mode in ('hotel', 'now')),
  coupon            text,
  points_used       integer not null default 0 check (points_used >= 0),
  room_total        integer not null,
  discount_total    integer not null default 0,
  tax               integer not null,
  amount            integer not null check (amount >= 0),
  status            text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at        timestamptz not null default now(),
  check (check_out > check_in)
);

create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "Users read their own bookings" on public.bookings;
create policy "Users read their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Users create their own bookings" on public.bookings;
create policy "Users create their own bookings"
  on public.bookings for insert
  with check (
    auth.uid() = user_id
    and status = 'confirmed'
    and pay_mode = 'hotel'          -- online payment is not wired up yet
    and check_in >= current_date
  );
-- No update/delete policies: cancelling goes through cancel_booking() below.

-- Spend and earn Club points when a booking is created.
create or replace function public.apply_booking_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  available integer;
begin
  insert into public.profiles (id) values (new.user_id) on conflict (id) do nothing;
  select points into available from public.profiles where id = new.user_id for update;
  if new.points_used > available then
    raise exception 'Not enough Club points (you have %).', available;
  end if;
  update public.profiles
     set points = points - new.points_used + floor(new.amount / 100)
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists bookings_points on public.bookings;
create trigger bookings_points
  after insert on public.bookings
  for each row execute function public.apply_booking_points();

-- Let a guest cancel their own booking until 24 hours before check-in.
create or replace function public.cancel_booking(booking_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = booking_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Booking not found.';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'This booking is already cancelled.';
  end if;
  if b.check_in < current_date + 1 then
    raise exception 'Free cancellation has ended for this booking. Please call support.';
  end if;
  update public.bookings set status = 'cancelled' where id = booking_id;
  -- Refund points spent, take back points earned.
  update public.profiles
     set points = greatest(0, points + b.points_used - floor(b.amount / 100))
   where id = b.user_id;
end;
$$;

revoke all on function public.cancel_booking(text) from public, anon;
grant execute on function public.cancel_booking(text) to authenticated;

-- ─────────────────────────── Enquiries ───────────────────────────
-- "For Business" and "List your hotel" forms. Anyone can submit; only the
-- team (via the Supabase dashboard / service role) can read them.
create table if not exists public.enquiries (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('business', 'partner')),
  name        text not null check (char_length(name) between 1 and 120),
  company     text check (char_length(company) <= 160),
  email       text not null check (char_length(email) <= 200),
  phone       text check (char_length(phone) <= 30),
  city        text check (char_length(city) <= 80),
  message     text check (char_length(message) <= 2000),
  created_at  timestamptz not null default now()
);

alter table public.enquiries enable row level security;

drop policy if exists "Anyone can send an enquiry" on public.enquiries;
create policy "Anyone can send an enquiry"
  on public.enquiries for insert
  with check (true);


-- ---------------------------------------------------------------
-- Added Oct 2026: checkout add-ons and guest reviews
-- ---------------------------------------------------------------
alter table public.bookings add column if not exists extras jsonb not null default '[]'::jsonb;

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  hotel_slug  text not null references public.hotels (slug) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  rating      integer not null check (rating between 1 and 5),
  traveller   text not null check (traveller in ('Couple', 'Solo', 'Business', 'Family', 'Group')),
  room        text,
  stay_month  text not null,
  title       text not null check (char_length(title) between 4 and 80),
  text        text not null check (char_length(text) between 30 and 1500),
  topics      text[] not null default '{}',
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_hotel_idx on public.reviews (hotel_slug, created_at desc);
alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select using (true);

drop policy if exists "Signed-in users post their own reviews" on public.reviews;
create policy "Signed-in users post their own reviews"
  on public.reviews for insert to authenticated
  with check (
    auth.uid() = user_id
    -- "verified" may only be set when the user really has a booking at this hotel
    and (verified = false or exists (
      select 1 from public.bookings b
      where b.user_id = auth.uid() and b.hotel_slug = reviews.hotel_slug and b.status = 'confirmed'
    ))
  );

-- ---------------------------------------------------------------
-- Added Oct 2026: StayEasy Club bonus points (must match src/lib/club.ts)
-- Silver: 2 bookings + 4 nights → 150 · Gold: 6 + 12 → 300 · Platinum: 13 + 26 → 500
-- ---------------------------------------------------------------
create or replace function public.club_level(b integer, n integer)
returns integer language sql immutable as $$
  select case when b >= 13 and n >= 26 then 3 when b >= 6 and n >= 12 then 2 when b >= 2 and n >= 4 then 1 else 0 end;
$$;

create or replace function public.apply_booking_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  available integer;
  nb integer;
  nn integer;
  lv_before integer;
  lv_after integer;
  bonus integer := 0;
begin
  insert into public.profiles (id) values (new.user_id) on conflict (id) do nothing;
  select points into available from public.profiles where id = new.user_id for update;
  if new.points_used > available then
    raise exception 'Not enough Club points (you have %).', available;
  end if;
  select count(*), coalesce(sum(nights), 0) into nb, nn
    from public.bookings where user_id = new.user_id and status = 'confirmed';
  lv_after := public.club_level(nb, nn);
  lv_before := public.club_level(nb - 1, nn - new.nights);
  if lv_before < 1 and lv_after >= 1 then bonus := bonus + 150; end if;
  if lv_before < 2 and lv_after >= 2 then bonus := bonus + 300; end if;
  if lv_before < 3 and lv_after >= 3 then bonus := bonus + 500; end if;
  update public.profiles
     set points = points - new.points_used + floor(new.amount / 100) + bonus
   where id = new.user_id;
  return new;
end;
$$;

-- ─────────────────────────── Partner panel (InnDesk, Phase 3) ───────────────────────────
-- Hotel owners list their own properties through the separate InnDesk website.
-- A published listing becomes a row in public.hotels (source = 'partner'), so it shows on
-- StayEasy automatically. Both websites use this same Supabase project.

alter table public.hotels add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.hotels add column if not exists source text not null default 'stayeasy';
alter table public.hotels drop constraint if exists hotels_source_check;
alter table public.hotels add constraint hotels_source_check check (source in ('stayeasy', 'partner'));
create index if not exists hotels_owner_idx on public.hotels (owner_id);

drop policy if exists "Owners read their hotels" on public.hotels;
create policy "Owners read their hotels"
  on public.hotels for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners add partner hotels" on public.hotels;
create policy "Owners add partner hotels"
  on public.hotels for insert
  with check (auth.uid() = owner_id and source = 'partner');

drop policy if exists "Owners update their hotels" on public.hotels;
create policy "Owners update their hotels"
  on public.hotels for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id and source = 'partner');

-- Owner accounts (one per login).
create table if not exists public.partner_owners (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null,
  phone          text not null,
  business_name  text not null,
  gstin          text,
  data           jsonb not null default '{}',   -- payout name, IFSC, last 4 digits only, notification settings
  created_at     timestamptz not null default now()
);
alter table public.partner_owners enable row level security;
drop policy if exists "Owners manage their account" on public.partner_owners;
create policy "Owners manage their account"
  on public.partner_owners for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Full listing as the owner edits it (drafts, rates calendar, documents). The public copy lives in hotels.data.
create table if not exists public.partner_listings (
  id          text primary key,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  slug        text not null unique,
  status      text not null default 'draft' check (status in ('draft', 'live', 'paused')),
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists partner_listings_owner_idx on public.partner_listings (owner_id);
alter table public.partner_listings enable row level security;
drop policy if exists "Owners manage their listings" on public.partner_listings;
create policy "Owners manage their listings"
  on public.partner_listings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owners see the bookings made at their hotels (guest name, dates, amount) — nothing else.
drop policy if exists "Owners read bookings at their hotels" on public.bookings;
create policy "Owners read bookings at their hotels"
  on public.bookings for select
  using (exists (select 1 from public.hotels h where h.slug = bookings.hotel_slug and h.owner_id = auth.uid()));

-- Property photos: public bucket, each owner writes only inside a folder named after their user id.
insert into storage.buckets (id, name, public) values ('hotel-photos', 'hotel-photos', true)
on conflict (id) do nothing;
drop policy if exists "Anyone can view hotel photos" on storage.objects;
create policy "Anyone can view hotel photos"
  on storage.objects for select
  using (bucket_id = 'hotel-photos');
drop policy if exists "Owners upload hotel photos" on storage.objects;
create policy "Owners upload hotel photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'hotel-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners delete their hotel photos" on storage.objects;
create policy "Owners delete their hotel photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hotel-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════ Live launch (Oct 2026) ═══════════════════════════
-- Bookings are now created by the create-booking function (server-side prices, room counts,
-- online payment). The browser can no longer insert bookings directly.

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in ('pending', 'confirmed', 'cancelled'));
alter table public.bookings add column if not exists source text not null default 'web';
alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings add constraint bookings_source_check check (source in ('web', 'business', 'agent'));
alter table public.bookings add column if not exists room_id text;
alter table public.bookings add column if not exists payment_order_id text unique;
alter table public.bookings add column if not exists payment_id text;
alter table public.bookings add column if not exists paid_at timestamptz;
alter table public.bookings add column if not exists refund_id text;
alter table public.bookings add column if not exists refund_amount integer;
alter table public.bookings add column if not exists refund_status text;
alter table public.bookings add column if not exists cancelled_at timestamptz;
create index if not exists bookings_room_dates_idx on public.bookings (hotel_slug, room_name, check_in, check_out) where status <> 'cancelled';

drop policy if exists "Users create their own bookings" on public.bookings;

-- Club points move only when a booking is confirmed (straight away for pay at hotel,
-- after payment for pay now). Cancellation is handled by the cancel-booking function.
drop trigger if exists bookings_points on public.bookings;
create trigger bookings_points
  after insert on public.bookings
  for each row when (new.status = 'confirmed')
  execute function public.apply_booking_points();

drop trigger if exists bookings_points_on_paid on public.bookings;
create trigger bookings_points_on_paid
  after update of status on public.bookings
  for each row when (old.status = 'pending' and new.status = 'confirmed')
  execute function public.apply_booking_points();

-- Old direct-cancel function: replaced by the cancel-booking function (refunds + hotel windows).
revoke execute on function public.cancel_booking(text) from authenticated;

-- Guests may correct their contact details and requests until check-in.
create or replace function public.update_booking_guest(booking_id text, guest_name text, guest_phone text, guest_email text, special_requests text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if char_length(trim(guest_name)) < 3 or guest_phone !~ '^\+91[6-9][0-9]{9}$' or guest_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Check the name, phone and email.';
  end if;
  update public.bookings
     set guest_name = trim(update_booking_guest.guest_name),
         guest_phone = update_booking_guest.guest_phone,
         guest_email = trim(update_booking_guest.guest_email),
         special_requests = left(update_booking_guest.special_requests, 2000)
   where id = booking_id and user_id = auth.uid() and status = 'confirmed' and check_in >= current_date;
  if not found then
    raise exception 'This booking can no longer be changed.';
  end if;
end;
$$;
revoke all on function public.update_booking_guest(text, text, text, text, text) from public, anon;
grant execute on function public.update_booking_guest(text, text, text, text, text) to authenticated;

-- Traveller profile (name, phone, preferences, co-travellers) follows the guest to every device.
-- Only these columns are writable by the guest; points stay database-only.
alter table public.profiles add column if not exists data jsonb not null default '{}';
revoke update on public.profiles from authenticated;
grant update (full_name, phone, data) on public.profiles to authenticated;
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ratings on the live site come only from real reviews.
create or replace view public.hotel_ratings with (security_invoker = true) as
  select hotel_slug, round(avg(rating)::numeric, 1) as avg, count(*)::int as n
    from public.reviews
   group by hotel_slug;
grant select on public.hotel_ratings to anon, authenticated;

-- A review counts as "verified" only after a confirmed stay has started.
drop policy if exists "Signed-in users post their own reviews" on public.reviews;
create policy "Signed-in users post their own reviews"
  on public.reviews for insert to authenticated
  with check (
    auth.uid() = user_id
    and (verified = false or exists (
      select 1 from public.bookings b
      where b.user_id = auth.uid() and b.hotel_slug = reviews.hotel_slug and b.status = 'confirmed' and b.check_in <= current_date
    ))
  );

-- ═══════════════════════════ Travel-agent portal (TripDesk) ═══════════════════════════
-- Agencies buy at net rates from a wallet and sell at their own markup. Money moves only in
-- the agent-* functions; the browser can read its own agency's data and manage customers/quotes.

create table if not exists public.agents (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references auth.users (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  credit_limit  integer not null default 0 check (credit_limit >= 0),
  data          jsonb not null,   -- name, owner, phone, city, address, PAN, GSTIN, docs, markup settings
  created_at    timestamptz not null default now()
);
alter table public.agents enable row level security;

create table if not exists public.agent_members (
  agent_id    uuid not null references public.agents (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null default 'Agent' check (role in ('Admin', 'Agent')),
  created_at  timestamptz not null default now(),
  primary key (agent_id, email)
);
create unique index if not exists agent_members_user_idx on public.agent_members (user_id) where user_id is not null;
alter table public.agent_members enable row level security;

create or replace function public.my_agent_id() returns uuid
language sql stable security definer set search_path = public as $$
  select agent_id from public.agent_members where user_id = auth.uid() limit 1
$$;
create or replace function public.my_agent_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.agent_members where user_id = auth.uid() limit 1
$$;

drop policy if exists "Members read their agency" on public.agents;
create policy "Members read their agency" on public.agents for select using (id = public.my_agent_id());
drop policy if exists "Members read their team" on public.agent_members;
create policy "Members read their team" on public.agent_members for select using (agent_id = public.my_agent_id());

create table if not exists public.agent_ledger (
  id                bigint generated always as identity primary key,
  agent_id          uuid not null references public.agents (id) on delete cascade,
  type              text not null check (type in ('topup', 'booking', 'refund', 'adjust')),
  amount            integer not null,
  note              text not null default '',
  booking_id        text,
  payment_order_id  text unique,
  created_at        timestamptz not null default now()
);
create index if not exists agent_ledger_agent_idx on public.agent_ledger (agent_id, created_at desc);
alter table public.agent_ledger enable row level security;
drop policy if exists "Members read their ledger" on public.agent_ledger;
create policy "Members read their ledger" on public.agent_ledger for select using (agent_id = public.my_agent_id());

create table if not exists public.agent_topups (
  order_id    text primary key,
  agent_id    uuid not null references public.agents (id) on delete cascade,
  amount      integer not null check (amount > 0),
  status      text not null default 'pending' check (status in ('pending', 'paid')),
  created_at  timestamptz not null default now()
);
alter table public.agent_topups enable row level security;   -- server functions only

create table if not exists public.agent_customers (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 120),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email       text,
  city        text,
  notes       text check (char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  unique (agent_id, phone)
);
alter table public.agent_customers enable row level security;
drop policy if exists "Members manage their customers" on public.agent_customers;
create policy "Members manage their customers" on public.agent_customers for all
  using (agent_id = public.my_agent_id()) with check (agent_id = public.my_agent_id());

create table if not exists public.agent_quotes (
  id          text primary key,
  agent_id    uuid not null references public.agents (id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.agent_quotes enable row level security;
drop policy if exists "Members manage their quotes" on public.agent_quotes;
create policy "Members manage their quotes" on public.agent_quotes for all
  using (agent_id = public.my_agent_id()) with check (agent_id = public.my_agent_id());

-- Agent bookings live in the same bookings table, so hotels and room counts see them.
alter table public.bookings add column if not exists agent_id uuid references public.agents (id);
alter table public.bookings add column if not exists booked_by text;
alter table public.bookings add column if not exists customer_id uuid references public.agent_customers (id) on delete set null;
alter table public.bookings add column if not exists net_amount integer;
alter table public.bookings add column if not exists markup_amount integer;
alter table public.bookings add column if not exists selling_amount integer;
alter table public.bookings drop constraint if exists bookings_pay_mode_check;
alter table public.bookings add constraint bookings_pay_mode_check check (pay_mode in ('hotel', 'now', 'agent'));
create index if not exists bookings_agent_idx on public.bookings (agent_id, created_at desc) where agent_id is not null;

-- Guests' "My bookings" shows only their own web bookings; agencies see theirs.
drop policy if exists "Users read their own bookings" on public.bookings;
create policy "Users read their own bookings" on public.bookings for select using (auth.uid() = user_id and source <> 'agent');
drop policy if exists "Agencies read their bookings" on public.bookings;
create policy "Agencies read their bookings" on public.bookings for select using (agent_id is not null and agent_id = public.my_agent_id());

-- No Club points on agent bookings.
drop trigger if exists bookings_points on public.bookings;
create trigger bookings_points
  after insert on public.bookings
  for each row when (new.status = 'confirmed' and new.source <> 'agent')
  execute function public.apply_booking_points();

-- Register: the caller becomes the agency's Admin. The StayEasy team approves in the dashboard
-- (update agents set status = 'approved', credit_limit = … where id = …).
create or replace function public.register_agency(profile jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me text := (select email from auth.users where id = auth.uid());
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in again.'; end if;
  if exists (select 1 from public.agent_members where user_id = auth.uid()) then raise exception 'This email already belongs to an agency.'; end if;
  if coalesce(profile ->> 'pan', '') !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'Enter a valid PAN.'; end if;
  insert into public.agents (owner_id, data)
  values (auth.uid(), (profile - 'id' - 'status' - 'creditLimit') || jsonb_build_object('email', me))
  returning id into new_id;
  insert into public.agent_members (agent_id, user_id, email, name, role)
  values (new_id, auth.uid(), lower(me), coalesce(profile ->> 'ownerName', me), 'Admin');
  return new_id;
end;
$$;

-- Admins edit name, contact, address and markup. PAN, GSTIN, documents and status stay as checked.
create or replace function public.update_agency(profile jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_agent_role() is distinct from 'Admin' then raise exception 'Only the agency admin can change settings.'; end if;
  update public.agents a
     set data = (profile - 'id' - 'status' - 'creditLimit' - 'pan' - 'gstin' - 'docs' - 'email')
                || jsonb_build_object('pan', a.data -> 'pan', 'gstin', a.data -> 'gstin', 'docs', a.data -> 'docs', 'email', a.data -> 'email')
   where a.id = public.my_agent_id();
end;
$$;

create or replace function public.invite_agent_member(member_email text, member_name text, member_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_agent_role() is distinct from 'Admin' then raise exception 'Only the agency admin can add staff.'; end if;
  if member_role not in ('Admin', 'Agent') then raise exception 'Choose Admin or Agent.'; end if;
  if exists (select 1 from public.agent_members m join auth.users u on u.id = m.user_id where lower(u.email) = lower(member_email)) then
    raise exception 'That email already belongs to an agency.';
  end if;
  insert into public.agent_members (agent_id, user_id, email, name, role)
  values (public.my_agent_id(), (select id from auth.users where lower(email) = lower(member_email) limit 1), lower(member_email), member_name, member_role)
  on conflict (agent_id, email) do update set name = excluded.name, role = excluded.role;
end;
$$;

create or replace function public.accept_agent_invite() returns boolean
language plpgsql security definer set search_path = public as $$
declare me text := (select lower(email) from auth.users where id = auth.uid());
begin
  update public.agent_members set user_id = auth.uid() where email = me and user_id is null;
  return found;
end;
$$;

create or replace function public.remove_agent_member(member_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_agent_role() is distinct from 'Admin' then raise exception 'Only the agency admin can remove staff.'; end if;
  delete from public.agent_members m
   using public.agents a
   where m.agent_id = public.my_agent_id() and a.id = m.agent_id and m.email = lower(member_email) and m.user_id is distinct from a.owner_id;
end;
$$;

-- Takes a booking's net amount from the wallet (with credit), atomically. Used by agent-create-booking.
create or replace function public.agent_debit(p_agent uuid, p_amount integer, p_booking text, p_note text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  credit integer;
  bal integer;
begin
  select credit_limit into credit from public.agents where id = p_agent and status = 'approved' for update;
  if not found then raise exception 'Your agency is not approved for bookings yet.'; end if;
  select coalesce(sum(amount), 0) into bal from public.agent_ledger where agent_id = p_agent;
  if bal + credit < p_amount then raise exception 'Not enough in your wallet. You need ₹% more.', p_amount - bal - credit; end if;
  insert into public.agent_ledger (agent_id, type, amount, note, booking_id) values (p_agent, 'booking', -p_amount, p_note, p_booking);
  return bal - p_amount;
end;
$$;
revoke all on function public.agent_debit(uuid, integer, text, text) from public, anon, authenticated;

revoke all on function public.register_agency(jsonb), public.update_agency(jsonb), public.invite_agent_member(text, text, text), public.accept_agent_invite(), public.remove_agent_member(text) from public, anon;
grant execute on function public.register_agency(jsonb), public.update_agency(jsonb), public.invite_agent_member(text, text, text), public.accept_agent_invite(), public.remove_agent_member(text) to authenticated;
