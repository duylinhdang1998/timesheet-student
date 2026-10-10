-- In-app account deletion (required by the App Store for apps with sign-up).
-- The last member takes the whole household with them; an owner who leaves others behind hands
-- ownership to the longest-standing editor (else the longest-standing member), so the family keeps its data.

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_member household_members;
  v_heir uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;

  select * into v_member from household_members where user_id = v_uid for update;
  if found then
    select user_id into v_heir from household_members
      where household_id = v_member.household_id and user_id <> v_uid
      order by role = 'editor' desc, created_at
      limit 1;
    if v_heir is null then
      delete from households where id = v_member.household_id;
    elsif v_member.role = 'owner' then
      update household_members set role = 'owner'
        where household_id = v_member.household_id and user_id = v_heir;
    end if;
  end if;

  -- cascades to household_members; invites keep their rows with created_by/used_by set to null
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;
