import { useMemo } from 'react'
import type { DayData } from '../components/DayBlock'
import { addDaysISO, datesBetween } from '../lib/dates'
import type { Child, DayNote, Session } from '../lib/types'
import { useChildFilter } from '../state/childFilter'
import { useChildren, useDayNotePages, useDayNotesRange, useSessionPages, useSessionsRange } from './queries'

const NO_CHILDREN: Child[] = []

/** Group sessions and notes by date over [from, to], keeping only the selected child (and family-wide notes). */
function useGrouped(from: string, to: string, sessions: Session[] | undefined, notes: DayNote[] | undefined) {
  const childrenQuery = useChildren()
  const [selectedChild] = useChildFilter()
  const children = childrenQuery.data ?? NO_CHILDREN
  // Ignore a remembered filter for a child that no longer exists
  const filter = children.some((c) => c.id === selectedChild) ? selectedChild : null

  const grouped = useMemo(() => {
    const childById = new Map<string, Child>(children.map((c) => [c.id, c]))
    const byDate = new Map<string, DayData>(
      datesBetween(from, to).map((d) => [d, { date: d, sessions: [], notes: [] }]),
    )
    for (const s of sessions ?? []) {
      if (filter && s.child_id !== filter) continue
      byDate.get(s.date)?.sessions.push(s)
    }
    for (const n of notes ?? []) {
      if (filter && n.child_id !== null && n.child_id !== filter) continue
      byDate.get(n.date)?.notes.push(n)
    }
    return { childById, byDate }
  }, [children, sessions, notes, from, to, filter])

  return {
    ...grouped,
    children,
    allNotes: notes ?? [],
    showChildName: filter === null && children.length > 1,
    childrenQuery,
  }
}

/** Sessions and notes for each date in [from, to], filtered by the selected child. */
export function useDays(from: string, to: string) {
  const sessionsQuery = useSessionsRange(from, to)
  const notesQuery = useDayNotesRange(from, to)
  const { childrenQuery, ...days } = useGrouped(from, to, sessionsQuery.data, notesQuery.data)
  return {
    ...days,
    childrenLoading: childrenQuery.isPending,
    loading: childrenQuery.isPending || sessionsQuery.isPending || notesQuery.isPending,
    error: childrenQuery.error ?? sessionsQuery.error ?? notesQuery.error,
  }
}

const NO_SESSION_PAGES: Session[][] = []
const NO_NOTE_PAGES: DayNote[][] = []

/**
 * Endless day list starting at `from`, `pageDays` days per page (TanStack infinite queries).
 * `to` is the last loaded date; `loadMore()` fetches only the next page and resolves once it is on screen.
 */
export function useDayPages(from: string, pageDays: number) {
  const sessionsQuery = useSessionPages(from, pageDays)
  const notesQuery = useDayNotePages(from, pageDays)
  const sessionPages = sessionsQuery.data?.pages ?? NO_SESSION_PAGES
  const notePages = notesQuery.data?.pages ?? NO_NOTE_PAGES
  // Show a page only once both its sessions and its notes are in
  const pages = Math.max(1, Math.min(sessionPages.length, notePages.length))
  const to = addDaysISO(from, pages * pageDays - 1)
  const sessions = useMemo(() => sessionPages.slice(0, pages).flat(), [sessionPages, pages])
  const notes = useMemo(() => notePages.slice(0, pages).flat(), [notePages, pages])
  const { childrenQuery, ...days } = useGrouped(from, to, sessions, notes)

  return {
    ...days,
    to,
    loading: childrenQuery.isPending || sessionsQuery.isPending || notesQuery.isPending,
    error: childrenQuery.error ?? sessionsQuery.error ?? notesQuery.error,
    loadMore: () => Promise.all([sessionsQuery.fetchNextPage(), notesQuery.fetchNextPage()]),
  }
}
