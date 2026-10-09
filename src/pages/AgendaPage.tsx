import { useRef, useState, type TouchEvent } from 'react'
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { calendarClearOutline, chevronBack, chevronForward, createOutline } from 'ionicons/icons'
import { AddScheduleButton, ChildFilterBar, LargeHeader, PullToRefresh, SectionTitle } from '../components/Page'
import { DayContent, Dots, NoSessions, dayColors, type DayData } from '../components/DayBlock'
import { DayNotesModal } from '../components/DayNotesModal'
import { NewSessionSheet } from '../components/SessionSheet'
import { EmptyChildren, ErrorBox, Loading } from '../components/States'
import { useDayPages, useDays } from '../data/days'
import {
  addDaysISO,
  datesBetween,
  formatDayFull,
  formatDayTitle,
  formatWeekRange,
  isoWeekday,
  todayVN,
  weekdayLabel,
  weekStart,
} from '../lib/dates'
import type { Child } from '../lib/types'
import { useHousehold } from '../state/household'

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
  const content = useRef<HTMLIonContentElement>(null)
  const today = todayVN()
  // Remembered so that reopening the app keeps the chosen view
  const [view, setView] = useState<View>(readView)
  // "Hôm nay": the selected day of the week strip; "Trong tuần": the Monday the list starts at
  const [selected, setSelected] = useState(today)
  const [monday, setMonday] = useState(() => weekStart(today))
  const [jumpOpen, setJumpOpen] = useState(false)
  const [addDate, setAddDate] = useState<string | null>(null)
  const [notesDate, setNotesDate] = useState<string | null>(null)

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // storage unavailable: view just won't be remembered
    }
    setSelected(today)
    setMonday(weekStart(today))
    void content.current?.scrollToTop()
  }

  const jumpTo = (date: string) => {
    if (view === 'today') setSelected(date)
    else setMonday(weekStart(date))
    void content.current?.scrollToTop(300)
  }

  return (
    <IonPage>
      <LargeHeader
        eyebrow={formatDayFull(today)}
        title="Lịch học"
        end={
          <IonButton fill="clear" onClick={() => setJumpOpen(true)} aria-label="Chọn ngày">
            <IonIcon slot="icon-only" icon={calendarClearOutline} />
          </IonButton>
        }
      >
        <IonSegment value={view} onIonChange={(e) => changeView(e.detail.value as View)} className="full">
          <IonSegmentButton value="today">
            <IonLabel>Hôm nay</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="week">
            <IonLabel>Trong tuần</IonLabel>
          </IonSegmentButton>
        </IonSegment>
        <ChildFilterBar />
      </LargeHeader>

      <IonContent ref={content}>
        <PullToRefresh />
        {view === 'today' ? (
          <DayView
            selected={selected}
            today={today}
            onSelect={setSelected}
            onAdd={setAddDate}
            onEditNotes={setNotesDate}
          />
        ) : (
          <WeekView
            monday={monday}
            today={today}
            onMove={(days) => jumpTo(addDaysISO(monday, days))}
            onAdd={setAddDate}
            onEditNotes={setNotesDate}
          />
        )}
      </IonContent>

      {/* Xong/Huỷ inside IonDatetime close the modal */}
      <IonModal isOpen={jumpOpen} onDidDismiss={() => setJumpOpen(false)} className="picker-modal">
        <IonDatetime
          presentation="date"
          locale="vi-VN"
          firstDayOfWeek={1}
          value={view === 'today' ? selected : monday}
          showDefaultButtons
          doneText="Xong"
          cancelText="Huỷ"
          onIonChange={(e) => {
            const v = e.detail.value
            if (typeof v === 'string') jumpTo(v.slice(0, 10))
          }}
        />
      </IonModal>

      {addDate && <NewSessionSheet date={addDate} onClose={() => setAddDate(null)} />}
      {notesDate && <NotesFor date={notesDate} onClose={() => setNotesDate(null)} />}
    </IonPage>
  )
}

/** Notes editor for one day; loads that day's notes itself so any view can open it. */
function NotesFor({ date, onClose }: { date: string; onClose: () => void }) {
  const { allNotes, children, loading } = useDays(date, date)
  if (loading) return null
  return <DayNotesModal date={date} notes={allNotes} kids={children} onClose={onClose} />
}

// ───────────────────────── Hôm nay ─────────────────────────

function DayView({
  selected,
  today,
  onSelect,
  onAdd,
  onEditNotes,
}: {
  selected: string
  today: string
  onSelect: (date: string) => void
  onAdd: (date: string) => void
  onEditNotes: (date: string) => void
}) {
  const { canEdit } = useHousehold()
  const monday = weekStart(selected)
  const { byDate, childById, children, childrenLoading, loading, error } = useDays(monday, addDaysISO(monday, 6))
  const day = byDate.get(selected)
  const count = day?.sessions.length ?? 0

  return (
    <>
      <div className="mx-auto max-w-md space-y-4 px-4 pt-1 pb-28">
        {error && <ErrorBox error={error} />}
        {childrenLoading ? (
          <Loading />
        ) : children.length === 0 ? (
          <EmptyChildren />
        ) : (
          <>
            <WeekStrip
              monday={monday}
              selected={selected}
              today={today}
              byDate={byDate}
              childById={childById}
              onSelect={onSelect}
              onSwipe={(dir) => onSelect(addDaysISO(selected, 7 * dir))}
            />
            {loading || !day ? (
              <Loading />
            ) : (
              <>
                <SectionTitle
                  title={selected === today ? 'Lịch hôm nay' : formatDayTitle(selected)}
                  note={`${count} buổi học`}
                />
                <DayContent
                  day={day}
                  childById={childById}
                  isToday={selected === today}
                  canEdit={canEdit}
                  onEditNotes={() => onEditNotes(selected)}
                  onAddSession={() => onAdd(selected)}
                />
                {count === 0 && <NoSessions />}
              </>
            )}
          </>
        )}
      </div>
      {canEdit && children.length > 0 && <AddScheduleButton onClick={() => onAdd(selected)} />}
    </>
  )
}

/** Mon–Sun of one week; dots in the children's colours mark days with classes. Swipe sideways for another week. */
function WeekStrip({
  monday,
  selected,
  today,
  byDate,
  childById,
  onSelect,
  onSwipe,
}: {
  monday: string
  selected: string
  today: string
  byDate: Map<string, DayData>
  childById: Map<string, Child>
  onSelect: (date: string) => void
  onSwipe: (dir: 1 | -1) => void
}) {
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1)
  }

  return (
    <div className="card grid grid-cols-7 px-1.5 py-2.5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {datesBetween(monday, addDaysISO(monday, 6)).map((date) => {
        const isSelected = date === selected
        const colors = dayColors(byDate.get(date), childById)
        return (
          <button
            type="button"
            key={date}
            onClick={() => onSelect(date)}
            className="flex flex-col items-center gap-1 py-0.5"
            aria-pressed={isSelected}
          >
            <span className="text-muted text-xs font-medium">{weekdayLabel(isoWeekday(date))}</span>
            <span
              className={`flex size-10 items-center justify-center rounded-full text-[16px] tabular-nums ${
                isSelected
                  ? 'bg-(--ion-color-primary) font-bold text-white'
                  : date === today
                    ? 'font-bold text-(--ion-color-primary)'
                    : 'font-medium'
              }`}
            >
              {Number(date.slice(8))}
            </span>
            <Dots colors={colors} />
          </button>
        )
      })}
    </div>
  )
}

// ───────────────────────── Trong tuần ─────────────────────────

function WeekView({
  monday,
  today,
  onMove,
  onAdd,
  onEditNotes,
}: {
  monday: string
  today: string
  onMove: (days: number) => void
  onAdd: (date: string) => void
  onEditNotes: (date: string) => void
}) {
  const { canEdit } = useHousehold()
  const { byDate, childById, children, loading, error, loadMore, to } = useDayPages(monday, 7)
  const sunday = addDaysISO(monday, 6)
  const addDate = today >= monday && today <= sunday ? today : monday

  return (
    <>
      <div className="mx-auto max-w-md space-y-5 px-4 pt-1 pb-28">
        <div className="card flex items-center px-1 py-1">
          <IonButton fill="clear" color="medium" onClick={() => onMove(-7)} aria-label="Tuần trước">
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <span className="flex-1 text-center text-[16px] font-semibold">{formatWeekRange(monday)}</span>
          <IonButton fill="clear" color="medium" onClick={() => onMove(7)} aria-label="Tuần sau">
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>

        {error && <ErrorBox error={error} />}
        {loading ? (
          <Loading />
        ) : children.length === 0 ? (
          <EmptyChildren />
        ) : (
          datesBetween(monday, to).map((date) => (
            <section key={date} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-[16px] font-semibold">{formatDayTitle(date)}</h2>
                {date === today && (
                  <span className="rounded-full bg-(--ion-color-primary) px-2.5 py-0.5 text-xs font-semibold text-white">
                    Hôm nay
                  </span>
                )}
                <span className="flex-1" />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEditNotes(date)}
                    aria-label={`Ghi chú ${formatDayTitle(date)}`}
                    className="text-muted -mr-1 flex size-9 items-center justify-center rounded-full text-lg"
                  >
                    <IonIcon icon={createOutline} />
                  </button>
                )}
              </div>
              <DayContent
                day={byDate.get(date)!}
                childById={childById}
                isToday={date === today}
                canEdit={canEdit}
                compact
                onEditNotes={() => onEditNotes(date)}
                onAddSession={() => onAdd(date)}
              />
            </section>
          ))
        )}
      </div>

      {!loading && children.length > 0 && (
        <IonInfiniteScroll
          onIonInfinite={async (e) => {
            await loadMore()
            await e.target.complete()
          }}
        >
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>
      )}

      {canEdit && children.length > 0 && <AddScheduleButton onClick={() => onAdd(addDate)} />}
    </>
  )
}
