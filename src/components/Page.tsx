import type { ReactNode } from 'react'
import {
  IonBackButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonRippleEffect,
  IonToolbar,
} from '@ionic/react'
import { add, chevronForward } from 'ionicons/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useChildren } from '../data/queries'
import { useChildFilter } from '../state/childFilter'
import { useOnline } from '../state/online'
import { tint } from './ChildAvatar'

function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
      Đang offline: chỉ xem được lịch đã tải, chưa sửa được.
    </div>
  )
}

/** Tab page header: small line above a large title, actions on the right, extra rows (segment, chips) below. */
export function LargeHeader({
  title,
  eyebrow,
  end,
  children,
}: {
  title: string
  eyebrow?: string
  end?: ReactNode
  children?: ReactNode
}) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <div className="mx-auto flex w-full max-w-md items-end gap-3 px-4 pt-1 pb-2">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="text-muted text-[13px]">{eyebrow}</p>}
            <h1 className="truncate text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
          </div>
          {end && <div className="-mr-2 flex shrink-0 items-center gap-1 pb-1">{end}</div>}
        </div>
      </IonToolbar>
      {/* outside the toolbar: a segment inside one makes Ionic shrink the toolbar content to fit */}
      {children && (
        <div className="bg-(--app-page-bg)">
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pb-3">{children}</div>
        </div>
      )}
      <OfflineBanner />
    </IonHeader>
  )
}

/** Detail page header: "‹ Title" back button on the left, actions on the right. */
export function PageHeader({ title, backTo, end }: { title: string; backTo: string; end?: ReactNode }) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref={backTo} text={title} />
        </IonButtons>
        {end && <IonButtons slot="end">{end}</IonButtons>}
      </IonToolbar>
      <OfflineBanner />
    </IonHeader>
  )
}

/** Pull down to reload everything from the server. Place first inside IonContent. */
export function PullToRefresh() {
  const queryClient = useQueryClient()
  return (
    <IonRefresher
      slot="fixed"
      onIonRefresh={async (e) => {
        await queryClient.invalidateQueries()
        e.detail.complete()
      }}
    >
      <IonRefresherContent />
    </IonRefresher>
  )
}

/** "Tất cả" plus one chip per child, tinted with the child's colour; hidden with fewer than two children. */
export function ChildFilterBar() {
  const { data: children = [] } = useChildren()
  const [selected, setSelected] = useChildFilter()
  if (children.length < 2) return null
  const fill = children.length <= 3
  const base = `h-9 shrink-0 rounded-xl px-4 text-[14px] font-medium text-center transition-colors ${fill ? 'flex-1' : ''}`
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
      <button
        className={`${base} ${selected === null ? 'bg-(--ion-color-primary) text-white' : 'bg-(--app-track) text-muted'}`}
        onClick={() => setSelected(null)}
      >
        Tất cả
      </button>
      {children.map((c) => {
        const active = selected === c.id
        return (
          <button
            key={c.id}
            className={base}
            style={
              active
                ? { backgroundColor: c.color, color: '#fff' }
                : { backgroundColor: tint(c.color, 16), color: c.color }
            }
            onClick={() => setSelected(c.id)}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

/** Section title with an optional note on the right ("Lịch hôm nay · 2 buổi học"). */
export function SectionTitle({ title, note, end }: { title: ReactNode; note?: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <h2 className="flex-1 text-lg font-semibold">{title}</h2>
      {note && <span className="text-muted text-[13px]">{note}</span>}
      {end}
    </div>
  )
}

/** Tappable white row: icon, label, value, chevron. Used inside a `card` with dividers. */
export function InfoRow({
  icon,
  label,
  value,
  onClick,
  end,
}: {
  icon?: string
  label: ReactNode
  value?: ReactNode
  onClick?: () => void
  end?: ReactNode
}) {
  const body = (
    <>
      {icon && <IonIcon icon={icon} className="text-muted shrink-0 text-[22px]" />}
      <span className="flex-1 text-[15px]">{label}</span>
      {value !== undefined && <span className="text-muted min-w-0 truncate text-right text-[14px]">{value}</span>}
      {end}
      {onClick && <IonIcon icon={chevronForward} className="text-muted shrink-0 text-lg opacity-70" />}
    </>
  )
  const cls = 'relative flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} ion-activatable overflow-hidden`}>
      <IonRippleEffect />
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Card whose children are separated by hairlines. */
export function RowsCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card divide-y divide-(--app-border) overflow-hidden ${className}`}>{children}</div>
}

/** Credit line at the bottom of the Gia đình tab and the login screen. */
export function PoweredBy() {
  return (
    <p className="text-muted text-center text-xs tracking-wide opacity-80">
      Powered by <span className="font-bold text-(--ion-color-primary)">VFM</span>
    </p>
  )
}

/** Full-width "+ Thêm lịch" button pinned above the tab bar. Put inside IonContent. */
export function AddScheduleButton({ onClick }: { onClick: () => void }) {
  return (
    <div slot="fixed" className="pointer-events-none bottom-0 left-0 right-0 px-4 pb-3">
      <button
        type="button"
        onClick={onClick}
        className="ion-activatable pointer-events-auto relative mx-auto flex h-13 w-full max-w-md items-center justify-center gap-2 overflow-hidden rounded-2xl bg-(--ion-color-primary) text-[16px] font-semibold text-white shadow-lg shadow-black/10"
      >
        <IonRippleEffect />
        <IonIcon icon={add} className="text-2xl" />
        Thêm lịch
      </button>
    </div>
  )
}
