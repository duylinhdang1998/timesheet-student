import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tone = 'info' | 'error'
interface Toast {
  message: string
  tone: Tone
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(undefined)

  const show = useCallback((message: string, tone: Tone = 'info') => {
    window.clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 6000 : 4000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            role="status"
            onClick={() => setToast(null)}
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
              toast.tone === 'error' ? 'bg-rose-600' : 'bg-slate-800'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
