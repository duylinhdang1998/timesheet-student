-- "Buổi này và các buổi sau" splits a series in two. Without a link between the parts,
-- a later "this and following" on the first part would leave the second part behind.
-- Every series now carries the lineage it was split from; cuts apply to the whole tail.

alter table public.series add column lineage_id uuid;
update public.series set lineage_id = id;
alter table public.series alter column lineage_id set not null;
create index series_lineage on public.series (lineage_id, start_date);

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
  p_lineage_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_household uuid;
  v_series uuid := gen_random_uuid();
begin
  select household_id into v_household from children where id = p_child_id;
  if v_household is null then raise exception 'Không tìm thấy bé'; end if;
  insert into series (id, lineage_id, household_id, child_id, title, start_time, end_time, weekdays,
                      start_date, end_date, location, teacher, contact_phone, escort, note)
  values (v_series, coalesce(p_lineage_id, v_series), v_household, p_child_id, trim(p_title), p_start_time,
          p_end_time, p_weekdays, p_start_date, p_end_date, p_location, p_teacher, p_contact_phone, p_escort, p_note);
  return public._generate_series_sessions(v_series, p_start_date);
end $$;

-- the old 12-argument overload would make PostgREST calls ambiguous
drop function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text);

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
    update series set end_date = o_from - 1 where id = o_series.id;
  end if;
end $$;

create or replace function public.update_series_from(
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
    p_location, p_teacher, p_contact_phone, p_escort, p_note, v_lineage);

  update sessions
    set status = 'off', off_reason = nullif(v_off ->> date::text, '')
    where series_id = (v_result ->> 'series_id')::uuid and v_off ? date::text;
  return v_result;
end $$;

revoke execute on function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text, uuid) from anon, public;
grant execute on function public.create_series(uuid, text, time, time, smallint[], date, date, text, text, text, text, text, uuid) to authenticated;
