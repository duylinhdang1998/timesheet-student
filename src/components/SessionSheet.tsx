import { useRef, useState, type ReactNode } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonRippleEffect,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  IonToolbar,
  useIonActionSheet,
} from '@ionic/react'
import { add, chevronBack, chevronDown, documentTextOutline, informationCircleOutline } from 'ionicons/icons'
import { useQueryClient } from '@tanstack/react-query'
import { findOverlap, overlapMessage, useChildren, useEscortSuggestions } from '../data/queries'
import { supabase } from '../lib/supabase'
import {
  addMonthsISO,
  datesBetween,
  formatDate,
  formatDayTitle,
  formatWeekdays,
  hhmm,
  ISO_WEEKDAYS,
  isoWeekday,
  nowTimeVN,
  weekdayLabel,
} from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { REMIND_OPTIONS, remindLabel } from '../lib/reminders'
import type { Child, Series, Session, SeriesResult } from '../lib/types'
import { useChildFilter } from '../state/childFilter'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'
import { ChildAvatar, tint } from './ChildAvatar'
import { DateTimePicker } from './DateTimeField'
import { ErrorBox } from './States'

interface FormValues {
  child_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  repeat: boolean
  weekdays: number[]
  end_date: string
  location: string
  teacher: string
  contact_phone: string
  escort: string
  note: string
  remind_minutes: number
  remind_email: boolean
}

export type Scope = 'this' | 'following'

const blank = (v: string) => v.trim() || null

function sameWeekdays(a: number[], b: number[]) {
  return [...a].sort().join() === [...b].sort().join()
}

/** Step 1: who, what, when */
function validateBasics(v: FormValues): string | null {
  if (!v.child_id) return 'Hãy chọn bé'
  if (!v.title.trim()) return 'Hãy nhập tên môn/lớp'
  if (!v.date) return 'Hãy chọn ngày'
  if (!v.start_time || !v.end_time) return 'Hãy nhập giờ bắt đầu và kết thúc'
  if (v.end_time <= v.start_time) return 'Giờ kết thúc phải sau giờ bắt đầu'
  return null
}

function validate(v: FormValues): string | null {
  const basics = validateBasics(v)
  if (basics) return basics
  if (v.repeat) {
    if (v.weekdays.length === 0) return 'Hãy chọn ít nhất một thứ trong tuần'
    if (!v.end_date || v.end_date < v.date) return 'Ngày kết thúc lặp phải từ ngày bắt đầu trở đi'
    if (v.end_date > addMonthsISO(v.date, 13)) return 'Lịch lặp tối đa khoảng 1 năm'
  }
  return null
}

export function seriesSummary(r: SeriesResult): string {
  const base = `Đã tạo ${r.created} buổi học`
  if (r.skipped.length === 0) return base
  return `${base}, bỏ qua ${r.skipped.length} ngày bé đã có lịch trùng giờ: ${r.skipped.map((d) => formatDate(d).slice(0, 5)).join(', ')}`
}

export function useInvalidateSchedule() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['sessions', 'session', 'series', 'escorts'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
}

/**
 * Repeating session: ask whether a change applies to this one only or to the rest of the series.
 * Resolves to null when the sheet is dismissed without a choice.
 */
export function usePickScope() {
  const [present] = useIonActionSheet()
  return (header: string, danger: boolean, reasons: Partial<Record<Scope, string>> = {}) =>
    new Promise<Scope | null>((resolve) => {
      void present({
        header,
        subHeader: reasons.this ?? reasons.following,
        buttons: [
          {
            text: 'Chỉ buổi này',
            role: danger ? 'destructive' : undefined,
            disabled: Boolean(reasons.this),
            handler: () => resolve('this'),
          },
          {
            text: 'Buổi này và các buổi sau',
            role: danger ? 'destructive' : undefined,
            disabled: Boolean(reasons.following),
            handler: () => resolve('following'),
          },
          { text: 'Huỷ', role: 'cancel' },
        ],
        onDidDismiss: () => resolve(null),
      })
    })
}

/** A new session starts at the next full hour and lasts an hour (end capped at 23:59). */
function defaultTimes(): [string, string] {
  const hour = Math.min(Number(nowTimeVN().slice(0, 2)) + 1, 22)
  const pad = (n: number) => String(n).padStart(2, '0')
  return [`${pad(hour)}:00`, `${pad(hour + 1)}:00`]
}

/** "17:30" → minutes since midnight, and back (clamped to the same day) */
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const fromMinutes = (m: number) => {
  const c = Math.min(Math.max(m, 0), 23 * 60 + 59)
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`
}

// ───────────────────────── New ─────────────────────────

/** Bottom sheet adding one session or a weekly series, starting on `date`. */
export function NewSessionSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const toast = useToast()
  const invalidate = useInvalidateSchedule()
  const { householdId } = useHousehold()
  const { data: children = [] } = useChildren()
  const [filter] = useChildFilter()

  const preselected = children.find((c) => c.id === filter)?.id
  const [start_time, end_time] = defaultTimes()
  const initial: FormValues = {
    child_id: preselected ?? (children.length === 1 ? children[0].id : ''),
    title: '',
    date,
    start_time,
    end_time,
    repeat: false,
    weekdays: [isoWeekday(date)],
    end_date: addMonthsISO(date, 4),
    location: '',
    teacher: '',
    contact_phone: '',
    escort: '',
    note: '',
    remind_minutes: 15,
    remind_email: false,
  }

  async function save(v: FormValues) {
    if (v.repeat) {
      const { data, error } = await supabase.rpc('create_series', {
        p_child_id: v.child_id,
        p_title: v.title.trim(),
        p_start_time: v.start_time,
        p_end_time: v.end_time,
        p_weekdays: v.weekdays,
        p_start_date: v.date,
        p_end_date: v.end_date,
        p_location: blank(v.location),
        p_teacher: blank(v.teacher),
        p_contact_phone: blank(v.contact_phone),
        p_escort: blank(v.escort),
        p_note: blank(v.note),
        p_remind_minutes: v.remind_minutes,
        p_remind_email: v.remind_email,
      })
      if (error) throw error
      toast(seriesSummary(data as SeriesResult))
    } else {
      const other = await findOverlap({ childId: v.child_id, date: v.date, start: v.start_time, end: v.end_time })
      if (other) throw new Error(overlapMessage(other))
      const { error } = await supabase.from('sessions').insert({
        household_id: householdId,
        child_id: v.child_id,
        date: v.date,
        start_time: v.start_time,
        end_time: v.end_time,
        title: v.title.trim(),
        location: blank(v.location),
        teacher: blank(v.teacher),
        contact_phone: blank(v.contact_phone),
        escort: blank(v.escort),
        note: blank(v.note),
        remind_minutes: v.remind_minutes,
        remind_email: v.remind_email,
      })
      if (error) throw error
      toast('Đã thêm buổi học')
    }
    await invalidate()
    return true
  }

  return <SessionSheet heading="Thêm lịch học" mode="new" initial={initial} onSubmit={save} onClose={onClose} />
}

// ───────────────────────── Edit ─────────────────────────

/** Bottom sheet editing a session; for a series it asks whether the change covers the following sessions too. */
export function EditSessionSheet({
  session,
  series,
  onClose,
}: {
  session: Session
  series: Series | null
  onClose: () => void
}) {
  const toast = useToast()
  const invalidate = useInvalidateSchedule()
  const pickScope = usePickScope()

  const initial: FormValues = {
    child_id: session.child_id,
    title: session.title,
    date: session.date,
    start_time: hhmm(session.start_time),
    end_time: hhmm(session.end_time),
    repeat: Boolean(series),
    weekdays: series?.weekdays ?? [isoWeekday(session.date)],
    end_date: series?.end_date ?? session.date,
    location: session.location ?? '',
    teacher: session.teacher ?? '',
    contact_phone: session.contact_phone ?? '',
    escort: session.escort ?? '',
    note: session.note ?? '',
    remind_minutes: session.remind_minutes,
    remind_email: session.remind_email,
  }

  async function updateThis(v: FormValues) {
    if (session.status === 'scheduled') {
      const other = await findOverlap({
        childId: v.child_id,
        date: v.date,
        start: v.start_time,
        end: v.end_time,
        excludeId: session.id,
      })
      if (other) throw new Error(overlapMessage(other))
    }
    const { error } = await supabase
      .from('sessions')
      .update({
        child_id: v.child_id,
        title: v.title.trim(),
        date: v.date,
        start_time: v.start_time,
        end_time: v.end_time,
        location: blank(v.location),
        teacher: blank(v.teacher),
        contact_phone: blank(v.contact_phone),
        escort: blank(v.escort),
        note: blank(v.note),
        remind_minutes: v.remind_minutes,
        remind_email: v.remind_email,
      })
      .eq('id', session.id)
    if (error) throw error
    toast('Đã lưu buổi học')
  }

  async function updateFollowing(v: FormValues) {
    const { data, error } = await supabase.rpc('update_series_from', {
      p_session_id: session.id,
      p_child_id: v.child_id,
      p_title: v.title.trim(),
      p_start_time: v.start_time,
      p_end_time: v.end_time,
      p_weekdays: v.weekdays,
      p_end_date: v.end_date,
      p_location: blank(v.location),
      p_teacher: blank(v.teacher),
      p_contact_phone: blank(v.contact_phone),
      p_escort: blank(v.escort),
      p_note: blank(v.note),
      p_remind_minutes: v.remind_minutes,
      p_remind_email: v.remind_email,
    })
    if (error) throw error
    toast(seriesSummary(data as SeriesResult).replace('Đã tạo', 'Đã cập nhật'))
  }

  async function save(v: FormValues) {
    let scope: Scope = 'this'
    if (series) {
      const recurrenceChanged = !sameWeekdays(v.weekdays, series.weekdays) || v.end_date !== series.end_date
      const picked = await pickScope('Áp dụng thay đổi cho', false, {
        this: recurrenceChanged ? 'Đổi thứ trong tuần hoặc ngày kết thúc chỉ áp dụng cho các buổi sau' : undefined,
        following: v.date !== session.date ? 'Đổi ngày chỉ áp dụng được cho riêng buổi này' : undefined,
      })
      if (!picked) return false
      scope = picked
    }
    if (scope === 'this') await updateThis(v)
    else await updateFollowing(v)
    await invalidate()
    return true
  }

  return (
    <SessionSheet
      heading="Sửa lịch học"
      mode={series ? 'series' : 'single'}
      initial={initial}
      onSubmit={save}
      onClose={onClose}
    />
  )
}

// ───────────────────────── Sheet ─────────────────────────

/**
 * Two-step form in a tall bottom sheet: 1. child, subject, time, place; 2. repeat, reminders, note.
 * `mode`: "new" may choose to repeat; "series" edits the weekdays and end of an existing series; "single" has no repeat.
 * `onSubmit` resolves true once saved (the sheet then closes) or false to stay open.
 */
function SessionSheet({
  heading,
  mode,
  initial,
  onSubmit,
  onClose,
}: {
  heading: string
  mode: 'new' | 'series' | 'single'
  initial: FormValues
  onSubmit: (v: FormValues) => Promise<boolean>
  onClose: () => void
}) {
  const modal = useRef<HTMLIonModalElement>(null)
  const content = useRef<HTMLIonContentElement>(null)
  const { data: children = [] } = useChildren()
  const { data: escorts = [] } = useEscortSuggestions()
  const [presentActionSheet] = useIonActionSheet()
  const [v, setV] = useState(initial)
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [moreOpen, setMoreOpen] = useState(Boolean(initial.teacher || initial.contact_phone))

  // a stale error (e.g. overlap) would wrongly suggest the edited form is still invalid
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setError(null)
    setV((prev) => ({ ...prev, [key]: value }))
  }

  const changeDate = (date: string) => {
    setError(null)
    // keep the default weekday in sync while the user hasn't customised it
    setV((prev) => ({
      ...prev,
      date,
      weekdays: mode === 'new' && prev.weekdays.length === 1 && date ? [isoWeekday(date)] : prev.weekdays,
    }))
  }

  // moving the start keeps the length of the class, like a calendar app
  const changeStart = (start: string) => {
    setError(null)
    setV((prev) => {
      const length = prev.start_time && prev.end_time ? toMinutes(prev.end_time) - toMinutes(prev.start_time) : 60
      return { ...prev, start_time: start, end_time: fromMinutes(toMinutes(start) + (length > 0 ? length : 60)) }
    })
  }

  const toggleWeekday = (d: number) =>
    set(
      'weekdays',
      v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d].sort((a, b) => a - b),
    )

  const goTo = (next: 1 | 2) => {
    setError(null)
    setStep(next)
    void content.current?.scrollToTop()
  }

  const next = () => {
    const problem = validateBasics(v)
    if (problem) return setError(problem)
    goTo(2)
  }

  async function submit() {
    const problem = validate(v)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      if (await onSubmit(v)) await modal.current?.dismiss()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const child = children.find((c) => c.id === v.child_id)
  const pickChild = () =>
    presentActionSheet({
      header: 'Chọn bé',
      buttons: [
        ...children.map((c) => ({ text: c.name, handler: () => set('child_id', c.id) })),
        { text: 'Huỷ', role: 'cancel' },
      ],
    })

  const escortQuery = v.escort.trim().toLowerCase()
  const escortChips = escorts.filter((e) => e !== v.escort && e.toLowerCase().includes(escortQuery)).slice(0, 6)
  const showRecurrence = mode === 'series' || (mode === 'new' && v.repeat)

  return (
    <IonModal
      ref={modal}
      isOpen
      className="form-sheet"
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      onDidDismiss={onClose}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            {step === 1 ? (
              <IonButton color="medium" onClick={() => modal.current?.dismiss()}>
                Huỷ
              </IonButton>
            ) : (
              <IonButton onClick={() => goTo(1)}>
                <IonIcon slot="start" icon={chevronBack} />
                Quay lại
              </IonButton>
            )}
          </IonButtons>
          <div className="text-center">
            <div className="text-[16px] font-semibold">{step === 1 ? heading : 'Lặp & nhắc lịch'}</div>
            <div className="text-muted text-xs">Bước {step}/2</div>
          </div>
          {/* keeps the title centred */}
          <IonButtons slot="end">
            <IonButton disabled className="invisible">
              Huỷ
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <div className="mx-auto flex max-w-md gap-1.5 px-4 pb-2">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-(--ion-color-primary)' : 'bg-(--app-track)'}`}
            />
          ))}
        </div>
      </IonHeader>

      <IonContent ref={content}>
        <div className="mx-auto max-w-md space-y-4 px-4 pt-3 pb-6">
          {step === 1 ? (
            <>
              <div>
                <button
                  type="button"
                  onClick={pickChild}
                  disabled={children.length < 2 && Boolean(child)}
                  className="card ion-activatable relative flex w-full items-center gap-3 overflow-hidden p-3.5 text-left"
                >
                  <IonRippleEffect />
                  {child ? (
                    <ChildAvatar child={child} size="size-12 text-[17px]" />
                  ) : (
                    <span className="size-12 shrink-0 rounded-full bg-(--app-track)" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{child?.name ?? 'Chọn bé'}</span>
                    <span className="text-muted block truncate text-[13px]">
                      {child ? classAndSchool(child) || 'Chưa có lớp và trường' : 'Lịch này của bé nào?'}
                    </span>
                  </span>
                  {children.length > 1 && <IonIcon icon={chevronDown} className="text-muted shrink-0 text-lg" />}
                </button>
                {children.length > 1 && child && <p className="text-muted mt-1.5 px-1 text-xs">Chạm để chọn bé khác</p>}
              </div>

              <div className="card divide-y divide-(--app-border) overflow-hidden">
                <FieldRow label="Môn học / lớp">
                  <IonInput
                    aria-label="Môn học / lớp"
                    className="text-right"
                    placeholder="Tiếng Anh, Bơi…"
                    value={v.title}
                    onIonInput={(e) => set('title', e.detail.value ?? '')}
                  />
                </FieldRow>
                <FieldRow label={showRecurrence ? 'Ngày bắt đầu' : 'Ngày học'}>
                  <DateTimePicker kind="date" value={v.date} onChange={changeDate} />
                </FieldRow>
                <div className="grid grid-cols-2 divide-x divide-(--app-border)">
                  <div className="flex flex-col items-start gap-1 px-4 py-2.5">
                    <span className="text-muted text-[13px]">Bắt đầu</span>
                    <DateTimePicker kind="time" value={v.start_time} onChange={changeStart} />
                  </div>
                  <div className="flex flex-col items-start gap-1 px-4 py-2.5">
                    <span className="text-muted text-[13px]">Kết thúc</span>
                    <DateTimePicker kind="time" value={v.end_time} onChange={(t) => set('end_time', t)} />
                  </div>
                </div>
                <FieldRow label="Địa điểm">
                  <IonInput
                    aria-label="Địa điểm"
                    className="text-right"
                    placeholder="Không bắt buộc"
                    value={v.location}
                    onIonInput={(e) => set('location', e.detail.value ?? '')}
                  />
                </FieldRow>
                <div>
                  <FieldRow label="Người đưa đón">
                    <IonInput
                      aria-label="Người đưa đón"
                      className="text-right"
                      placeholder="Bố, Bà ngoại…"
                      value={v.escort}
                      onIonInput={(e) => set('escort', e.detail.value ?? '')}
                    />
                  </FieldRow>
                  {escortChips.length > 0 && (
                    <div className="-mt-1 flex flex-wrap gap-2 px-4 pb-3">
                      {escortChips.map((e) => (
                        <button
                          type="button"
                          key={e}
                          onClick={() => set('escort', e)}
                          className="h-8 rounded-full bg-(--app-track) px-3 text-[13px]"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {moreOpen ? (
                <div className="card divide-y divide-(--app-border) overflow-hidden">
                  <FieldRow label="Giáo viên">
                    <IonInput
                      aria-label="Giáo viên hoặc trung tâm"
                      className="text-right"
                      placeholder="Cô Lan, trung tâm…"
                      value={v.teacher}
                      onIonInput={(e) => set('teacher', e.detail.value ?? '')}
                    />
                  </FieldRow>
                  <FieldRow label="Số điện thoại">
                    <IonInput
                      aria-label="Số điện thoại liên hệ"
                      className="text-right"
                      type="tel"
                      inputmode="tel"
                      placeholder="Không bắt buộc"
                      value={v.contact_phone}
                      onIonInput={(e) => set('contact_phone', e.detail.value ?? '')}
                    />
                  </FieldRow>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="flex h-10 items-center gap-1.5 px-1 text-[14px] font-medium text-(--ion-color-primary)"
                >
                  <IonIcon icon={add} className="text-xl" />
                  Thêm giáo viên, số điện thoại
                </button>
              )}
            </>
          ) : (
            <>
              {child && (
                <div
                  className="flex items-center gap-3 rounded-2xl p-3.5"
                  style={{ backgroundColor: tint(child.color, 14) }}
                >
                  <ChildAvatar child={child} size="size-11 text-[15px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold">{v.title.trim()}</div>
                    <div className="truncate text-[13px]" style={{ color: child.color }}>
                      {child.name} · {formatDayTitle(v.date)} · {v.start_time} – {v.end_time}
                    </div>
                  </div>
                </div>
              )}

              {mode !== 'single' && (
                <section className="space-y-2.5">
                  <h3 className="px-1 text-[16px] font-semibold">Lặp lại</h3>
                  {mode === 'new' && (
                    <IonSegment
                      className="full"
                      value={v.repeat ? 'weekly' : 'once'}
                      onIonChange={(e) => set('repeat', e.detail.value === 'weekly')}
                    >
                      <IonSegmentButton value="once">
                        <IonLabel>Một lần</IonLabel>
                      </IonSegmentButton>
                      <IonSegmentButton value="weekly">
                        <IonLabel>Hằng tuần</IonLabel>
                      </IonSegmentButton>
                    </IonSegment>
                  )}
                  {showRecurrence && (
                    <div className="card divide-y divide-(--app-border) overflow-hidden">
                      <div className="flex justify-between gap-1 px-3 py-3">
                        {ISO_WEEKDAYS.map((d) => {
                          const on = v.weekdays.includes(d)
                          return (
                            <button
                              type="button"
                              key={d}
                              onClick={() => toggleWeekday(d)}
                              aria-pressed={on}
                              className={`flex size-10 shrink-0 items-center justify-center rounded-full p-0 text-[13px] font-semibold transition-colors ${
                                on ? 'bg-(--ion-color-primary) text-white' : 'text-muted bg-(--app-track)'
                              }`}
                            >
                              {weekdayLabel(d)}
                            </button>
                          )
                        })}
                      </div>
                      <FieldRow label="Kết thúc lặp">
                        <DateTimePicker
                          kind="date"
                          value={v.end_date}
                          min={v.date}
                          onChange={(d) => set('end_date', d)}
                        />
                      </FieldRow>
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-2.5">
                <h3 className="px-1 text-[16px] font-semibold">Nhắc lịch</h3>
                <div className="card divide-y divide-(--app-border) overflow-hidden">
                  <FieldRow label="Nhắc trước">
                    <IonSelect
                      aria-label="Nhắc trước"
                      className="w-auto"
                      interface="action-sheet"
                      interfaceOptions={{ header: 'Nhắc trước' }}
                      cancelText="Huỷ"
                      value={v.remind_minutes}
                      onIonChange={(e) => set('remind_minutes', Number(e.detail.value))}
                    >
                      {REMIND_OPTIONS.map((m) => (
                        <IonSelectOption key={m} value={m}>
                          {remindLabel(m)}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </FieldRow>
                  <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px]">Nhắc cả gia đình</div>
                      <div className="text-muted text-[13px]">Gửi thêm email cho mọi thành viên</div>
                    </div>
                    <IonToggle
                      aria-label="Nhắc cả gia đình"
                      checked={v.remind_email}
                      onIonChange={(e) => set('remind_email', e.detail.checked)}
                    />
                  </div>
                </div>
              </section>

              <div className="note-card px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 text-[14px] font-medium text-(--app-note-fg)">
                  <IonIcon icon={documentTextOutline} className="text-lg" />
                  Ghi chú
                </div>
                <IonTextarea
                  aria-label="Ghi chú buổi học"
                  autoGrow
                  rows={2}
                  placeholder="Ví dụ: mang vở bài tập, nước uống"
                  value={v.note}
                  onIonInput={(e) => set('note', e.detail.value ?? '')}
                />
              </div>

              <p className="text-muted flex items-start gap-2 px-1 text-[13px]">
                <IonIcon icon={informationCircleOutline} className="mt-0.5 shrink-0" />
                {summary(v, showRecurrence)}
              </p>
            </>
          )}
        </div>
      </IonContent>

      <IonFooter className="ion-no-border">
        <div className="mx-auto max-w-md space-y-2 bg-(--app-page-bg) px-4 pt-2 pb-[calc(var(--ion-safe-area-bottom)+0.75rem)]">
          {error && <ErrorBox error={error} />}
          {step === 1 ? (
            <IonButton expand="block" className="h-12" onClick={next}>
              Tiếp tục
            </IonButton>
          ) : (
            <IonButton expand="block" className="h-12" disabled={busy} onClick={submit}>
              {busy ? 'Đang lưu…' : 'Lưu lịch học'}
            </IonButton>
          )}
        </div>
      </IonFooter>
    </IonModal>
  )
}

/** "Lớp 3B · Tiểu học Kim Đồng" */
export function classAndSchool(child: Pick<Child, 'class_name' | 'school'>) {
  return [child.class_name && `Lớp ${child.class_name.replace(/^lớp\s*/i, '')}`, child.school]
    .filter(Boolean)
    .join(' · ')
}

/** What will be saved, in one sentence. */
function summary(v: FormValues, recurring: boolean): string {
  const time = `${v.start_time} – ${v.end_time}`
  if (!recurring) return `Một buổi vào ${formatDayTitle(v.date)}, ${time}.`
  if (v.weekdays.length === 0 || !v.end_date || v.end_date < v.date) return `Lặp hằng tuần, ${time}.`
  const count = datesBetween(v.date, v.end_date).filter((d) => v.weekdays.includes(isoWeekday(d))).length
  return `Lặp ${formatWeekdays(v.weekdays)}, ${time}, từ ${formatDate(v.date)} đến ${formatDate(v.end_date)} (khoảng ${count} buổi).`
}

/** Label on the left, control on the right. */
function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-13 items-center gap-3 px-4 py-1.5">
      <span className="shrink-0 text-[15px]">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  )
}
