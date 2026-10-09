import { useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useAppNavigate } from '../state/pageTransition'
import { useGoBack } from '../state/goBack'
import { useQueryClient } from '@tanstack/react-query'
import { TopBar } from '../components/TopBar'
import { CHILD_COLORS, ChildAvatar } from '../components/ChildAvatar'
import { ConfirmSheet } from '../components/Sheet'
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
    <>
      <TopBar title={isNew ? 'Thêm bé' : 'Thông tin bé'} back />
      <main className="mx-auto max-w-md px-4 py-4">
        {isPending ? (
          <Loading />
        ) : !isNew && !child ? (
          <p className="text-slate-500">Không tìm thấy bé.</p>
        ) : (
          <ChildForm child={child} usedColors={children?.map((c) => c.color) ?? []} />
        )}
      </main>
    </>
  )
}

function ChildForm({ child, usedColors }: { child?: Child; usedColors: string[] }) {
  const navigate = useAppNavigate()
  const goBack = useGoBack('/gia-dinh')
  const queryClient = useQueryClient()
  const toast = useToast()
  const { householdId, canEdit } = useHousehold()
  const [filter, setFilter] = useChildFilter()
  const fileInput = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(child?.name ?? '')
  const [color, setColor] = useState(child?.color ?? CHILD_COLORS.find((c) => !usedColors.includes(c)) ?? CHILD_COLORS[0])
  const [avatar, setAvatar] = useState<string | null>(child?.avatar ?? null)
  const [school, setSchool] = useState(child?.school ?? '')
  const [className, setClassName] = useState(child?.class_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    navigate('/gia-dinh', { replace: true, direction: 'back' })
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={!canEdit || busy} className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          <ChildAvatar child={{ name: name || '?', color, avatar }} size="size-24 text-4xl" />
          {canEdit && (
            <div className="flex gap-3 text-sm">
              <button type="button" className="font-medium text-sky-600" onClick={() => fileInput.current?.click()}>
                {avatar ? 'Đổi ảnh' : 'Chọn ảnh'}
              </button>
              {avatar && (
                <button type="button" className="text-slate-500" onClick={() => setAvatar(null)}>
                  Bỏ ảnh
                </button>
              )}
            </div>
          )}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </div>

        <label className="block">
          <span className="label">Tên bé</span>
          <input className="input" required placeholder="Ví dụ: An" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div>
          <span className="label">Màu trên lịch</span>
          <div className="flex flex-wrap gap-3">
            {CHILD_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Màu ${c}`}
                className={`size-9 rounded-full ${color === c ? 'ring-4 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
                style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
              />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Trường</span>
          <input className="input" placeholder="Không bắt buộc" value={school} onChange={(e) => setSchool(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Lớp</span>
          <input className="input" placeholder="Không bắt buộc" value={className} onChange={(e) => setClassName(e.target.value)} />
        </label>

        {error && <ErrorBox error={error} />}
        {canEdit && (
          <button className="btn-primary w-full" type="submit">
            {busy ? 'Đang lưu…' : child ? 'Lưu' : 'Thêm bé'}
          </button>
        )}
        {canEdit && child && (
          <button type="button" className="btn-secondary w-full text-rose-600" onClick={() => setDeleting(true)}>
            Xoá bé
          </button>
        )}
      </fieldset>

      {deleting && child && (
        <ConfirmSheet
          title={`Xoá ${child.name}?`}
          message={
            <>
              Toàn bộ <b>lịch học và ghi chú</b> của {child.name} sẽ bị xoá vĩnh viễn, không khôi phục được.
            </>
          }
          confirmLabel="Xoá vĩnh viễn"
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(false)}
        />
      )}
    </form>
  )
}
