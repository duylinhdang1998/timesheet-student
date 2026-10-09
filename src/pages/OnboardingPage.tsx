import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { pendingInviteCode, clearPendingInviteCode } from '../lib/invite'

/** First login: create a household or join one with an invite code. */
export function OnboardingPage() {
  const queryClient = useQueryClient()
  const initialCode = pendingInviteCode()
  const [mode, setMode] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState(initialCode ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error } =
        mode === 'create'
          ? await supabase.rpc('create_household', { p_name: householdName, p_display_name: displayName })
          : await supabase.rpc('join_household', { p_code: code, p_display_name: displayName })
      if (error) throw error
      clearPendingInviteCode()
      await queryClient.invalidateQueries({ queryKey: ['membership'] })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const option = (active: boolean) =>
    `card w-full p-4 text-left ${active ? 'ring-2 ring-sky-500 dark:ring-sky-500' : ''}`

  return (
    <div className="pt-safe mx-auto min-h-dvh max-w-sm px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">Chào mừng!</h1>
      <p className="mb-6 text-slate-500">Bắt đầu bằng cách tạo gia đình, hoặc vào gia đình đã có bằng mã mời.</p>

      <div className="mb-6 space-y-3">
        <button className={option(mode === 'create')} onClick={() => setMode('create')}>
          <div className="font-semibold">Tạo gia đình mới</div>
          <div className="text-sm text-slate-500">Bạn sẽ là chủ nhà và mời bố/mẹ, ông bà sau.</div>
        </button>
        <button className={option(mode === 'join')} onClick={() => setMode('join')}>
          <div className="font-semibold">Tôi có mã mời</div>
          <div className="text-sm text-slate-500">Nhập mã 6 ký tự mà chủ nhà gửi cho bạn.</div>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Tên của bạn (hiển thị cho cả nhà)</span>
          <input className="input" required placeholder="Ví dụ: Mẹ, Bố, Bà nội" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        {mode === 'create' ? (
          <label className="block">
            <span className="label">Tên gia đình</span>
            <input className="input" required placeholder="Ví dụ: Nhà An Bình" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
          </label>
        ) : (
          <label className="block">
            <span className="label">Mã mời</span>
            <input
              className="input text-center font-mono text-2xl tracking-[0.4em] uppercase"
              required
              maxLength={6}
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Đang xử lý…' : mode === 'create' ? 'Tạo gia đình' : 'Vào gia đình'}
        </button>
      </form>
      <button className="mt-6 w-full text-center text-sm text-slate-500" onClick={() => supabase.auth.signOut()}>
        Đăng xuất
      </button>
    </div>
  )
}
