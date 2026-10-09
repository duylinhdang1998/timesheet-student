import { useMemo } from 'react'
import type { DayData } from '../components/DayBlock'
import { datesBetween } from '../lib/dates'
import type { Child } from '../lib/types'
import { useChildFilter } from '../state/childFilter'
import { useChildren, useDayNotesRange, useSessionsRange } from './queries'

const NO_CHILDREN: Child[] = []

/** Sessions and notes for each date in [from, to], filtered by the selected child. */
export function useDays(from: string, to: string) {
  const childrenQuery = useChildren()
  const sessionsQuery = useSessionsRange(from, to)
  const notesQuery = useDayNotesRange(from, to)
  const [selectedChild] = useChildFilter()

  const children = childrenQuery.data ?? NO_CHILDREN
  // Ignore a remembered filter for a child that no longer exists
  const filter = children.some((c) => c.id === selectedChild) ? selectedChild : null

  const result = useMemo(() => {
    const childById = new Map<string, Child>(children.map((c) => [c.id, c]))
    const byDate = new Map<string, DayData>(datesBetween(from, to).map((d) => [d, { date: d, sessions: [], notes: [] }]))
    for (const s of sessionsQuery.data ?? []) {
      if (filter && s.child_id !== filter) continue
      byDate.get(s.date)?.sessions.push(s)
    }
    for (const n of notesQuery.data ?? []) {
      if (filter && n.child_id !== null && n.child_id !== filter) continue
      byDate.get(n.date)?.notes.push(n)
    }
    return { childById, byDate }
  }, [children, sessionsQuery.data, notesQuery.data, from, to, filter])

  return {
    ...result,
    children,
    allNotes: notesQuery.data ?? [],
    showChildName: filter === null && children.length > 1,
    loading: childrenQuery.isPending || sessionsQuery.isPending || notesQuery.isPending,
    error: childrenQuery.error ?? sessionsQuery.error ?? notesQuery.error,
  }
}
