import { useIonRouter } from '@ionic/react'

/**
 * Back within the app. When the page was opened directly (reload, shared link, tapped reminder),
 * there is nothing to go back to, so slide back to `fallback` instead.
 */
export function useGoBack(fallback = '/tabs/lich') {
  const router = useIonRouter()
  return () => {
    if (router.canGoBack()) router.goBack()
    else router.push(fallback, 'back', 'replace')
  }
}
