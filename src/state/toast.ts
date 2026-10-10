import { useCallback } from 'react'
import { useIonToast } from '@ionic/react'

type Tone = 'info' | 'error'

/** Short message at the top of the screen; errors stay a little longer. */
export function useToast() {
  const [present] = useIonToast()
  return useCallback(
    (message: string, tone: Tone = 'info') =>
      present({
        message,
        position: 'top',
        duration: tone === 'error' ? 6000 : 3000,
        color: tone === 'error' ? 'danger' : 'dark',
        swipeGesture: 'vertical',
      }),
    [present],
  )
}
