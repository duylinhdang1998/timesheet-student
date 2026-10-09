import { Component, type ReactNode } from 'react'

/** Last line of defence: a render error shows its message and a reload button instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="flex h-full flex-col justify-center gap-4 overflow-auto p-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <h1 className="text-[17px] font-semibold">Ứng dụng gặp lỗi</h1>
        <p className="text-[13px] text-muted">Hãy chụp màn hình này gửi cho người hỗ trợ, rồi bấm tải lại.</p>
        <pre className="max-h-[50vh] overflow-auto rounded-xl bg-rose-50 p-3 text-xs whitespace-pre-wrap text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button
          className="rounded-xl bg-(--ion-color-primary) py-3 text-center font-medium text-white"
          onClick={() => location.replace('/')}
        >
          Tải lại
        </button>
      </div>
    )
  }
}
