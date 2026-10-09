import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet } from './Sheet'
import { supabase } from '../lib/supabase'
import { formatDayLong } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { Child, DayNote } from '../lib/types'
import { useHousehold } from '../state/household'
import { useToast } from '../state/toast'

/** Edit the family note and each child's note for one day. Empty text deletes the note. */
export function DayNotesSheet({
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
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const targets: { childId: string | null; label: string; color: string }[] = [
    { childId: null, label: 'Cả nhà', color: '#f59e0b' },
    ...kids.map((c) => ({ childId: c.id, label: c.name, color: c.color })),
  ]
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(targets.map((t) => [t.childId ?? '', notes.find((n) => n.child_id === t.childId)?.content ?? ''])),
  )

  async function save(close: () => void) {
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
      close()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Ghi chú ${formatDayLong(date)}`} onClose={onClose}>
      {(close) => (
      <div className="space-y-4">
        {targets.map((t) => (
          <label key={t.childId ?? 'family'} className="block">
            <span className="label" style={{ color: t.color }}>
              {t.label}
            </span>
            <textarea
              className="input min-h-20"
              placeholder={t.childId ? 'Ví dụ: kiểm tra Toán, mặc đồng phục thể dục' : 'Ví dụ: họp phụ huynh 17h'}
              value={texts[t.childId ?? '']}
              onChange={(e) => setTexts({ ...texts, [t.childId ?? '']: e.target.value })}
            />
          </label>
        ))}
        <button className="btn-primary w-full" disabled={busy} onClick={() => save(close)}>
          {busy ? 'Đang lưu…' : 'Lưu ghi chú'}
        </button>
      </div>
      )}
    </Sheet>
  )
}
