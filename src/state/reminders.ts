import { useEffect } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useChildren, useSessionsRange } from '../data/queries'
import { addDaysISO, todayVN } from '../lib/dates'
import { isNative } from '../lib/native'
import { syncReminders } from '../lib/reminders'
import { useAppNavigate } from './pageTransition'

// look two weeks ahead; syncReminders keeps only the soonest ones (iOS limit)
const DAYS_AHEAD = 14

/**
 * Keeps this phone's local notifications in step with the household schedule.
 * Sessions added on another phone are picked up whenever this app refetches (open, resume, edit).
 */
export function useReminderSync() {
  const today = todayVN()
  const sessions = useSessionsRange(today, addDaysISO(today, DAYS_AHEAD))
  const children = useChildren()
  const navigate = useAppNavigate()

  useEffect(() => {
    if (isNative && sessions.data && children.data) syncReminders(sessions.data, children.data)
  }, [sessions.data, children.data])

  // tapping a reminder opens that session
  useEffect(() => {
    if (!isNative) return
    const listener = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const id = (notification.extra as { sessionId?: string } | undefined)?.sessionId
      if (id) navigate(`/buoi/${id}`)
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [navigate])
}
