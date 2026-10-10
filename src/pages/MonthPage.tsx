import { useState } from 'react'
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react'
import { chevronBack, chevronForward } from 'ionicons/icons'
import { addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { AddScheduleButton, ChildFilterBar, LargeHeader, PullToRefresh, SectionTitle } from '../components/Page'
import { DayContent, Dots, NoSessions, dayColors } from '../components/DayBlock'
import { DayNotesModal } from '../components/DayNotesModal'
import { NewSessionSheet } from '../components/SessionSheet'
import { EmptyChildren, ErrorBox, Loading } from '../components/States'
import { useDays } from '../data/days'
import { datesBetween, formatDayTitle, parseISODate, toISODate, todayVN } from '../lib/dates'
import { useChildFilter } from '../state/childFilter'
import { useHousehold } from '../state/household'

const WEEK_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function MonthPage() {
  const { canEdit } = useHousehold()
  const [filter] = useChildFilter()
  const today = todayVN()
  const [month, setMonth] = useState(() => startOfMonth(parseISODate(today)))
  const [selected, setSelected] = useState(today)
  const [notesOpen, setNotesOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const gridFrom = toISODate(startOfWeek(month, { weekStartsOn: 1 }))
  const gridTo = toISODate(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }))
  const { byDate, childById, children, childrenLoading, allNotes, loading, error } = useDays(gridFrom, gridTo)
  const monthKey = format(month, 'yyyy-MM')

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta)
    setMonth(next)
    setSelected(format(next, 'yyyy-MM') === today.slice(0, 7) ? today : toISODate(next))
  }

  const selectedDay = byDate.get(selected)
  const count = selectedDay?.sessions.length ?? 0
  const legend = children.filter((c) => !filter || c.id === filter)

  return (
    <IonPage>
      <LargeHeader title="Lịch tháng">
        <ChildFilterBar />
      </LargeHeader>

      <IonContent>
        <PullToRefresh />
        <div className="mx-auto max-w-md space-y-4 px-4 pt-1 pb-28">
          {error && <ErrorBox error={error} />}
          {childrenLoading ? (
            <Loading />
          ) : children.length === 0 ? (
            <EmptyChildren />
          ) : (
            <>
              <div className="card px-2 pt-1.5 pb-3">
                <div className="flex items-center">
                  <IonButton fill="clear" color="medium" onClick={() => changeMonth(-1)} aria-label="Tháng trước">
                    <IonIcon slot="icon-only" icon={chevronBack} />
                  </IonButton>
                  <h2 className="flex-1 text-center text-[16px] font-semibold">
                    Tháng {month.getMonth() + 1}, {month.getFullYear()}
                  </h2>
                  <IonButton fill="clear" color="medium" onClick={() => changeMonth(1)} aria-label="Tháng sau">
                    <IonIcon slot="icon-only" icon={chevronForward} />
                  </IonButton>
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {WEEK_HEADER.map((d) => (
                    <div key={d} className="text-muted py-1 text-xs font-medium">
                      {d}
                    </div>
                  ))}
                  {datesBetween(gridFrom, gridTo).map((date) => {
                    const inMonth = date.startsWith(monthKey)
                    const isSelected = date === selected
                    return (
                      <button
                        type="button"
                        key={date}
                        onClick={() => setSelected(date)}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-center gap-0.5 py-0.5 ${inMonth ? '' : 'opacity-35'}`}
                      >
                        <span
                          className={`flex size-9 items-center justify-center rounded-full text-[15px] tabular-nums ${
                            isSelected
                              ? 'bg-(--ion-color-primary) font-bold text-white'
                              : date === today
                                ? 'font-bold text-(--ion-color-primary)'
                                : ''
                          }`}
                        >
                          {Number(date.slice(8))}
                        </span>
                        <Dots colors={dayColors(byDate.get(date), childById)} />
                      </button>
                    )
                  })}
                </div>

                {legend.length > 1 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-(--app-border) px-2 pt-3">
                    {legend.map((c) => (
                      <span key={c.id} className="text-muted flex items-center gap-1.5 text-[13px]">
                        <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <SectionTitle title={formatDayTitle(selected)} note={`${count} buổi học`} />
              {loading || !selectedDay ? (
                <Loading />
              ) : (
                <>
                  <DayContent
                    day={selectedDay}
                    childById={childById}
                    isToday={selected === today}
                    canEdit={canEdit}
                    onEditNotes={() => setNotesOpen(true)}
                    onAddSession={() => setAdding(true)}
                  />
                  {count === 0 && <NoSessions />}
                </>
              )}
            </>
          )}
        </div>
        {canEdit && children.length > 0 && <AddScheduleButton onClick={() => setAdding(true)} />}
      </IonContent>

      {adding && <NewSessionSheet date={selected} onClose={() => setAdding(false)} />}
      {notesOpen && (
        <DayNotesModal
          date={selected}
          notes={allNotes.filter((n) => n.date === selected)}
          kids={children}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </IonPage>
  )
}
