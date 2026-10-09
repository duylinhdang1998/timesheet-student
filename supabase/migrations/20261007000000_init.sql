-- Mẹ và lịch học: initial schema
-- One household per user; members share children, sessions and day notes.

create extension if not exists btree_gist with schema extensions;

-- ───────────────────────── Tables ─────────────────────────

create type public.member_role as enum ('owner', 'editor', 'viewer');
create type public.session_status as enum ('scheduled', 'off');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.member_role not null,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- each account belongs to exactly one household
  unique (user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  code text not null unique,
  role public.member_role not null check (role in ('editor', 'viewer')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users on delete set null,
  used_at timestamptz
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null,
  -- small JPEG data URL, resized client-side; kept in-row so RLS covers it and it caches offline
  avatar text check (avatar is null or length(avatar) < 200000),
  school text,
  class_name text,
  created_at timestamptz not null default now()
);

-- A weekly recurrence. Its sessions are materialised as rows in `sessions`.
create table public.series (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  title text not null check (length(trim(title)) > 0),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  -- ISO weekdays: 1 = Monday … 7 = Sunday
  weekdays smallint[] not null check (cardinality(weekdays) > 0 and weekdays <@ '{1,2,3,4,5,6,7}'),
  start_date date not null,
  end_date date not null check (end_date >= start_date and end_date <= start_date + 400),
  location text,
  teacher text,
  contact_phone text,
  escort text,
  note text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  series_id uuid references public.series on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  title text not null check (length(trim(title)) > 0),
  location text,
  teacher text,
  contact_phone text,
  escort text,
  note text,
  status public.session_status not null default 'scheduled',
  off_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one child can't be in two scheduled sessions at once; sessions marked "off" don't count
  constraint sessions_no_overlap exclude using gist (
    child_id with =,
    tsrange(date + start_time, date + end_time) with &&
  ) where (status = 'scheduled')
);

create index sessions_household_date on public.sessions (household_id, date);
create index sessions_series on public.sessions (series_id, date);

-- child_id null = note for the whole family that day
create table public.day_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  child_id uuid references public.children on delete cascade,
  date date not null,
  content text not null check (length(trim(content)) > 0),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (household_id, child_id, date)
);

create index day_notes_household_date on public.day_notes (household_id, date);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();
create trigger day_notes_touch before update on public.day_notes
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Access helpers ─────────────────────────

create function public.my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from household_members where user_id = auth.uid()
$$;

create function public.my_role() returns public.member_role
language sql stable security definer set search_path = public as $$
  select role from household_members where user_id = auth.uid()
$$;

create function public.can_edit(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where user_id = auth.uid() and household_id = hh and role in ('owner', 'editor')
  )
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invites enable row level security;
alter table public.children enable row level security;
alter table public.series enable row level security;
alter table public.sessions enable row level security;
alter table public.day_notes enable row level security;

create policy "members read household" on public.households
  for select to authenticated using (id = public.my_household_id());
create policy "owner renames household" on public.households
  for update to authenticated using (id = public.my_household_id() and public.my_role() = 'owner');

create policy "members read members" on public.household_members
  for select to authenticated using (household_id = public.my_household_id());
create policy "edit own display name" on public.household_members
  for update to authenticated using (user_id = auth.uid());
create policy "owner removes others" on public.household_members
  for delete to authenticated using (
    household_id = public.my_household_id() and public.my_role() = 'owner' and user_id <> auth.uid()
  );
-- members may only change their display name, never their role (column grant in Grants below)

create policy "owner reads invites" on public.invites
  for select to authenticated using (household_id = public.my_household_id() and public.my_role() = 'owner');
create policy "owner revokes invites" on public.invites
  for delete to authenticated using (household_id = public.my_household_id() and public.my_role() = 'owner');

-- children, series, sessions, day_notes: everyone in the household reads, owner/editor write
do $$
declare t text;
begin
  foreach t in array array['children', 'series', 'sessions', 'day_notes'] loop
    execute format(
      'create policy "members read" on public.%I for select to authenticated using (household_id = public.my_household_id())', t);
    execute format(
      'create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit(household_id))', t);
    execute format(
      'create policy "editors update" on public.%I for update to authenticated using (public.can_edit(household_id)) with check (public.can_edit(household_id))', t);
    execute format(
      'create policy "editors delete" on public.%I for delete to authenticated using (public.can_edit(household_id))', t);
  end loop;
end $$;

-- ───────────────────────── Household & invites ─────────────────────────

create function public.create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Bạn đã thuộc một gia đình';
  end if;
  insert into households (name) values (trim(p_name)) returning id into v_id;
  insert into household_members (household_id, user_id, role, display_name)
    values (v_id, auth.uid(), 'owner', trim(p_display_name));
  return v_id;
end $$;

create function public.create_invite(p_role public.member_role) returns public.invites
language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_invite invites;
begin
  if public.my_role() is distinct from 'owner' then raise exception 'Chỉ chủ nhà mới tạo được mã mời'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'Vai trò không hợp lệ'; end if;
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from invites where code = v_code);
  end loop;
  insert into invites (household_id, code, role, created_by)
    values (public.my_household_id(), v_code, p_role, auth.uid())
    returning * into v_invite;
  return v_invite;
end $$;

create function public.join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_invite invites;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Bạn đã thuộc một gia đình';
  end if;
  select * into v_invite from invites
    where code = upper(trim(p_code)) and used_by is null and expires_at > now()
    for update;
  if not found then raise exception 'Mã mời không đúng hoặc đã hết hạn'; end if;
  insert into household_members (household_id, user_id, role, display_name)
    values (v_invite.household_id, auth.uid(), v_invite.role, trim(p_display_name));
  update invites set used_by = auth.uid(), used_at = now() where id = v_invite.id;
  return v_invite.household_id;
end $$;

-- ───────────────────────── Recurring series ─────────────────────────
-- These run as the caller (security invoker), so RLS still enforces owner/editor.

-- Materialise a series' sessions from p_from onward, skipping days where the child
-- already has an overlapping scheduled session.
create function public._generate_series_sessions(p_series_id uuid, p_from date)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  s series;
  d date;
  v_created int := 0;
  v_skipped date[] := '{}';
begin
  select * into s from series where id = p_series_id;
  for d in select generate_series(greatest(p_from, s.start_date), s.end_date, interval '1 day')::date loop
    continue when not (extract(isodow from d)::smallint = any (s.weekdays));
    if exists (
      select 1 from sessions x
      where x.child_id = s.child_id and x.date = d and x.status = 'scheduled'
        and x.start_time < s.end_time and x.end_time > s.start_time
    ) then
      v_skipped := v_skipped || d;
    else
      insert into sessions (household_id, child_id, series_id, date, start_time, end_time,
                            title, location, teacher, contact_phone, escort, note)
      values (s.household_id, s.child_id, s.id, d, s.start_time, s.end_time,
              s.title, s.location, s.teacher, s.contact_phone, s.escort, s.note);
      v_created := v_created + 1;
    end if;
  end loop;
  return jsonb_build_object('series_id', s.id, 'created', v_created, 'skipped', to_jsonb(v_skipped));
end $$;

create function public.create_series(
  p_child_id uuid,
  p_title text,
  p_start_time time,
  p_end_time time,
  p_weekdays smallint[],
  p_start_date date,
  p_end_date date,
  p_location text default null,
  p_teacher text default null,
  p_contact_phone text default null,
  p_escort text default null,
  p_note text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_household uuid;
  v_series uuid;
begin
  select household_id into v_household from children where id = p_child_id;
  if v_household is null then raise exception 'Không tìm thấy bé'; end if;
  insert into series (household_id, child_id, title, start_time, end_time, weekdays, start_date, end_date,
                      location, teacher, contact_phone, escort, note)
  values (v_household, p_child_id, trim(p_title), p_start_time, p_end_time, p_weekdays, p_start_date, p_end_date,
          p_location, p_teacher, p_contact_phone, p_escort, p_note)
  returning id into v_series;
  return public._generate_series_sessions(v_series, p_start_date);
end $$;

-- Cut a series at the given session's date: that session and every later one in the series
-- are removed, and the old series ends the day before (or disappears if nothing is left).
create function public._cut_series_at(p_session_id uuid, out o_series series, out o_from date)
language plpgsql security invoker set search_path = public as $$
begin
  select x.date into o_from from sessions x where x.id = p_session_id;
  select s.* into o_series from series s join sessions x on x.series_id = s.id where x.id = p_session_id;
  if o_series.id is null then raise exception 'Buổi này không thuộc lịch lặp'; end if;
  delete from sessions where series_id = o_series.id and date >= o_from;
  if o_from <= o_series.start_date then
    delete from series where id = o_series.id;
  else
    update series set end_date = o_from - 1 where id = o_series.id;
  end if;
end $$;

-- "Buổi này và các buổi sau": replace the tail of a series with a new series built from the
-- given fields. Days previously marked "off" keep that status if they still exist.
create function public.update_series_from(
  p_session_id uuid,
  p_child_id uuid,
  p_title text,
  p_start_time time,
  p_end_time time,
  p_weekdays smallint[],
  p_end_date date,
  p_location text default null,
  p_teacher text default null,
  p_contact_phone text default null,
  p_escort text default null,
  p_note text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_old_id uuid;
  v_off jsonb;
  v_cut record;
  v_result jsonb;
begin
  select series_id into v_old_id from sessions where id = p_session_id;
  select coalesce(jsonb_object_agg(date::text, coalesce(off_reason, '')), '{}') into v_off
    from sessions
    where series_id = v_old_id
      and date >= (select date from sessions where id = p_session_id)
      and status = 'off';

  select * into v_cut from public._cut_series_at(p_session_id);
  v_result := public.create_series(
    p_child_id, p_title, p_start_time, p_end_time, p_weekdays, v_cut.o_from, p_end_date,
    p_location, p_teacher, p_contact_phone, p_escort, p_note);

  update sessions
    set status = 'off', off_reason = nullif(v_off ->> date::text, '')
    where series_id = (v_result ->> 'series_id')::uuid and v_off ? date::text;
  return v_result;
end $$;

create function public.delete_series_from(p_session_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  perform public._cut_series_at(p_session_id);
end $$;

-- Distinct escorts typed before, for autocomplete
create function public.escort_suggestions() returns setof text
language sql stable security invoker set search_path = public as $$
  select distinct escort from (
    select escort from sessions where household_id = public.my_household_id()
    union all
    select escort from series where household_id = public.my_household_id()
  ) e where escort is not null and trim(escort) <> ''
  order by escort
$$;

-- ───────────────────────── Grants ─────────────────────────
-- Explicit so the app works regardless of the project's default Data API exposure.
-- Helper functions stay callable: they run as the caller, so RLS still applies.

-- Supabase grants ALL on new tables to anon/authenticated by default; start from nothing.
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to authenticated;
grant usage on type public.member_role, public.session_status to authenticated;
grant select, insert, update, delete on public.children, public.series, public.sessions, public.day_notes to authenticated;
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;
grant select, delete on public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;
grant select, delete on public.invites to authenticated;
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
