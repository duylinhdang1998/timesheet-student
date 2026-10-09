import type { Child } from '../lib/types'

export const CHILD_COLORS = ['#0ea5e9', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function ChildAvatar({ child, size = 'size-8' }: { child: Pick<Child, 'name' | 'color' | 'avatar'>; size?: string }) {
  if (child.avatar) {
    return (
      <img
        src={child.avatar}
        alt={child.name}
        className={`${size} shrink-0 rounded-full object-cover ring-2`}
        style={{ '--tw-ring-color': child.color } as React.CSSProperties}
      />
    )
  }
  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: child.color }}
    >
      {child.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
