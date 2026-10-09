import { isNative } from './native'

// An invite link looks like https://app/?ma=K7P2QX. The code is stashed so it survives sign-up.
const KEY = 'pending-invite-code'

export function captureInviteCodeFromUrl() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('ma')
  if (!code) return
  try {
    localStorage.setItem(KEY, code.toUpperCase())
  } catch {
    // ignore: user can still type the code
  }
  url.searchParams.delete('ma')
  window.history.replaceState(null, '', url)
}

export function pendingInviteCode(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearPendingInviteCode() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// Inside the app the origin is https://localhost, so links must point at the deployed web app;
// without VITE_PUBLIC_URL the invite carries only the code.
export function inviteLink(code: string): string | null {
  const base = isNative ? import.meta.env.VITE_PUBLIC_URL : window.location.origin
  return base ? `${base.replace(/\/$/, '')}/?ma=${code}` : null
}
