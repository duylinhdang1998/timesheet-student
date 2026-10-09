import { useSyncExternalStore } from 'react'
import { nowTimeVN } from '../lib/dates'

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 30_000)
  return () => window.clearInterval(id)
}

/** Current Vietnam time as "HH:mm", refreshed every 30 seconds. */
export function useNowVN(): string {
  return useSyncExternalStore(subscribe, nowTimeVN)
}
