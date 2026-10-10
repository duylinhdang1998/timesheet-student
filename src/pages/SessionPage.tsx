import { useState } from 'react'
import { IonButton, IonContent, IonIcon, IonPage, useIonAlert, useIonLoading } from '@ionic/react'
import {
  callOutline,
  carOutline,
  clipboardOutline,
  locationOutline,
  notificationsOutline,
  personOutline,
  repeatOutline,
  timeOutline,
} from 'ionicons/icons'
import { useParams } from 'react-router-dom'
import { useGoBack } from '../state/goBack'
import { InfoRow, PageHeader, RowsCard } from '../components/Page'
import { ChildAvatar, childLine, tint } from '../components/ChildAvatar'
import { ErrorBox, Loading } from '../components/States'
import { OffReasonSheet } from '../components/OffReasonSheet'
import { EditSessionSheet, useInvalidateSchedule, usePickScope, type Scope } from '../components/SessionSheet'
import { findOverlap, overlapMessage, useChildren, useSeries, useSession } from '../data/queries'
import { supabase } from '../lib/supabase'
import { formatDate, formatDayFull, formatDayLong, formatWeekdays, hhmm } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { remindLabel } from '../lib/reminders'
import type { Series, Session } from '../lib/types'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

const DANGER = '#d9534a'

export function SessionPage() {
  const { id } = useParams()
  const { canEdit } = useHousehold()
  const sessionQuery = useSession(id)
  const session = sessionQuery.data
  const seriesQuery = useSeries(session?.series_id)
  const [editing, setEditing] = useState(false)
  const ready = session && !(session.series_id && seriesQuery.isPending)

  // one IonPage for every state: Ionic only animates in the page element it saw mount first
  return (
    <IonPage>
      <PageHeader
        title="Buổi học"
        backTo="/tabs/lich"
        end={
          canEdit &&
          ready && (
            <IonButton onClick={() => setEditing(true)} className="font-semibold">
              Sửa
            </IonButton>
          )
        }
      />
      <IonContent>
        <div className="mx-auto max-w-md px-4 pt-2 pb-10">
          {sessionQuery.isPending || (session?.series_id && seriesQuery.isPending) ? (
            <Loading />
          ) : sessionQuery.error ? (
            <ErrorBox error={sessionQuery.error} />
          ) : !session ? (
            <p className="text-muted">Buổi học không còn tồn tại.</p>
          ) : (
            <SessionDetail key={session.id + session.status} session={session} series={seriesQuery.data ?? null} />
          )}
        </div>
      </IonContent>
      {editing && session && (
        <EditSessionSheet session={session} series={seriesQuery.data ?? null} onClose={() => setEditing(false)} />
      )}
    </IonPage>
  )
}

function SessionDetail({ session, series }: { session: Session; series: Series | null }) {
  const goBack = useGoBack()
  const toast = useToast()
  const invalidate = useInvalidateSchedule()
  const pickScope = usePickScope()
  const { canEdit } = useHousehold()
  const { data: children = [] } = useChildren()
  const [presentAlert] = useIonAlert()
  const [presentLoading, dismissLoading] = useIonLoading()
  const [offOpen, setOffOpen] = useState(false)

  const child = children.find((c) => c.id === session.child_id)
  const color = child?.color ?? '#94a3b8'
  const off = session.status === 'off'
  const phone = session.contact_phone?.replace(/\s/g, '')

  async function run(action: () => Promise<void>) {
    await presentLoading({ message: 'Đang lưu…' })
    try {
      await action()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      await dismissLoading()
    }
  }

  const remove = (scope: Scope) =>
    run(async () => {
      const { error } =
        scope === 'this'
          ? await supabase.from('sessions').delete().eq('id', session.id)
          : await supabase.rpc('delete_series_from', { p_session_id: session.id })
      if (error) throw error
      toast(scope === 'this' ? 'Đã xoá buổi học' : 'Đã xoá buổi này và các buổi sau')
      await invalidate()
      goBack()
    })

  async function confirmDelete() {
    if (series) {
      const scope = await pickScope('Xoá buổi học', true)
      if (scope) await remove(scope)
      return
    }
    presentAlert({
      header: 'Xoá buổi học?',
      message: `“${session.title}” ngày ${formatDate(session.date)} sẽ bị xoá.`,
      buttons: [
        { text: 'Huỷ', role: 'cancel' },
        { text: 'Xoá', role: 'destructive', handler: () => remove('this') },
      ],
    })
  }

  const setStatus = (status: Session['status'], reason: string | null) =>
    run(async () => {
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
      await invalidate()
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 pt-1">
        {child && <ChildAvatar child={child} size="size-16 text-[22px]" />}
        <div className="min-w-0 flex-1">
          <h1 className={`text-[1.5rem] leading-tight font-bold ${off ? 'text-muted line-through' : ''}`}>
            {session.title}
          </h1>
          {child && (
            <p className="truncate text-[15px]" style={{ color }}>
              {childLine(child)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ backgroundColor: tint(color, 14) }}>
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-[22px]"
          style={{ backgroundColor: tint(color, 22), color }}
        >
          <IonIcon icon={timeOutline} />
        </span>
        <div>
          <div className="text-[20px] font-bold tabular-nums">
            {hhmm(session.start_time)} – {hhmm(session.end_time)}
          </div>
          <div className="text-[14px]">{formatDayFull(session.date)}</div>
        </div>
      </div>

      {off && (
        <div className="rounded-2xl px-4 py-3 text-[14px]" style={{ backgroundColor: tint(DANGER, 12), color: DANGER }}>
          <span className="font-semibold">Buổi này nghỉ</span>
          {session.off_reason ? `: ${session.off_reason}` : ''}
        </div>
      )}

      <RowsCard>
        {session.location && <InfoRow icon={locationOutline} label="Địa điểm" value={session.location} />}
        {(session.teacher || phone) && (
          <InfoRow
            icon={personOutline}
            label="Giáo viên"
            value={session.teacher ?? session.contact_phone}
            end={
              phone && (
                <a
                  href={`tel:${phone}`}
                  aria-label={`Gọi ${session.contact_phone}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-[17px] text-white bg-(--ion-color-primary)"
                >
                  <IonIcon icon={callOutline} />
                </a>
              )
            }
          />
        )}
        {session.escort && <InfoRow icon={carOutline} label="Đưa đón" value={session.escort} />}
        <InfoRow
          icon={notificationsOutline}
          label="Nhắc trước"
          value={`${remindLabel(session.remind_minutes)}${session.remind_email ? ' · cả nhà' : ''}`}
        />
      </RowsCard>

      {session.note && (
        <div className="note-card px-4 py-3.5">
          <div className="flex items-center gap-2 text-[14px] font-medium text-(--app-note-fg)">
            <IonIcon icon={clipboardOutline} className="text-lg" />
            Cần chuẩn bị
          </div>
          <p className="mt-1 text-[15px] whitespace-pre-line">{session.note}</p>
        </div>
      )}

      {series && (
        <RowsCard>
          <InfoRow
            icon={repeatOutline}
            label="Lịch lặp"
            value={`${formatWeekdays(series.weekdays)} · ${series.end_date ? `Đến ${formatDate(series.end_date)}` : 'Không kết thúc'}`}
          />
        </RowsCard>
      )}

      {canEdit && (
        <div className="space-y-1 pt-2">
          {off ? (
            <IonButton expand="block" fill="outline" className="h-12" onClick={() => setStatus('scheduled', null)}>
              Học lại buổi này
            </IonButton>
          ) : (
            <IonButton expand="block" fill="outline" color="danger" className="h-12" onClick={() => setOffOpen(true)}>
              Báo nghỉ buổi này
            </IonButton>
          )}
          <IonButton expand="block" fill="clear" color="danger" onClick={confirmDelete}>
            Xoá buổi học
          </IonButton>
        </div>
      )}

      {offOpen && (
        <OffReasonSheet
          subtitle={`${session.title} · ${formatDayLong(session.date)} · ${hhmm(session.start_time)}–${hhmm(session.end_time)}`}
          onClose={() => setOffOpen(false)}
          onConfirm={(reason) => void setStatus('off', reason)}
        />
      )}
    </div>
  )
}
