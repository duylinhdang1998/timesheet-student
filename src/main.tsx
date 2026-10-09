import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import { captureInviteCodeFromUrl } from './lib/invite'
import { supabase } from './lib/supabase'
import { AuthProvider } from './state/auth'
import { ToastProvider } from './state/toast'
import './index.css'

const WEEK = 1000 * 60 * 60 * 24 * 7

// Cached query results are persisted to localStorage so the schedule stays readable offline.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: WEEK,
      staleTime: 1000 * 60,
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
})
const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'lich-hoc-cache' })

// Another account must never see the previous account's cached schedule
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    queryClient.clear()
    persister.removeClient()
  }
})

captureInviteCodeFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: WEEK, buster: 'v1' }}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
