import { IonButton, IonSpinner } from '@ionic/react'
import { errorMessage } from '../lib/errors'
import { useHousehold } from '../state/household'

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <IonSpinner />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
      {errorMessage(error)}
    </p>
  )
}

export function EmptyChildren() {
  const { canEdit } = useHousehold()
  return (
    <div className="card p-6 text-center">
      <p className="mb-4 text-muted">Chưa có bé nào trong gia đình.</p>
      {canEdit && (
        <IonButton routerLink="/con/moi" routerDirection="forward">
          Thêm bé đầu tiên
        </IonButton>
      )}
    </div>
  )
}
