import { useState, type FormEvent } from 'react'
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRadio,
  IonRadioGroup,
} from '@ionic/react'
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

  return (
    <IonPage>
      <IonContent className="grouped">
        <div className="mx-auto max-w-sm py-10">
          <div className="px-5">
            <h1 className="mb-1 text-[22px] font-bold">Chào mừng!</h1>
            <p className="text-muted">Bắt đầu bằng cách tạo gia đình, hoặc vào gia đình đã có bằng mã mời.</p>
          </div>

          <IonList inset>
            <IonRadioGroup value={mode} onIonChange={(e) => setMode(e.detail.value)}>
              <IonItem>
                <IonRadio value="create" justify="space-between">
                  <IonLabel className="ion-text-wrap">
                    <h2 className="font-semibold">Tạo gia đình mới</h2>
                    <p>Bạn sẽ là chủ nhà và mời bố/mẹ, ông bà sau.</p>
                  </IonLabel>
                </IonRadio>
              </IonItem>
              <IonItem lines="none">
                <IonRadio value="join" justify="space-between">
                  <IonLabel className="ion-text-wrap">
                    <h2 className="font-semibold">Tôi có mã mời</h2>
                    <p>Nhập mã 6 ký tự mà chủ nhà gửi cho bạn.</p>
                  </IonLabel>
                </IonRadio>
              </IonItem>
            </IonRadioGroup>
          </IonList>

          <form onSubmit={submit}>
            <IonList inset>
              <IonItem>
                <IonInput
                  label="Tên của bạn (hiển thị cho cả nhà)"
                  labelPlacement="stacked"
                  required
                  placeholder="Ví dụ: Mẹ, Bố, Bà nội"
                  value={displayName}
                  onIonInput={(e) => setDisplayName(e.detail.value ?? '')}
                />
              </IonItem>
              {mode === 'create' ? (
                <IonItem lines="none">
                  <IonInput
                    label="Tên gia đình"
                    labelPlacement="stacked"
                    required
                    placeholder="Ví dụ: Nhà An Bình"
                    value={householdName}
                    onIonInput={(e) => setHouseholdName(e.detail.value ?? '')}
                  />
                </IonItem>
              ) : (
                <IonItem lines="none">
                  <IonInput
                    label="Mã mời"
                    labelPlacement="stacked"
                    required
                    maxlength={6}
                    autocapitalize="characters"
                    className="font-mono text-[22px] tracking-[0.4em] uppercase"
                    value={code}
                    onIonInput={(e) => setCode((e.detail.value ?? '').toUpperCase())}
                  />
                </IonItem>
              )}
            </IonList>
            <div className="space-y-3 px-4">
              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {error}
                </p>
              )}
              <IonButton expand="block" type="submit" disabled={busy}>
                {busy ? 'Đang xử lý…' : mode === 'create' ? 'Tạo gia đình' : 'Vào gia đình'}
              </IonButton>
              <IonButton expand="block" fill="clear" color="medium" onClick={() => supabase.auth.signOut()}>
                Đăng xuất
              </IonButton>
            </div>
          </form>
        </div>
      </IonContent>
    </IonPage>
  )
}
