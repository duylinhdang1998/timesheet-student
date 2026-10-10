-- A series may now repeat with no end date ("Không kết thúc"), and a dated series may run up to 5 years.
-- Dated series are still materialised in full. Open-ended ones are materialised 5 years at a time:
-- start … start + 5 years, and once that last day arrives a daily cron job adds the next 5 years.
-- `generated_until` records how far sessions exist.

alter table public.series drop constraint series_check1;
alter table public.series alter column end_date drop not null;
alter table public.series add constraint series_end_date_check check (end_date is null or end_date >= start_date);
alter table public.series add column generated_until date;
update public.series set generated_until = end_date;

create or replace function public._generate_series_sessions(p_series_id uuid, p_from date)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  s series;
  d date;
  v_to date;
  v_created int := 0;
  v_skipped date[] := '{}';
begin
  select * into s from series where id = p_series_id;
  -- open-ended: the next 5-year block after what already exists
  v_to := coalesce(s.end_date, (coalesce(s.generated_until, s.start_date) + interval '5 years')::date);
  for d in select generate_series(greatest(p_from, s.start_date), v_to, interval '1 day')::date loop
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
  update series set generated_until = greatest(coalesce(generated_until, v_to), v_to) where id = s.id;
  return jsonb_build_object('series_id', s.id, 'created', v_created, 'skipped', to_jsonb(v_skipped));
end $$;

create or replace function public.create_series(
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
  if p_end_date > (p_start_date + interval '5 years')::date then
    raise exception 'Lịch lặp có ngày kết thúc tối đa 5 năm. Muốn lâu hơn, hãy chọn "Không kết thúc".';
  end if;
  insert into series (id, lineage_id, household_id, child_id, title, start_time, end_time, weekdays,
                      start_date, end_date, location, teacher, contact_phone, escort, note,
                      remind_minutes, remind_email)
  values (v_series, coalesce(p_lineage_id, v_series), v_household, p_child_id, trim(p_title), p_start_time,
          p_end_time, p_weekdays, p_start_date, p_end_date, p_location, p_teacher, p_contact_phone, p_escort, p_note,
          p_remind_minutes, p_remind_email);
  return public._generate_series_sessions(v_series, p_start_date);
end $$;

create or replace function public._cut_series_at(p_session_id uuid, out o_series series, out o_from date)
language plpgsql security invoker set search_path = public as $$
begin
  select x.date into o_from from sessions x where x.id = p_session_id;
  select s.* into o_series from series s join sessions x on x.series_id = s.id where x.id = p_session_id;
  if o_series.id is null then raise exception 'Buổi này không thuộc lịch lặp'; end if;

  -- later parts of the same lineage go entirely
  delete from sessions where series_id in (
    select id from series where lineage_id = o_series.lineage_id and id <> o_series.id and start_date >= o_from);
  delete from series where lineage_id = o_series.lineage_id and id <> o_series.id and start_date >= o_from;

  delete from sessions where series_id = o_series.id and date >= o_from;
  if o_from <= o_series.start_date then
    delete from series where id = o_series.id;
  else
    update series set end_date = o_from - 1, generated_until = least(generated_until, o_from - 1)
      where id = o_series.id;
  end if;
end $$;

-- Adds the next 5 years to every open-ended series whose sessions run out today or earlier.
-- Run daily by cron; days that clash with another session of the child are skipped,
-- as when the series was created.
create function public.extend_open_series() returns void
language plpgsql security definer set search_path = public as $$
declare
  s record;
begin
  for s in
    select id, generated_until from series
    where end_date is null and generated_until <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
  loop
    perform public._generate_series_sessions(s.id, s.generated_until + 1);
  end loop;
end $$;
revoke execute on function public.extend_open_series() from anon, authenticated, public;

-- 00:05 Vietnam time
select cron.schedule('extend-open-series', '5 17 * * *', $$ select public.extend_open_series() $$);
