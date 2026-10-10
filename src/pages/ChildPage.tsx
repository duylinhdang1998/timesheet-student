import { useRef, useState, type FormEvent } from 'react'
import { IonButton, IonContent, IonInput, IonItem, IonLabel, IonList, IonPage, useIonAlert } from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useGoBack } from '../state/goBack'
import { PageHeader } from '../components/Page'
import { CHILD_COLORS, ChildAvatar } from '../components/ChildAvatar'
import { ErrorBox, Loading } from '../components/States'
import { useChildren } from '../data/queries'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { avatarFromFile } from '../lib/image'
import type { Child } from '../lib/types'
import { useChildFilter } from '../state/childFilter'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

export function ChildPage() {
  const { id } = useParams()
  const { data: children, isPending } = useChildren()
  const isNew = !id
  const child = children?.find((c) => c.id === id)

  return (
    <IonPage>
      <PageHeader title={isNew ? 'Thêm bé' : 'Thông tin bé'} backTo="/tabs/gia-dinh" />
      <IonContent className="grouped">
        <div className="mx-auto max-w-md pt-4 pb-8">
          {isPending ? (
            <Loading />
          ) : !isNew && !child ? (
            <p className="px-4 text-muted">Không tìm thấy bé.</p>
          ) : (
            <ChildForm child={child} usedColors={children?.map((c) => c.color) ?? []} />
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

function ChildForm({ child, usedColors }: { child?: Child; usedColors: string[] }) {
  const goBack = useGoBack('/tabs/gia-dinh')
  const queryClient = useQueryClient()
  const toast = useToast()
  const [presentAlert] = useIonAlert()
  const { householdId, canEdit } = useHousehold()
  const [filter, setFilter] = useChildFilter()
  const fileInput = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(child?.name ?? '')
  const [color, setColor] = useState(
    child?.color ?? CHILD_COLORS.find((c) => !usedColors.includes(c)) ?? CHILD_COLORS[0],
  )
  const [avatar, setAvatar] = useState<string | null>(child?.avatar ?? null)
  const [school, setSchool] = useState(child?.school ?? '')
  const [className, setClassName] = useState(child?.class_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    try {
      setAvatar(await avatarFromFile(file))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Hãy nhập tên bé')
    setBusy(true)
    setError(null)
    const fields = {
      name: name.trim(),
      color,
      avatar,
      school: school.trim() || null,
      class_name: className.trim() || null,
    }
    const { error } = child
      ? await supabase.from('children').update(fields).eq('id', child.id)
      : await supabase.from('children').insert({ ...fields, household_id: householdId })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    await queryClient.invalidateQueries({ queryKey: ['children'] })
    toast(child ? 'Đã lưu' : `Đã thêm ${fields.name}`)
    goBack()
  }

  async function remove() {
    setBusy(true)
    const { error } = await supabase.from('children').delete().eq('id', child!.id)
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    if (filter === child!.id) setFilter(null)
    await Promise.all(
      ['children', 'sessions', 'day_notes', 'escorts'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
    toast(`Đã xoá ${child!.name}`)
    goBack()
  }

  function confirmRemove() {
    presentAlert({
      header: `Xoá ${child!.name}?`,
      message: `Toàn bộ lịch học và ghi chú của ${child!.name} sẽ bị xoá vĩnh viễn, không khôi phục được.`,
      buttons: [
        { text: 'Huỷ', role: 'cancel' },
        { text: 'Xoá vĩnh viễn', role: 'destructive', handler: () => void remove() },
      ],
    })
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-col items-center gap-1">
        <ChildAvatar child={{ name: name || '?', color, avatar }} size="size-24 text-4xl" />
        {canEdit && (
          <div className="flex">
            <IonButton fill="clear" size="small" onClick={() => fileInput.current?.click()}>
              {avatar ? 'Đổi ảnh' : 'Chọn ảnh'}
            </IonButton>
            {avatar && (
              <IonButton fill="clear" size="small" color="medium" onClick={() => setAvatar(null)}>
                Bỏ ảnh
              </IonButton>
            )}
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </div>

      <IonList inset>
        <IonItem>
          <IonInput
            label="Tên bé"
            labelPlacement="stacked"
            placeholder="Ví dụ: An"
            readonly={!canEdit}
            value={name}
            onIonInput={(e) => setName(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem lines="none">
          <div className="w-full py-3">
            <IonLabel className="mb-3 block text-[13px]">Màu trên lịch</IonLabel>
            <div className="flex flex-wrap gap-3 p-1">
              {CHILD_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  disabled={!canEdit}
                  onClick={() => setColor(c)}
                  aria-label={`Màu ${c}`}
                  className={`size-9 rounded-full transition-shadow ${color === c ? 'ring-3 ring-offset-2 ring-offset-(--app-card-bg)' : ''}`}
                  style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </IonItem>
      </IonList>

      <IonList inset>
        <IonItem>
          <IonInput
            label="Trường"
            labelPlacement="stacked"
            placeholder="Không bắt buộc"
            readonly={!canEdit}
            value={school}
            onIonInput={(e) => setSchool(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem lines="none">
          <IonInput
            label="Lớp"
            labelPlacement="stacked"
            placeholder="Không bắt buộc"
            readonly={!canEdit}
            value={className}
            onIonInput={(e) => setClassName(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      <div className="space-y-3 px-4">
        {error && <ErrorBox error={error} />}
        {canEdit && (
          <IonButton expand="block" type="submit" disabled={busy}>
            {busy ? 'Đang lưu…' : child ? 'Lưu' : 'Thêm bé'}
          </IonButton>
        )}
      </div>

      {canEdit && child && (
        <IonList inset>
          <IonItem button detail={false} disabled={busy} onClick={confirmRemove}>
            <IonLabel color="danger">Xoá bé</IonLabel>
          </IonItem>
        </IonList>
      )}
    </form>
  )
}
