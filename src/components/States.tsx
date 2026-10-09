import { AppLink } from './AppLink'
import { errorMessage } from '../lib/errors'
import { useHousehold } from '../state/household'

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <div className="size-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
      {errorMessage(error)}
    </p>
  )
}

export function EmptyChildren() {
  const { canEdit } = useHousehold()
  return (
    <div className="card p-6 text-center">
      <p className="mb-4 text-slate-600 dark:text-slate-300">Chưa có bé nào trong gia đình.</p>
      {canEdit && (
        <AppLink to="/con/moi" className="btn-primary">
          Thêm bé đầu tiên
        </AppLink>
      )}
    </div>
  )
}
