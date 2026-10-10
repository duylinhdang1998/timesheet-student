import { useRef, useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonListHeader,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { formatDayShort } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { Child, DayNote } from '../lib/types'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

/**
 * Edit the family note and each child's note for one day. Empty text deletes the note.
 * Opens on mount (as an iOS card over the current screen); `onClose` runs once it has slid away.
 */
export function DayNotesModal({
  date,
  notes,
  kids,
  onClose,
}: {
  date: string
  notes: DayNote[]
  kids: Child[]
  onClose: () => void
}) {
  const modal = useRef<HTMLIonModalElement>(null)
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const targets: { childId: string | null; label: string; color: string }[] = [
    { childId: null, label: 'Cả nhà', color: '#f59e0b' },
    ...kids.map((c) => ({ childId: c.id, label: c.name, color: c.color })),
  ]
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      targets.map((t) => [t.childId ?? '', notes.find((n) => n.child_id === t.childId)?.content ?? '']),
    ),
  )

  async function save() {
    setBusy(true)
    try {
      for (const t of targets) {
        const text = texts[t.childId ?? ''].trim()
        const existing = notes.find((n) => n.child_id === t.childId)
        if (existing && !text) {
          const { error } = await supabase.from('day_notes').delete().eq('id', existing.id)
          if (error) throw error
        } else if (existing && text !== existing.content) {
          const { error } = await supabase.from('day_notes').update({ content: text }).eq('id', existing.id)
          if (error) throw error
        } else if (!existing && text) {
          const { error } = await supabase
            .from('day_notes')
            .insert({ household_id: householdId, child_id: t.childId, date, content: text })
          if (error) throw error
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['day_notes'] })
      await modal.current?.dismiss()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <IonModal
      ref={modal}
      isOpen
      presentingElement={document.querySelector<HTMLElement>('ion-router-outlet') ?? undefined}
      onDidDismiss={onClose}
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => modal.current?.dismiss()}>Huỷ</IonButton>
          </IonButtons>
          <IonTitle>Ghi chú {formatDayShort(date)}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={busy} onClick={save}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="grouped">
        <div className="mx-auto max-w-md pb-8">
          {targets.map((t) => (
            <IonList key={t.childId ?? 'family'} inset>
              <IonListHeader>
                <span className="font-semibold" style={{ color: t.color }}>
                  {t.label}
                </span>
              </IonListHeader>
              <IonItem lines="none">
                <IonTextarea
                  aria-label={`Ghi chú cho ${t.label}`}
                  autoGrow
                  rows={2}
                  placeholder={t.childId ? 'Ví dụ: kiểm tra Toán, mặc đồng phục thể dục' : 'Ví dụ: họp phụ huynh 17h'}
                  value={texts[t.childId ?? '']}
                  onIonInput={(e) => setTexts((prev) => ({ ...prev, [t.childId ?? '']: e.detail.value ?? '' }))}
                />
              </IonItem>
            </IonList>
          ))}
        </div>
      </IonContent>
    </IonModal>
  )
}
