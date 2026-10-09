import { useState } from 'react'
import { useAppNavigate } from '../state/pageTransition'
import { ChildFilterBar, TopBar } from '../components/TopBar'
import { DayBlock } from '../components/DayBlock'
import { DayNotesSheet } from '../components/DayNotesSheet'
import { Fab } from '../components/BottomNav'
import { EmptyChildren, ErrorBox, Loading } from '../components/States'
import { DateTimeField } from '../components/DateTimeField'
import { useDays } from '../data/days'
import { addDaysISO, datesBetween, todayVN } from '../lib/dates'
import { useHousehold } from '../state/household'

const PAGE = 7

type View = 'today' | 'week'
const VIEW_KEY = 'agenda-view'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'today'
  } catch {
    return 'today'
  }
}

export function AgendaPage() {
  const navigate = useAppNavigate()
  const { canEdit } = useHousehold()
  const today = todayVN()
  // Remembered so that opening a session and coming back keeps the chosen view
  const [view, setView] = useState<View>(readView)
  const [from, setFrom] = useState(today)
  const [days, setDays] = useState(PAGE)
  const start = view === 'today' ? today : from
  const to = view === 'today' ? today : addDaysISO(from, days - 1)
  const { byDate, childById, children, allNotes, showChildName, loading, error } = useDays(start, to)
  const [notesDate, setNotesDate] = useState<string | null>(null)

  const jumpTo = (date: string) => {
    setFrom(date)
    setDays(PAGE)
    window.scrollTo({ top: 0 })
  }

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // storage unavailable: view just won't be remembered
    }
    if (next === 'week') jumpTo(today)
  }

  return (
    <>
      <TopBar title="Lịch học">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 pb-2.5">
          {(['today', 'week'] as const).map((v) => (
            <button
              key={v}
              className={`${view === v ? 'btn-primary' : 'btn-secondary'} px-3 py-1.5 text-sm`}
              aria-pressed={view === v}
              onClick={() => changeView(v)}
            >
              {v === 'today' ? 'Hôm nay' : 'Lịch trong tuần'}
            </button>
          ))}
          {view === 'week' && (
            <DateTimeField
              type="date"
              aria-label="Đi tới ngày"
              className="ml-auto w-auto min-w-0 py-1.5 text-sm"
              value={from}
              onChange={(d) => d && jumpTo(d)}
            />
          )}
        </div>
        <ChildFilterBar />
      </TopBar>

      <main className="mx-auto max-w-md space-y-5 px-4 py-4">
        {error && <ErrorBox error={error} />}
        {loading ? (
          <Loading />
        ) : children.length === 0 ? (
          <EmptyChildren />
        ) : (
          <>
            {datesBetween(start, to).map((date) => (
              <DayBlock
                key={date}
                day={byDate.get(date)!}
                childById={childById}
                showChildName={showChildName}
                isToday={date === today}
                canEdit={canEdit}
                onEditNotes={() => setNotesDate(date)}
                onAddSession={() => navigate(`/buoi/moi?ngay=${date}`)}
              />
            ))}
            {view === 'week' && (
              <button className="btn-secondary w-full" onClick={() => setDays(days + PAGE)}>
                Xem thêm {PAGE} ngày
              </button>
            )}
          </>
        )}
      </main>

      {canEdit && children.length > 0 && <Fab onClick={() => navigate(`/buoi/moi?ngay=${start}`)} />}
      {notesDate && (
        <DayNotesSheet
          date={notesDate}
          notes={allNotes.filter((n) => n.date === notesDate)}
          kids={children}
          onClose={() => setNotesDate(null)}
        />
      )}
    </>
  )
}
