import { IonIcon, IonRippleEffect, useIonRouter } from '@ionic/react'
import {
  calendarClearOutline,
  carOutline,
  chevronForward,
  documentTextOutline,
  locationOutline,
  megaphoneOutline,
} from 'ionicons/icons'
import type { Child, DayNote, Session } from '../lib/types'
import { hhmm } from '../lib/dates'
import { useNowVN } from '../state/now'
import { ChildAvatar, childLine, tint } from './ChildAvatar'

export interface DayData {
  date: string
  sessions: Session[]
  notes: DayNote[]
}

/**
 * One day's content: the family note, then the sessions by start time. A child's note rides on that child's first
 * session card; notes for a child with no session that day get their own card.
 * Callers pass sessions/notes already filtered by the child filter.
 */
export function DayContent({
  day,
  childById,
  isToday,
  canEdit,
  compact,
  onEditNotes,
  onAddSession,
}: {
  day: DayData
  childById: Map<string, Child>
  isToday: boolean
  canEdit: boolean
  /** week list: one-line family note and a "Chưa có lịch" row on empty days */
  compact?: boolean
  onEditNotes: () => void
  onAddSession: () => void
}) {
  const now = useNowVN()
  const familyNote = day.notes.find((n) => n.child_id === null)
  const childNotes = new Map(
    day.notes.filter((n) => n.child_id !== null && childById.has(n.child_id)).map((n) => [n.child_id!, n.content]),
  )
  const notedChildren = new Set<string>()

  return (
    <div className="space-y-2.5">
      {familyNote ? (
        <FamilyNote content={familyNote.content} compact={compact} onClick={canEdit ? onEditNotes : undefined} />
      ) : (
        !compact && canEdit && <FamilyNote content={null} onClick={onEditNotes} />
      )}

      {day.sessions.map((s) => {
        let childNote: string | undefined
        if (childNotes.has(s.child_id) && !notedChildren.has(s.child_id)) {
          childNote = childNotes.get(s.child_id)
          notedChildren.add(s.child_id)
        }
        return (
          <SessionCard
            key={s.id}
            session={s}
            child={childById.get(s.child_id)}
            childNote={childNote}
            done={isToday && s.status === 'scheduled' && hhmm(s.end_time) <= now}
          />
        )
      })}

      {[...childNotes]
        .filter(([childId]) => !notedChildren.has(childId))
        .map(([childId, content]) => {
          const child = childById.get(childId)!
          return (
            <button
              key={childId}
              type="button"
              disabled={!canEdit}
              onClick={onEditNotes}
              className="note-card block w-full px-4 py-3 text-left text-[14px]"
            >
              <span className="mr-1.5 font-semibold" style={{ color: child.color }}>
                {child.name}:
              </span>
              <span className="whitespace-pre-line">{content}</span>
            </button>
          )
        })}

      {compact && day.sessions.length === 0 && (
        <button
          type="button"
          disabled={!canEdit}
          onClick={onAddSession}
          className="card ion-activatable text-muted relative flex h-12 w-full items-center gap-3 overflow-hidden px-4 text-left"
        >
          <IonRippleEffect />
          <IonIcon icon={calendarClearOutline} className="text-xl" />
          <span className="flex-1">Chưa có lịch</span>
          {canEdit && <IonIcon icon={chevronForward} className="opacity-70" />}
        </button>
      )}
    </div>
  )
}

/** Peach note for the whole family; `content: null` invites adding one. */
function FamilyNote({
  content,
  compact,
  onClick,
}: {
  content: string | null
  compact?: boolean
  onClick?: () => void
}) {
  if (compact) {
    return (
      <button
        type="button"
        disabled={!onClick}
        onClick={onClick}
        className="note-card flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px]"
      >
        <IonIcon icon={megaphoneOutline} className="shrink-0 text-xl text-(--app-note-fg)" />
        <span className="flex-1 whitespace-pre-line text-(--app-note-fg)">{content}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`note-card ion-activatable relative flex w-full items-center gap-3 overflow-hidden px-4 py-3.5 text-left ${
        content === null ? 'opacity-70' : ''
      }`}
    >
      <IonRippleEffect />
      <IonIcon icon={documentTextOutline} className="shrink-0 text-[26px] text-(--app-note-fg)" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-(--app-note-fg)">Ghi chú gia đình</span>
        <span className="block text-[14px] whitespace-pre-line">{content ?? 'Chạm để thêm ghi chú cho cả nhà'}</span>
      </span>
      {onClick && <IonIcon icon={chevronForward} className="shrink-0 text-(--app-note-fg)" />}
    </button>
  )
}

export function SessionCard({
  session,
  child,
  childNote,
  done,
}: {
  session: Session
  child?: Child
  /** that child's note for the day, shown as a pill */
  childNote?: string
  done?: boolean
}) {
  const off = session.status === 'off'
  const router = useIonRouter()
  const color = child?.color ?? '#94a3b8'
  const pill = [session.note, childNote].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={() => router.push(`/buoi/${session.id}`, 'forward')}
      className="card ion-activatable relative flex w-full gap-3 overflow-hidden p-3.5 text-left"
    >
      <IonRippleEffect />
      <div className={`shrink-0 whitespace-nowrap tabular-nums ${off ? 'opacity-50' : ''}`}>
        <div className="text-[16px] font-semibold">{hhmm(session.start_time)}</div>
        <div className="text-muted text-[16px]">{hhmm(session.end_time)}</div>
      </div>
      <div className="w-px shrink-0 self-stretch bg-(--app-border)" />
      <div className="min-w-0 flex-1">
        <div className="flex gap-3">
          {child && (
            <div className={off ? 'opacity-50' : ''}>
              <ChildAvatar child={child} size="size-12 text-[17px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`truncate text-[16px] font-semibold ${off ? 'text-muted line-through' : ''}`}>
                {session.title}
              </span>
              {done && (
                <span className="shrink-0 rounded-full bg-(--app-track) px-2 py-0.5 text-[11px] font-medium text-muted">
                  Đã xong
                </span>
              )}
            </div>
            {child && (
              <div className="truncate text-[14px]" style={{ color }}>
                {childLine(child)}
              </div>
            )}
            {off && (
              <div
                className="mt-1 inline-block rounded-lg px-2 py-0.5 text-[12px] font-medium"
                style={{ backgroundColor: tint('#d9534a', 14), color: '#d9534a' }}
              >
                Nghỉ{session.off_reason ? `: ${session.off_reason}` : ''}
              </div>
            )}
            {session.location && (
              <div className="text-muted mt-1 flex items-center gap-1.5 text-[13px]">
                <IonIcon icon={locationOutline} className="shrink-0 text-base" />
                <span className="truncate">{session.location}</span>
              </div>
            )}
            {session.escort && (
              <div className="text-muted mt-0.5 flex items-center gap-1.5 text-[13px]">
                <IonIcon icon={carOutline} className="shrink-0 text-base" />
                <span className="truncate">{session.escort} đưa đón</span>
              </div>
            )}
          </div>
          <IonIcon icon={chevronForward} className="text-muted mt-1 shrink-0 opacity-70" />
        </div>
        {pill && (
          <div className="note-card mt-2.5 flex items-start gap-2 rounded-xl px-3 py-1.5 text-[12px]">
            <IonIcon icon={documentTextOutline} className="mt-px shrink-0 text-[15px] text-(--app-note-fg)" />
            <span className="whitespace-pre-line text-(--app-note-fg)">{pill}</span>
          </div>
        )}
      </div>
    </button>
  )
}

/** Colours of the children with a class that day (off sessions excluded). */
export function dayColors(day: DayData | undefined, childById: Map<string, Child>): string[] {
  const scheduled = day?.sessions.filter((s) => s.status === 'scheduled') ?? []
  return [...new Set(scheduled.map((s) => childById.get(s.child_id)?.color ?? '#94a3b8'))]
}

export function Dots({ colors }: { colors: string[] }) {
  return (
    <span className="flex h-1.5 gap-0.5">
      {colors.slice(0, 4).map((c) => (
        <span key={c} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
      ))}
    </span>
  )
}

export function NoSessions() {
  return (
    <div className="card text-muted flex flex-col items-center gap-2 px-4 py-8 text-center">
      <IonIcon icon={calendarClearOutline} className="text-3xl opacity-70" />
      <p className="text-[14px]">Không có buổi học nào</p>
    </div>
  )
}
