import { NavLink, useLocation } from 'react-router'
import { useAppNavigate } from '../state/pageTransition'
import { Icon, type IconName } from './Icon'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Lịch', icon: 'list' },
  { to: '/thang', label: 'Tháng', icon: 'calendar' },
  { to: '/gia-dinh', label: 'Gia đình', icon: 'users' },
]

export function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useAppNavigate()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            onClick={(e) => {
              e.preventDefault()
              if (pathname !== tab.to) navigate(tab.to, { direction: 'tab' })
            }}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'
              }`
            }
          >
            <Icon name={tab.icon} className="size-6" />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Thêm buổi học"
      className="fixed right-4 bottom-[calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom))+5rem)] z-30 flex size-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 active:scale-95 sm:right-[calc(50%-14rem+1rem)]"
    >
      <Icon name="plus" className="size-7" />
    </button>
  )
}
