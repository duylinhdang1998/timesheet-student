import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useCloseOnBack } from '../state/backButton'
import { prefersReducedMotion } from '../state/pageTransition'

// Dragging the handle down further than this (px), or flicking faster (px/ms), dismisses the sheet
const DISMISS_DISTANCE = 100
const DISMISS_VELOCITY = 0.5

/**
 * Bottom sheet on phones, centered dialog on wider screens. Slides in, and slides out before `onClose` runs.
 * Pass children as a function to get that animated `close` for buttons inside the sheet.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const [closing, setClosing] = useState(false)
  function close() {
    if (prefersReducedMotion()) onClose()
    else setClosing(true)
  }
  const latestClose = useRef(close)
  useEffect(() => {
    latestClose.current = close
  })

  useCloseOnBack(close)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && latestClose.current()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // swipe the handle/title down to dismiss, like a native sheet
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; y: number; t: number; velocity: number } | null>(null)
  function onDragStart(e: PointerEvent) {
    if (closing) return
    drag.current = { startY: e.clientY, y: e.clientY, t: e.timeStamp, velocity: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    panel.current!.style.transition = 'none'
  }
  function onDragMove(e: PointerEvent) {
    const d = drag.current
    if (!d) return
    d.velocity = (e.clientY - d.y) / Math.max(1, e.timeStamp - d.t)
    d.y = e.clientY
    d.t = e.timeStamp
    panel.current!.style.transform = `translateY(${Math.max(0, d.y - d.startY)}px)`
  }
  function onDragEnd() {
    const d = drag.current
    drag.current = null
    if (!d) return
    const distance = d.y - d.startY
    if (distance > DISMISS_DISTANCE || (distance > 10 && d.velocity > DISMISS_VELOCITY)) return close()
    panel.current!.style.transition = 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)'
    panel.current!.style.transform = ''
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center sm:items-center ${closing ? 'pointer-events-none' : ''}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-slate-900/50 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={close}
      />
      <div
        ref={panel}
        className={`pb-safe relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-5 shadow-xl sm:rounded-3xl sm:pt-5 dark:bg-slate-900 ${
          closing ? 'animate-sheet-out sm:animate-dialog-out' : 'animate-sheet-in sm:animate-dialog-in'
        }`}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="-mx-5 cursor-grab touch-none px-5 pt-3 sm:cursor-auto sm:touch-auto sm:pt-0"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        </div>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  )
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="mb-5 text-slate-600 dark:text-slate-300">{message}</div>
          <div className="flex flex-col gap-2">
            <button className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>
              {busy ? 'Đang xử lý…' : confirmLabel}
            </button>
            <button className="btn-secondary" onClick={close}>
              Huỷ
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
