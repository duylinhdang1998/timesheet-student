export type Role = 'owner' | 'editor' | 'viewer'
export type SessionStatus = 'scheduled' | 'off'

export interface Membership {
  household_id: string
  user_id: string
  role: Role
  display_name: string
  households: { name: string }
}

export interface Member {
  household_id: string
  user_id: string
  role: Role
  display_name: string
  created_at: string
}

export interface Invite {
  id: string
  household_id: string
  code: string
  role: Role
  created_at: string
  expires_at: string
  used_by: string | null
}

export interface Child {
  id: string
  household_id: string
  name: string
  color: string
  avatar: string | null
  school: string | null
  class_name: string | null
  created_at: string
}

/** Fields shared by a session and the series it was generated from. */
export interface SessionFields {
  child_id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  teacher: string | null
  contact_phone: string | null
  escort: string | null
  note: string | null
  /** Minutes before start to notify; one of REMIND_OPTIONS */
  remind_minutes: number
  /** Also email every member of the household */
  remind_email: boolean
}

export interface Session extends SessionFields {
  id: string
  household_id: string
  series_id: string | null
  date: string
  status: SessionStatus
  off_reason: string | null
}

export interface Series extends SessionFields {
  id: string
  household_id: string
  weekdays: number[]
  start_date: string
  /** null: repeats with no end */
  end_date: string | null
}

export interface DayNote {
  id: string
  household_id: string
  child_id: string | null
  date: string
  content: string
}

export interface SeriesResult {
  series_id: string
  created: number
  skipped: string[]
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Chủ nhà',
  editor: 'Được sửa',
  viewer: 'Chỉ xem',
}
