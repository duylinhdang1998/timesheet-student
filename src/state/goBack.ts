import { useAppNavigate } from './pageTransition'

/** Whether there is an earlier entry of this app in history (react-router keeps the index in history.state). */
export function canGoBack() {
  return ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
}

/**
 * Back within the app. When the page was opened directly (reload, shared link, PWA restore),
 * history.back() would leave the app or land on a stale bfcache copy, so go to `fallback` instead.
 */
export function useGoBack(fallback = '/') {
  const navigate = useAppNavigate()
  return () => {
    if (canGoBack()) navigate(-1)
    else navigate(fallback, { replace: true, direction: 'back' })
  }
}
