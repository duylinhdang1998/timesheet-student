-- Fixes from Supabase security/performance advisors after the initial migration.

alter function public.touch_updated_at() set search_path = '';

-- Supabase's own event-trigger helper; the blanket grant in init made it RPC-callable.
revoke execute on function public.rls_auto_enable() from authenticated;

-- Evaluate auth.uid() once per statement instead of once per row
alter policy "edit own display name" on public.household_members
  using (user_id = (select auth.uid()));
alter policy "owner removes others" on public.household_members
  using (household_id = public.my_household_id() and public.my_role() = 'owner' and user_id <> (select auth.uid()));

create index children_household on public.children (household_id);
create index series_household on public.series (household_id);
create index series_child on public.series (child_id);
create index day_notes_child on public.day_notes (child_id);
create index invites_household on public.invites (household_id);
