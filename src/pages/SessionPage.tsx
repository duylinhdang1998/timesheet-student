import { useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useGoBack } from '../state/goBack'
import { useQueryClient } from '@tanstack/react-query'
import { TopBar } from '../components/TopBar'
import { ChildAvatar } from '../components/ChildAvatar'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { EmptyChildren, ErrorBox, Loading } from '../components/States'
import { DateTimeField } from '../components/DateTimeField'
import { findOverlap, overlapMessage, useChildren, useEscortSuggestions, useSeries, useSession } from '../data/queries'
import { supabase } from '../lib/supabase'
import {
  addMonthsISO,
  formatDate,
  formatDayLong,
  hhmm,
  ISO_WEEKDAYS,
  isoWeekday,
  todayVN,
  weekdayLabel,
} from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { REMIND_OPTIONS, remindLabel } from '../lib/reminders'
import type { Series, Session, SeriesResult } from '../lib/types'
import { useChildFilter } from '../state/childFilter'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

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

type Scope = 'this' | 'following'

const blank = (v: string) => v.trim() || null

function sameWeekdays(a: number[], b: number[]) {
  return [...a].sort().join() === [...b].sort().join()
}

function validate(v: FormValues): string | null {
  if (!v.child_id) return 'Hãy chọn bé'
  if (!v.title.trim()) return 'Hãy nhập tên môn/lớp'
  if (!v.date) return 'Hãy chọn ngày'
  if (!v.start_time || !v.end_time) return 'Hãy nhập giờ bắt đầu và kết thúc'
  if (v.end_time <= v.start_time) return 'Giờ kết thúc phải sau giờ bắt đầu'
  if (v.repeat) {
    if (v.weekdays.length === 0) return 'Hãy chọn ít nhất một thứ trong tuần'
    if (!v.end_date || v.end_date < v.date) return 'Ngày kết thúc lặp phải từ ngày bắt đầu trở đi'
    if (v.end_date > addMonthsISO(v.date, 13)) return 'Lịch lặp tối đa khoảng 1 năm'
  }
  return null
}

function seriesSummary(r: SeriesResult): string {
  const base = `Đã tạo ${r.created} buổi học`
  if (r.skipped.length === 0) return base
  return `${base}, bỏ qua ${r.skipped.length} ngày bé đã có lịch trùng giờ: ${r.skipped.map((d) => formatDate(d).slice(0, 5)).join(', ')}`
}

function useInvalidateSchedule() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['sessions', 'session', 'series', 'escorts'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
}

// ───────────────────────── New ─────────────────────────

export function NewSessionPage() {
  const [params] = useSearchParams()
  const goBack = useGoBack()
  const toast = useToast()
  const invalidate = useInvalidateSchedule()
  const { householdId, canEdit } = useHousehold()
  const { data: children, isPending } = useChildren()
  const [filter] = useChildFilter()

  if (isPending) return <Shell title="Thêm buổi học"><Loading /></Shell>
  if (!children?.length) return <Shell title="Thêm buổi học"><EmptyChildren /></Shell>

  const date = params.get('ngay') ?? todayVN()
  const preselected = children.find((c) => c.id === (params.get('be') ?? filter))?.id
  const initial: FormValues = {
    child_id: preselected ?? (children.length === 1 ? children[0].id : ''),
    title: '',
    date,
    start_time: '',
    end_time: '',
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
    goBack()
  }

  return (
    <Shell title="Thêm buổi học">
      <SessionForm initial={initial} allowRepeat editable={canEdit} submitLabel="Lưu buổi học" onSubmit={save} />
    </Shell>
  )
}

// ───────────────────────── Existing ─────────────────────────

export function EditSessionPage() {
  const { id } = useParams()
  const sessionQuery = useSession(id)
  const session = sessionQuery.data
  const seriesQuery = useSeries(session?.series_id)

  if (sessionQuery.isPending || (session?.series_id && seriesQuery.isPending)) {
    return <Shell title="Buổi học"><Loading /></Shell>
  }
  if (sessionQuery.error) return <Shell title="Buổi học"><ErrorBox error={sessionQuery.error} /></Shell>
  if (!session) return <Shell title="Buổi học"><p className="text-slate-500">Buổi học không còn tồn tại.</p></Shell>
  return <SessionEditor key={session.id + session.status} session={session} series={seriesQuery.data ?? null} />
}

function SessionEditor({ session, series }: { session: Session; series: Series | null }) {
  const goBack = useGoBack()
  const toast = useToast()
  const invalidate = useInvalidateSchedule()
  const { canEdit } = useHousehold()
  const [pending, setPending] = useState<FormValues | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingOff, setMarkingOff] = useState(false)
  const [busy, setBusy] = useState(false)

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

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
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
    if (!series) {
      await updateThis(v)
      await invalidate()
      goBack()
      return
    }
    setPending(v) // ask for scope
  }

  async function applyScope(scope: Scope) {
    const v = pending!
    await run(async () => {
      if (scope === 'this') await updateThis(v)
      else await updateFollowing(v)
      setPending(null)
      await invalidate()
      goBack()
    })
  }

  async function remove(scope: Scope) {
    await run(async () => {
      const { error } =
        scope === 'this'
          ? await supabase.from('sessions').delete().eq('id', session.id)
          : await supabase.rpc('delete_series_from', { p_session_id: session.id })
      if (error) throw error
      toast(scope === 'this' ? 'Đã xoá buổi học' : 'Đã xoá buổi này và các buổi sau')
      setDeleting(false)
      await invalidate()
      goBack()
    })
  }

  async function setStatus(status: Session['status'], reason: string | null) {
    await run(async () => {
      if (status === 'scheduled') {
        const other = await findOverlap({
          childId: session.child_id,
          date: session.date,
          start: session.start_time,
          end: session.end_time,
          excludeId: session.id,
        })
        if (other) throw new Error(overlapMessage(other))
      }
      const { error } = await supabase.from('sessions').update({ status, off_reason: reason }).eq('id', session.id)
      if (error) throw error
      setMarkingOff(false)
      await invalidate()
    })
  }

  const recurrenceChanged = (v: FormValues) =>
    Boolean(series) && (!sameWeekdays(v.weekdays, series!.weekdays) || v.end_date !== series!.end_date)

  return (
    <Shell title="Buổi học">
      <div className="mb-4 space-y-3">
        <div className="text-sm text-slate-500">
          {formatDayLong(session.date)}
          {series && (
            <>
              {' · '}Lặp {[...series.weekdays].sort((a, b) => a - b).map(weekdayLabel).join(', ')} đến {formatDate(series.end_date)}
            </>
          )}
        </div>
        {session.status === 'off' && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Buổi này nghỉ{session.off_reason ? `: ${session.off_reason}` : ''}
          </div>
        )}
        {canEdit && (
          <div className="flex gap-2">
            {session.status === 'scheduled' ? (
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => setMarkingOff(true)}>
                Đánh dấu nghỉ
              </button>
            ) : (
              <button className="btn-secondary flex-1" disabled={busy} onClick={() => setStatus('scheduled', null)}>
                Học lại buổi này
              </button>
            )}
            <button className="btn-secondary flex-1 text-rose-600" disabled={busy} onClick={() => setDeleting(true)}>
              Xoá
            </button>
          </div>
        )}
      </div>

      <SessionForm
        initial={initial}
        allowRepeat={false}
        showSeriesFields={Boolean(series)}
        editable={canEdit}
        submitLabel="Lưu thay đổi"
        onSubmit={save}
      />

      {pending && (
        <ScopeSheet
          title="Áp dụng thay đổi cho"
          busy={busy}
          thisDisabledReason={
            recurrenceChanged(pending) ? 'Đổi thứ trong tuần hoặc ngày kết thúc chỉ áp dụng cho các buổi sau' : undefined
          }
          followingDisabledReason={
            pending.date !== session.date ? 'Đổi ngày chỉ áp dụng được cho riêng buổi này' : undefined
          }
          onPick={applyScope}
          onClose={() => setPending(null)}
        />
      )}
      {deleting &&
        (series ? (
          <ScopeSheet title="Xoá buổi học" danger busy={busy} onPick={remove} onClose={() => setDeleting(false)} />
        ) : (
          <ConfirmSheet
            title="Xoá buổi học?"
            message={`“${session.title}” ngày ${formatDate(session.date)} sẽ bị xoá.`}
            confirmLabel="Xoá"
            danger
            busy={busy}
            onConfirm={() => remove('this')}
            onClose={() => setDeleting(false)}
          />
        ))}
      {markingOff && (
        <OffSheet busy={busy} onConfirm={(reason) => setStatus('off', reason)} onClose={() => setMarkingOff(false)} />
      )}
    </Shell>
  )
}

// ───────────────────────── Pieces ─────────────────────────

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <TopBar title={title} back />
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
    </>
  )
}

function SessionForm({
  initial,
  allowRepeat,
  showSeriesFields,
  editable,
  submitLabel,
  onSubmit,
}: {
  initial: FormValues
  allowRepeat: boolean
  showSeriesFields?: boolean
  editable: boolean
  submitLabel: string
  onSubmit: (v: FormValues) => Promise<void>
}) {
  const { data: children = [] } = useChildren()
  const { data: escorts = [] } = useEscortSuggestions()
  const [v, setV] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // a stale error (e.g. overlap) would wrongly suggest the edited form is still invalid
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setError(null)
    setV((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validate(v)
    if (problem) return setError(problem)
    setError(null)
    setBusy(true)
    try {
      await onSubmit(v)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const toggleWeekday = (d: number) =>
    set('weekdays', v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d].sort((a, b) => a - b))

  const changeDate = (date: string) => {
    setError(null)
    // keep the default weekday in sync while the user hasn't customised it
    setV((prev) => ({
      ...prev,
      date,
      weekdays: allowRepeat && prev.weekdays.length === 1 && date ? [isoWeekday(date)] : prev.weekdays,
    }))
  }

  const showRecurrence = allowRepeat ? v.repeat : showSeriesFields

  return (
    <form onSubmit={submit}>
      <fieldset disabled={!editable || busy} className="space-y-4">
        <div>
          <span className="label">Bé</span>
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => set('child_id', c.id)}
                aria-pressed={v.child_id === c.id}
                className={`flex items-center gap-2 rounded-full border-2 py-1 pr-3 pl-1 ${
                  v.child_id === c.id ? 'font-semibold' : 'border-transparent bg-slate-100 dark:bg-slate-800'
                }`}
                style={v.child_id === c.id ? { borderColor: c.color } : undefined}
              >
                <ChildAvatar child={c} size="size-7 text-sm" />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Môn / lớp</span>
          <input className="input" required placeholder="Ví dụ: Tiếng Anh, Bơi, Toán thầy Minh" value={v.title} onChange={(e) => set('title', e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="label">{showRecurrence ? 'Từ ngày' : 'Ngày'}</span>
            <DateTimeField type="date" required value={v.date} onChange={changeDate} />
          </label>
          <label className="block">
            <span className="label">Bắt đầu</span>
            <DateTimeField type="time" required value={v.start_time} onChange={(t) => set('start_time', t)} />
          </label>
          <label className="block">
            <span className="label">Kết thúc</span>
            <DateTimeField type="time" required value={v.end_time} onChange={(t) => set('end_time', t)} />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="label">Nhắc trước</span>
            <select className="input" value={v.remind_minutes} onChange={(e) => set('remind_minutes', Number(e.target.value))}>
              {REMIND_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {remindLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 px-1">
            <input type="checkbox" className="size-5 accent-sky-500" checked={v.remind_email} onChange={(e) => set('remind_email', e.target.checked)} />
            <span>Gửi thêm email nhắc cho cả nhà</span>
          </label>
        </div>

        {allowRepeat && (
          <label className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-3 dark:bg-slate-800">
            <input type="checkbox" className="size-5 accent-sky-500" checked={v.repeat} onChange={(e) => set('repeat', e.target.checked)} />
            <span className="font-medium">Lặp lại hằng tuần</span>
          </label>
        )}

        {showRecurrence && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div>
              <span className="label">Các thứ trong tuần</span>
              <div className="flex gap-1.5">
                {ISO_WEEKDAYS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleWeekday(d)}
                    aria-pressed={v.weekdays.includes(d)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                      v.weekdays.includes(d) ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {weekdayLabel(d)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="label">Lặp đến ngày</span>
              <DateTimeField type="date" required value={v.end_date} onChange={(d) => set('end_date', d)} />
            </label>
          </div>
        )}

        <label className="block">
          <span className="label">Địa điểm</span>
          <input className="input" placeholder="Không bắt buộc" value={v.location} onChange={(e) => set('location', e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Giáo viên / trung tâm</span>
          <input className="input" placeholder="Không bắt buộc" value={v.teacher} onChange={(e) => set('teacher', e.target.value)} />
        </label>
        <label className="block">
          <span className="label flex justify-between">
            Số điện thoại liên hệ
            {v.contact_phone.trim() && (
              <a className="text-sky-600" href={`tel:${v.contact_phone.replace(/\s/g, '')}`}>
                Gọi
              </a>
            )}
          </span>
          <input className="input" type="tel" placeholder="Không bắt buộc" value={v.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Người đưa đón</span>
          <input className="input" list="escort-suggestions" placeholder="Ví dụ: Bố, Bà ngoại" value={v.escort} onChange={(e) => set('escort', e.target.value)} />
          <datalist id="escort-suggestions">
            {escorts.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">Ghi chú buổi học</span>
          <textarea className="input min-h-20" placeholder="Ví dụ: mang vở bài tập" value={v.note} onChange={(e) => set('note', e.target.value)} />
        </label>

        {error && <ErrorBox error={error} />}
        {editable && (
          <button className="btn-primary w-full" type="submit">
            {busy ? 'Đang lưu…' : submitLabel}
          </button>
        )}
      </fieldset>
    </form>
  )
}

function ScopeSheet({
  title,
  danger,
  busy,
  thisDisabledReason,
  followingDisabledReason,
  onPick,
  onClose,
}: {
  title: string
  danger?: boolean
  busy: boolean
  thisDisabledReason?: string
  followingDisabledReason?: string
  onPick: (scope: Scope) => void
  onClose: () => void
}) {
  const option = (scope: Scope, label: string, reason?: string) => (
    <button
      className={`${danger ? 'btn-danger' : 'btn-primary'} w-full flex-col gap-0.5`}
      disabled={busy || Boolean(reason)}
      onClick={() => onPick(scope)}
    >
      {label}
      {reason && <span className="text-xs font-normal opacity-90">{reason}</span>}
    </button>
  )
  return (
    <Sheet title={title} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-2">
          {option('this', 'Chỉ buổi này', thisDisabledReason)}
          {option('following', 'Buổi này và các buổi sau', followingDisabledReason)}
          <button className="btn-secondary" onClick={close}>
            Huỷ
          </button>
        </div>
      )}
    </Sheet>
  )
}

function OffSheet({ busy, onConfirm, onClose }: { busy: boolean; onConfirm: (reason: string | null) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <Sheet title="Đánh dấu nghỉ" onClose={onClose}>
      {(close) => (
        <>
          <label className="mb-4 block">
            <span className="label">Lý do (không bắt buộc)</span>
            <input className="input" autoFocus placeholder="Ví dụ: ốm, nghỉ lễ, cô bận" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex flex-col gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => onConfirm(reason.trim() || null)}>
              {busy ? 'Đang lưu…' : 'Xác nhận nghỉ'}
            </button>
            <button className="btn-secondary" onClick={close}>
              Huỷ
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
