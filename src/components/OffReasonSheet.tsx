import { useRef, useState } from 'react'
import { IonButton, IonModal, IonTextarea } from '@ionic/react'

const QUICK_REASONS = ['Ốm', 'Bận việc nhà', 'Nghỉ lễ', 'Thầy/cô nghỉ', 'Đi chơi xa']

/**
 * Bottom sheet asking why a session is off. `onConfirm` runs after the sheet has finished closing,
 * so the caller may re-render the page underneath without cutting the animation short.
 */
export function OffReasonSheet({
  subtitle,
  onClose,
  onConfirm,
}: {
  subtitle: string
  onClose: () => void
  onConfirm: (reason: string | null) => void
}) {
  const modal = useRef<HTMLIonModalElement>(null)
  const confirmed = useRef<string | null | undefined>(undefined)
  const [reason, setReason] = useState('')

  const confirm = () => {
    confirmed.current = reason.trim() || null
    modal.current?.dismiss()
  }

  return (
    <IonModal
      ref={modal}
      isOpen
      className="auto-sheet"
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      onDidDismiss={() => {
        onClose()
        if (confirmed.current !== undefined) onConfirm(confirmed.current)
      }}
    >
      <div className="space-y-4 px-5 pt-6 pb-[calc(var(--ion-safe-area-bottom)+1rem)]">
        <div>
          <h2 className="text-lg font-semibold">Đánh dấu nghỉ</h2>
          <p className="text-muted mt-1 text-[13px]">{subtitle}</p>
        </div>

        <div className="space-y-2">
          <p className="text-muted text-[13px] font-medium">Lý do (không bắt buộc)</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${
                  reason === r ? 'bg-(--ion-color-primary) font-medium text-white' : 'bg-(--app-track)'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-(--app-track) px-3">
            <IonTextarea
              aria-label="Lý do"
              value={reason}
              onIonInput={(e) => setReason(e.detail.value ?? '')}
              placeholder="Hoặc nhập lý do khác…"
              autoGrow
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-1">
          <IonButton expand="block" color="danger" className="h-12" onClick={confirm}>
            Xác nhận nghỉ
          </IonButton>
          <IonButton expand="block" fill="clear" color="medium" onClick={() => modal.current?.dismiss()}>
            Huỷ
          </IonButton>
        </div>
      </div>
    </IonModal>
  )
}
