import { AppLink } from './AppLink'
import type { Child, DayNote, Session } from '../lib/types'
import { formatDayShort, hhmm } from '../lib/dates'
import { useNowVN } from '../state/now'
import { Icon } from './Icon'

export interface DayData {
  date: string
  sessions: Session[]
  notes: DayNote[]
}

/**
 * One day: family note, per-child notes, then sessions by start time.
 * Callers pass sessions/notes already filtered by the child filter.
 */
export function DayBlock({
  day,
  childById,
  showChildName,
  isToday,
  canEdit,
  hideHeader,
  onEditNotes,
  onAddSession,
}: {
  day: DayData
  childById: Map<string, Child>
  showChildName: boolean
  isToday: boolean
  canEdit: boolean
  hideHeader?: boolean
  onEditNotes: () => void
  onAddSession: () => void
}) {
  const familyNote = day.notes.find((n) => n.child_id === null)
  const childNotes = day.notes.filter((n) => n.child_id !== null && childById.has(n.child_id))
  const empty = day.sessions.length === 0 && day.notes.length === 0
  const now = useNowVN()

  return (
    <section>
      {!hideHeader && (
        <div className="mb-2 flex items-center gap-2">
          <h2 className={`font-semibold ${isToday ? 'text-sky-600 dark:text-sky-400' : ''}`}>
            {formatDayShort(day.date)}
          </h2>
          {isToday && (
            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-medium text-white">Hôm nay</span>
          )}
          <div className="flex-1" />
          {canEdit && (
            <>
              <button className="rounded-full p-1.5 text-slate-500" onClick={onEditNotes} aria-label="Ghi chú ngày">
                <Icon name="note" />
              </button>
              <button className="rounded-full p-1.5 text-slate-500" onClick={onAddSession} aria-label="Thêm buổi học">
                <Icon name="plus" />
              </button>
            </>
          )}
        </div>
      )}

      {empty ? (
        <p className="pb-1 text-sm text-slate-400 dark:text-slate-500">Không có lịch</p>
      ) : (
        <div className="space-y-2">
          {familyNote && (
            <NoteBox label="Cả nhà" color="#f59e0b" content={familyNote.content} onClick={canEdit ? onEditNotes : undefined} />
          )}
          {childNotes.map((n) => {
            const child = childById.get(n.child_id!)!
            return (
              <NoteBox
                key={n.id}
                label={child.name}
                color={child.color}
                content={n.content}
                onClick={canEdit ? onEditNotes : undefined}
              />
            )
          })}
          {day.sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              child={childById.get(s.child_id)}
              showChildName={showChildName}
              done={isToday && s.status === 'scheduled' && hhmm(s.end_time) <= now}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function NoteBox({ label, color, content, onClick }: { label: string; color: string; content: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="block w-full rounded-xl bg-amber-50 px-3 py-2 text-left text-sm disabled:cursor-default dark:bg-amber-950/40"
    >
      <span className="mr-1.5 font-semibold" style={{ color }}>
        {label}:
      </span>
      <span className="whitespace-pre-line text-slate-700 dark:text-slate-200">{content}</span>
    </button>
  )
}

export function SessionCard({
  session,
  child,
  showChildName,
  done,
}: {
  session: Session
  child?: Child
  showChildName: boolean
  done?: boolean
}) {
  const off = session.status === 'off'
  return (
    <AppLink
      to={`/buoi/${session.id}`}
      className={`card flex overflow-hidden active:bg-slate-50 dark:active:bg-slate-800 ${off ? 'opacity-60' : ''}`}
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: child?.color ?? '#94a3b8' }} />
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold tabular-nums ${off ? 'line-through' : ''}`}>
            {hhmm(session.start_time)}–{hhmm(session.end_time)}
          </span>
          <span className={`truncate font-medium ${off ? 'line-through' : ''}`}>{session.title}</span>
          {done && (
            <span className="ml-auto shrink-0 self-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Đã xong
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-500 dark:text-slate-400">
          {showChildName && child && (
            <span className="font-medium" style={{ color: child.color }}>
              {child.name}
            </span>
          )}
          {off && <span className="font-medium text-rose-600">Nghỉ{session.off_reason ? `: ${session.off_reason}` : ''}</span>}
          {session.location && (
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" className="size-3.5" />
              {session.location}
            </span>
          )}
          {session.escort && (
            <span className="inline-flex items-center gap-1">
              <Icon name="car" className="size-3.5" />
              {session.escort}
            </span>
          )}
        </div>
        {session.note && <p className="mt-1 text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">{session.note}</p>}
      </div>
    </AppLink>
  )
}
