-- Reminders before a session.
-- Push: each phone schedules its own local notifications from `remind_minutes`.
-- Email: a cron job calls the `send-reminders` Edge Function, which claims due reminders
-- through `claim_email_reminders()` and mails every member of the household via Resend.

alter table public.series
  add column remind_minutes smallint not null default 15
    check (remind_minutes in (15, 30, 60, 120, 240, 720, 1440)),
  add column remind_email boolean not null default false;

alter table public.sessions
  add column remind_minutes smallint not null default 15
    check (remind_minutes in (15, 30, 60, 120, 240, 720, 1440)),
  add column remind_email boolean not null default false;

-- ───────────────────────── Series carry the reminder settings ─────────────────────────

create or replace function public._generate_series_sessions(p_series_id uuid, p_from date)
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
                            title, location, teacher, contact_phone, escort, note,
                            remind_minutes, remind_email)
      values (s.household_id, s.child_id, s.id, d, s.start_time, s.end_time,
              s.title, s.location, s.teacher, s.contact_phone, s.escort, s.note,
              s.remind_minutes, s.remind_email);
      v_created := v_created + 1;
    end if;
  end loop;
  return jsonb_build_object('series_id', s.id, 'created', v_created, 'skipped', to_jsonb(v_skipped));
end $$;

drop function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text, uuid);
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
  p_note text default null,
  p_lineage_id uuid default null,
  p_remind_minutes smallint default 15,
  p_remind_email boolean default false
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_household uuid;
  v_series uuid := gen_random_uuid();
begin
  select household_id into v_household from children where id = p_child_id;
  if v_household is null then raise exception 'Không tìm thấy bé'; end if;
  insert into series (id, lineage_id, household_id, child_id, title, start_time, end_time, weekdays,
                      start_date, end_date, location, teacher, contact_phone, escort, note,
                      remind_minutes, remind_email)
  values (v_series, coalesce(p_lineage_id, v_series), v_household, p_child_id, trim(p_title), p_start_time,
          p_end_time, p_weekdays, p_start_date, p_end_date, p_location, p_teacher, p_contact_phone, p_escort, p_note,
          p_remind_minutes, p_remind_email);
  return public._generate_series_sessions(v_series, p_start_date);
end $$;

drop function public.update_series_from(uuid, uuid, text, time, time, smallint[], date, text, text, text, text, text);
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
  p_note text default null,
  p_remind_minutes smallint default 15,
  p_remind_email boolean default false
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_lineage uuid;
  v_from date;
  v_off jsonb;
  v_result jsonb;
begin
  select s.lineage_id, x.date into v_lineage, v_from
    from sessions x join series s on s.id = x.series_id where x.id = p_session_id;
  select coalesce(jsonb_object_agg(x.date::text, coalesce(x.off_reason, '')), '{}') into v_off
    from sessions x join series s on s.id = x.series_id
    where s.lineage_id = v_lineage and x.date >= v_from and x.status = 'off';

  perform public._cut_series_at(p_session_id);
  v_result := public.create_series(
    p_child_id, p_title, p_start_time, p_end_time, p_weekdays, v_from, p_end_date,
    p_location, p_teacher, p_contact_phone, p_escort, p_note, v_lineage,
    p_remind_minutes, p_remind_email);

  update sessions
    set status = 'off', off_reason = nullif(v_off ->> date::text, '')
    where series_id = (v_result ->> 'series_id')::uuid and v_off ? date::text;
  return v_result;
end $$;

revoke execute on function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text, uuid, smallint, boolean) from anon, public;
grant execute on function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text, uuid, smallint, boolean) to authenticated;
revoke execute on function public.update_series_from(uuid, uuid, text, time, time, smallint[], date, text, text, text, text, text, smallint, boolean) from anon, public;
grant execute on function public.update_series_from(uuid, uuid, text, time, time, smallint[], date, text, text, text, text, text, smallint, boolean) to authenticated;

-- ───────────────────────── Email reminders ─────────────────────────

-- One row per reminder mailed. Keyed on the remind time, so moving a session
-- (or changing how early to remind) sends a fresh reminder.
create table public.reminder_emails (
  session_id uuid not null references public.sessions on delete cascade,
  remind_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (session_id, remind_at)
);
alter table public.reminder_emails enable row level security;
revoke all on public.reminder_emails from anon, authenticated;

-- Claims every email reminder that is due and not sent yet, returning what to mail.
-- Only the Edge Function (service role) may call it.
create function public.claim_email_reminders()
returns table (
  session_id uuid,
  remind_at timestamptz,
  title text,
  child_name text,
  date date,
  start_time time,
  end_time time,
  location text,
  escort text,
  note text,
  remind_minutes smallint,
  recipients text[]
) language sql security definer set search_path = '' as $$
  with due as (
    select x.*, ((x.date + x.start_time) at time zone 'Asia/Ho_Chi_Minh') as starts_at
    from public.sessions x
    where x.remind_email and x.status = 'scheduled'
      and x.date between (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1
                     and (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2
  ), claimed as (
    insert into public.reminder_emails (session_id, remind_at)
    select d.id, d.starts_at - make_interval(mins => d.remind_minutes)
    from due d
    where now() >= d.starts_at - make_interval(mins => d.remind_minutes) and now() < d.starts_at
    on conflict do nothing
    returning reminder_emails.session_id, reminder_emails.remind_at
  )
  select x.id, k.remind_at, x.title, c.name, x.date, x.start_time, x.end_time, x.location, x.escort, x.note,
         x.remind_minutes,
         array(select u.email::text from public.household_members m join auth.users u on u.id = m.user_id
               where m.household_id = x.household_id and u.email is not null)
  from claimed k
  join public.sessions x on x.id = k.session_id
  join public.children c on c.id = x.child_id
$$;
revoke execute on function public.claim_email_reminders() from anon, authenticated, public;
grant execute on function public.claim_email_reminders() to service_role;

-- Every 5 minutes. The function only mails reminders that are due and unclaimed,
-- so calling it more often (or by anyone) cannot send duplicates.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$ select net.http_post(url := 'https://tjjmgafobutofzkylnjy.supabase.co/functions/v1/send-reminders') $$
);
