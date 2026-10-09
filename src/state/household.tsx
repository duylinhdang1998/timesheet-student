import { createContext, useContext, type ReactNode } from 'react'
import type { Membership } from '../lib/types'
import { useOnline } from './online'

interface HouseholdState {
  householdId: string
  householdName: string
  role: Membership['role']
  displayName: string
  isOwner: boolean
  /** Role allows editing and the device is online. */
  canEdit: boolean
}

const HouseholdContext = createContext<HouseholdState | null>(null)

export function HouseholdProvider({ membership, children }: { membership: Membership; children: ReactNode }) {
  const online = useOnline()
  const value: HouseholdState = {
    householdId: membership.household_id,
    householdName: membership.households.name,
    role: membership.role,
    displayName: membership.display_name,
    isOwner: membership.role === 'owner',
    canEdit: membership.role !== 'viewer' && online,
  }
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold(): HouseholdState {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider')
  return ctx
}
