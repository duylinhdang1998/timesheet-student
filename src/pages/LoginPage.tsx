import { useState, type FormEvent } from 'react'
import {
  IonButton,
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { LEGAL_TITLE, type LegalDoc } from '../lib/legal'
import { LegalModal } from './LegalPage'
import { PoweredBy } from '../components/Page'

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legal, setLegal] = useState<LegalDoc | null>(null)

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

  return (
    <IonPage>
      <IonContent className="grouped">
        <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center py-10">
          <img src="/app-icon.png" alt="" className="mx-auto mb-4 size-20 rounded-[22%] shadow-md" />
          <h1 className="mb-1 text-center text-[22px] font-bold">Mẹ và lịch học</h1>
          <p className="mb-6 text-center text-muted">Lịch học và ghi chú hằng ngày của các con</p>

          <div className="px-4">
            <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value as 'signin' | 'signup')}>
              <IonSegmentButton value="signin">
                <IonLabel>Đăng nhập</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="signup">
                <IonLabel>Đăng ký</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          <form onSubmit={submit}>
            <IonList inset>
              <IonItem>
                <IonInput
                  label="Email"
                  labelPlacement="stacked"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  required
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                />
              </IonItem>
              <IonItem lines="none">
                <IonInput
                  label="Mật khẩu"
                  labelPlacement="stacked"
                  type="password"
                  autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minlength={6}
                  required
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                >
                  <IonInputPasswordToggle slot="end" />
                </IonInput>
              </IonItem>
            </IonList>
            <div className="space-y-3 px-4">
              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {error}
                </p>
              )}
              <IonButton expand="block" type="submit" disabled={busy}>
                {busy ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </IonButton>
            </div>
          </form>
          {mode === 'signin' && (
            <p className="mt-6 text-center text-[13px] text-muted">Quên mật khẩu? Hãy nhờ quản trị viên đặt lại.</p>
          )}
          <p className="mt-6 px-6 text-center text-xs leading-relaxed text-muted">
            Khi {mode === 'signin' ? 'đăng nhập' : 'tạo tài khoản'}, bạn đồng ý với{' '}
            <button type="button" onClick={() => setLegal('terms')} className="font-medium text-(--ion-color-primary)">
              {LEGAL_TITLE.terms}
            </button>{' '}
            và{' '}
            <button
              type="button"
              onClick={() => setLegal('privacy')}
              className="font-medium text-(--ion-color-primary)"
            >
              {LEGAL_TITLE.privacy}
            </button>
            .
          </p>
          <div className="mt-8">
            <PoweredBy />
          </div>
        </div>
      </IonContent>
      <LegalModal doc={legal} onClose={() => setLegal(null)} />
    </IonPage>
  )
}
