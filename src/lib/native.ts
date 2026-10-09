import { Capacitor } from '@capacitor/core'

/** Running inside the Android/iOS app shell rather than a browser. */
export const isNative = Capacitor.isNativePlatform()
