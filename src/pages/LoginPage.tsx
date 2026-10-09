import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        if (!data.session) {
          setError('Đã tạo tài khoản nhưng máy chủ đang yêu cầu xác nhận email. Hãy liên hệ quản trị viên.')
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const tab = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-medium ${active ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <img src="/app-icon.png" alt="" className="mx-auto mb-4 size-20" />
      <h1 className="mb-1 text-center text-2xl font-bold">Mẹ và lịch học</h1>
      <p className="mb-8 text-center text-slate-500">Lịch học và ghi chú hằng ngày của các con</p>

      <div className="mb-5 flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        <button className={tab(mode === 'signin')} onClick={() => setMode('signin')}>
          Đăng nhập
        </button>
        <button className={tab(mode === 'signup')} onClick={() => setMode('signup')}>
          Đăng ký
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Mật khẩu</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
      {mode === 'signin' && (
        <p className="mt-6 text-center text-sm text-slate-500">Quên mật khẩu? Hãy nhờ quản trị viên đặt lại.</p>
      )}
    </div>
  )
}
