import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { hhmm } from './dates'
import type { Child, Session } from './types'

/** Allowed values of `remind_minutes` (mirrors the check constraint in the database). */
export const REMIND_OPTIONS = [15, 30, 60, 120, 240, 720, 1440] as const

export function remindLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  if (minutes < 1440) return `${minutes / 60} tiếng`
  return `${minutes / 1440} ngày`
}

// iOS keeps at most 64 pending local notifications per app
const MAX_PENDING = 60

/** Start of a session as an instant; dates and times are Vietnam time. */
function startsAt(s: Session): Date {
  return new Date(`${s.date}T${hhmm(s.start_time)}:00+07:00`)
}

/** Stable 31-bit id per session and remind time, as the plugin requires an int. */
function notificationId(s: Session): number {
  const key = `${s.id}|${s.date}|${s.start_time}|${s.remind_minutes}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0
  return h & 0x7fffffff
}

let queue = Promise.resolve()

/**
 * Replaces this phone's pending reminders with ones for the given sessions.
 * The OS shows them on time even when the app is closed or the screen is locked.
 */
export function syncReminders(sessions: Session[], children: Child[]): Promise<void> {
  queue = queue.then(() => doSync(sessions, children)).catch((err) => console.warn('reminders', err))
  return queue
}

async function doSync(sessions: Session[], children: Child[]) {
  const now = Date.now()
  const names = new Map(children.map((c) => [c.id, c.name]))
  const wanted: LocalNotificationSchema[] = sessions
    .filter((s) => s.status === 'scheduled')
    .map((s) => ({ s, at: new Date(startsAt(s).getTime() - s.remind_minutes * 60_000) }))
    .filter(({ at }) => at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PENDING)
    .map(({ s, at }) => ({
      id: notificationId(s),
      title: `${s.title} (${names.get(s.child_id) ?? 'Bé'}) lúc ${hhmm(s.start_time)}`,
      body: [`Còn ${remindLabel(s.remind_minutes)}`, s.location, s.escort && `Đưa đón: ${s.escort}`].filter(Boolean).join(' · '),
      schedule: { at, allowWhileIdle: true },
      extra: { sessionId: s.id },
    }))

  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }
  if (wanted.length === 0) return

  let { display } = await LocalNotifications.checkPermissions()
  if (display === 'prompt' || display === 'prompt-with-rationale') {
    display = (await LocalNotifications.requestPermissions()).display
  }
  if (display !== 'granted') return
  await LocalNotifications.schedule({ notifications: wanted })
}
