import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useGoBack } from '../state/goBack'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { useChildren } from '../data/queries'
import { useChildFilter } from '../state/childFilter'
import { useOnline } from '../state/online'
import { ChildAvatar } from './ChildAvatar'

export function TopBar({ title, back, children }: { title: string; back?: boolean; children?: ReactNode }) {
  const goBack = useGoBack()
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0
  const online = useOnline()

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4">
        {back && (
          <button className="-ml-2 rounded-full p-2" onClick={() => goBack()} aria-label="Quay lại">
            <Icon name="back" className="size-6" />
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {!back && (
          <button
            className="rounded-full p-2 text-sky-600 disabled:text-slate-400 dark:text-sky-400"
            onClick={() => queryClient.invalidateQueries()}
            disabled={!online}
            aria-label="Làm mới"
          >
            <Icon name="refresh" className={`size-5 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {!online && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Đang offline: chỉ xem được lịch đã tải, chưa sửa được.
        </div>
      )}
      {children}
    </header>
  )
}

export function ChildFilterBar() {
  const { data: children = [] } = useChildren()
  const [selected, setSelected] = useChildFilter()
  if (children.length < 2) return null
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
      active
        ? 'border-sky-500 bg-sky-50 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300'
        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
    }`
  return (
    <div className="mx-auto flex max-w-md gap-2 overflow-x-auto px-4 pb-2.5">
      <button className={chip(selected === null)} onClick={() => setSelected(null)}>
        Tất cả
      </button>
      {children.map((c) => (
        <button key={c.id} className={chip(selected === c.id)} onClick={() => setSelected(c.id)}>
          <ChildAvatar child={c} size="size-5 text-[10px]" />
          {c.name}
        </button>
      ))}
    </div>
  )
}
