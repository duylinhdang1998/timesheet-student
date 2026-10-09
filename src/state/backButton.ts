import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { App } from '@capacitor/app'
import { isNative } from '../lib/native'
import { canGoBack } from './goBack'
import { transitionTo } from './pageTransition'

// Close handlers of open sheets; the last one is on top
const sheetClosers: (() => void)[] = []

/** Lets the Android back button close this sheet before leaving the page. */
export function useCloseOnBack(onClose: () => void) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    const close = () => latest.current()
    sheetClosers.push(close)
    return () => {
      sheetClosers.splice(sheetClosers.lastIndexOf(close), 1)
    }
  }, [])
}

/** Android back button: close the top sheet, else go back in the app, else exit. */
export function useAndroidBackButton() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!isNative) return
    const listener = App.addListener('backButton', () => {
      const closeSheet = sheetClosers.at(-1)
      if (closeSheet) closeSheet()
      else if (canGoBack()) transitionTo('back', () => navigate(-1))
      else App.exitApp()
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [navigate])
}
