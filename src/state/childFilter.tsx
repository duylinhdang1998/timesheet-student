import { createContext, useContext, useState, type ReactNode } from 'react'

/** Selected child id, or null for "Tất cả". Remembered per device. */
type ChildFilter = [string | null, (id: string | null) => void]

const KEY = 'child-filter'
const ChildFilterContext = createContext<ChildFilter>([null, () => {}])

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function ChildFilterProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(readStored)
  const set = (id: string | null) => {
    setSelected(id)
    try {
      if (id) localStorage.setItem(KEY, id)
      else localStorage.removeItem(KEY)
    } catch {
      // storage unavailable (private mode): filter just won't be remembered
    }
  }
  return <ChildFilterContext.Provider value={[selected, set]}>{children}</ChildFilterContext.Provider>
}

export function useChildFilter() {
  return useContext(ChildFilterContext)
}
