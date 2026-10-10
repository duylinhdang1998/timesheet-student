import type { Child } from '../lib/types'

export const CHILD_COLORS = ['#e8705f', '#3aa387', '#4a8fd9', '#e5a33b', '#8c6bd1', '#d9628f', '#2a9da8', '#e8873a']

/** A child's colour faded to `pct`% over whatever is behind it (works in light and dark mode). */
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

export function ChildAvatar({
  child,
  size = 'size-8',
}: {
  child: Pick<Child, 'name' | 'color' | 'avatar'>
  size?: string
}) {
  if (child.avatar) {
    return <img src={child.avatar} alt={child.name} className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-full font-bold`}
      style={{ backgroundColor: tint(child.color, 22), color: child.color }}
    >
      {child.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** "An · Lớp 3B" */
export function childLine(child: Pick<Child, 'name' | 'class_name'>) {
  return [child.name, child.class_name && `Lớp ${child.class_name.replace(/^lớp\s*/i, '')}`].filter(Boolean).join(' · ')
}
