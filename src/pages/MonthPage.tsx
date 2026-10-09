import { useState } from 'react'
import { useAppNavigate } from '../state/pageTransition'
import { addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { ChildFilterBar, TopBar } from '../components/TopBar'
import { DayBlock } from '../components/DayBlock'
import { DayNotesSheet } from '../components/DayNotesSheet'
import { Fab } from '../components/BottomNav'
import { Icon } from '../components/Icon'
import { EmptyChildren, ErrorBox, Loading } from '../components/States'
import { useDays } from '../data/days'
import { datesBetween, formatDayLong, parseISODate, toISODate, todayVN } from '../lib/dates'
import { useHousehold } from '../state/household'

const WEEK_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function MonthPage() {
  const navigate = useAppNavigate()
  const { canEdit } = useHousehold()
  const today = todayVN()
  const [month, setMonth] = useState(() => startOfMonth(parseISODate(today)))
  const [selected, setSelected] = useState(today)
  const [notesOpen, setNotesOpen] = useState(false)

  const gridFrom = toISODate(startOfWeek(month, { weekStartsOn: 1 }))
  const gridTo = toISODate(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }))
  const { byDate, childById, children, allNotes, showChildName, loading, error } = useDays(gridFrom, gridTo)
  const monthKey = format(month, 'yyyy-MM')

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta)
    setMonth(next)
    setSelected(format(next, 'yyyy-MM') === today.slice(0, 7) ? today : toISODate(next))
  }

  const selectedDay = byDate.get(selected)

  return (
    <>
      <TopBar title="Lịch tháng">
        <ChildFilterBar />
      </TopBar>

      <main className="mx-auto max-w-md px-4 py-4">
        {error && <ErrorBox error={error} />}
        <div className="mb-3 flex items-center justify-between">
          <button className="rounded-full p-2" onClick={() => changeMonth(-1)} aria-label="Tháng trước">
            <Icon name="prev" />
          </button>
          <h2 className="font-semibold">Tháng {format(month, 'M/yyyy')}</h2>
          <button className="rounded-full p-2" onClick={() => changeMonth(1)} aria-label="Tháng sau">
            <Icon name="next" />
          </button>
        </div>

        <div className="card grid grid-cols-7 gap-y-1 p-2 text-center">
          {WEEK_HEADER.map((d) => (
            <div key={d} className="py-1 text-xs font-medium text-slate-400">
              {d}
            </div>
          ))}
          {datesBetween(gridFrom, gridTo).map((date) => {
            const day = byDate.get(date)
            const inMonth = date.startsWith(monthKey)
            const scheduled = day?.sessions.filter((s) => s.status === 'scheduled') ?? []
            const colors = [...new Set(scheduled.map((s) => childById.get(s.child_id)?.color ?? '#94a3b8'))]
            const isSelected = date === selected
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                className={`relative flex h-12 flex-col items-center justify-start rounded-xl pt-1 ${
                  isSelected ? 'bg-sky-500 text-white' : date === today ? 'text-sky-600 dark:text-sky-400' : ''
                } ${inMonth ? '' : 'opacity-35'}`}
              >
                <span className={`text-sm ${date === today ? 'font-bold' : ''}`}>{Number(date.slice(8))}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {colors.slice(0, 4).map((c) => (
                    <span key={c} className="size-1.5 rounded-full ring-1 ring-white/70" style={{ backgroundColor: c }} />
                  ))}
                </span>
                {(day?.notes.length ?? 0) > 0 && (
                  <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-amber-400" aria-label="Có ghi chú" />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <h3 className="mb-2 font-semibold">{formatDayLong(selected)}</h3>
          {loading ? (
            <Loading />
          ) : children.length === 0 ? (
            <EmptyChildren />
          ) : (
            selectedDay && (
              <>
                <DayBlock
                  day={selectedDay}
                  childById={childById}
                  showChildName={showChildName}
                  isToday={selected === today}
                  canEdit={canEdit}
                  hideHeader
                  onEditNotes={() => setNotesOpen(true)}
                  onAddSession={() => navigate(`/buoi/moi?ngay=${selected}`)}
                />
                {canEdit && (
                  <button className="btn-secondary mt-3 w-full" onClick={() => setNotesOpen(true)}>
                    <Icon name="note" /> Ghi chú ngày này
                  </button>
                )}
              </>
            )
          )}
        </div>
      </main>

      {canEdit && children.length > 0 && <Fab onClick={() => navigate(`/buoi/moi?ngay=${selected}`)} />}
      {notesOpen && (
        <DayNotesSheet
          date={selected}
          notes={allNotes.filter((n) => n.date === selected)}
          kids={children}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </>
  )
}
