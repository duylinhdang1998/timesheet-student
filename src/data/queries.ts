import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { hhmm } from '../lib/dates'
import type { Child, DayNote, Invite, Member, Membership, Series, Session } from '../lib/types'
import { useHousehold } from '../state/household'

async function unwrap<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await query
  if (error) throw error
  return data as T
}

export function useMembership(userId: string | undefined) {
  return useQuery({
    queryKey: ['membership', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      unwrap<Membership | null>(
        supabase
          .from('household_members')
          .select('household_id, user_id, role, display_name, households(name)')
          .eq('user_id', userId!)
          .maybeSingle(),
      ),
  })
}

export function useChildren() {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['children', householdId],
    queryFn: () =>
      unwrap<Child[]>(supabase.from('children').select('*').eq('household_id', householdId).order('created_at')),
  })
}

export function useSessionsRange(from: string, to: string) {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['sessions', householdId, from, to],
    queryFn: () =>
      unwrap<Session[]>(
        supabase
          .from('sessions')
          .select('*')
          .eq('household_id', householdId)
          .gte('date', from)
          .lte('date', to)
          .order('date')
          .order('start_time'),
      ),
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['session', id],
    enabled: Boolean(id),
    queryFn: () => unwrap<Session | null>(supabase.from('sessions').select('*').eq('id', id!).maybeSingle()),
  })
}

export function useSeries(id: string | null | undefined) {
  return useQuery({
    queryKey: ['series', id],
    enabled: Boolean(id),
    queryFn: () => unwrap<Series | null>(supabase.from('series').select('*').eq('id', id!).maybeSingle()),
  })
}

export function useDayNotesRange(from: string, to: string) {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['day_notes', householdId, from, to],
    queryFn: () =>
      unwrap<DayNote[]>(
        supabase.from('day_notes').select('*').eq('household_id', householdId).gte('date', from).lte('date', to),
      ),
  })
}

export function useMembers() {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['members', householdId],
    queryFn: () =>
      unwrap<Member[]>(
        supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at'),
      ),
  })
}

export function useInvites(enabled: boolean) {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['invites', householdId],
    enabled,
    queryFn: () =>
      unwrap<Invite[]>(
        supabase
          .from('invites')
          .select('*')
          .eq('household_id', householdId)
          .is('used_by', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ),
  })
}

export function useEscortSuggestions() {
  const { householdId } = useHousehold()
  return useQuery({
    queryKey: ['escorts', householdId],
    queryFn: async () => {
      const rows = await unwrap<unknown[]>(supabase.rpc('escort_suggestions'))
      // PostgREST returns setof scalar either as bare values or as {fn_name: value}
      return rows.map((r) => (typeof r === 'string' ? r : String(Object.values(r as object)[0])))
    },
  })
}

/**
 * Returns the child's scheduled session that overlaps the given time, if any.
 * The database enforces this too; checking first lets us name the conflicting session.
 */
export async function findOverlap(params: {
  childId: string
  date: string
  start: string
  end: string
  excludeId?: string
}): Promise<Session | null> {
  let query = supabase
    .from('sessions')
    .select('*')
    .eq('child_id', params.childId)
    .eq('date', params.date)
    .eq('status', 'scheduled')
    .lt('start_time', params.end)
    .gt('end_time', params.start)
  if (params.excludeId) query = query.neq('id', params.excludeId)
  const rows = await unwrap<Session[]>(query.limit(1))
  return rows[0] ?? null
}

export function overlapMessage(other: Session): string {
  return `Trùng giờ với buổi “${other.title}” (${hhmm(other.start_time)}–${hhmm(other.end_time)}). Hãy chuyển buổi đó sang Nghỉ hoặc xoá trước.`
}

export { unwrap }
