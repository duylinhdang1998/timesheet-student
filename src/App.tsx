import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { BottomNav } from './components/BottomNav'
import { ErrorBox, Loading } from './components/States'
import { useMembership } from './data/queries'
import { supabaseConfigured } from './lib/supabase'
import { AgendaPage } from './pages/AgendaPage'
import { ChildPage } from './pages/ChildPage'
import { FamilyPage } from './pages/FamilyPage'
import { LoginPage } from './pages/LoginPage'
import { MonthPage } from './pages/MonthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { EditSessionPage, NewSessionPage } from './pages/SessionPage'
import { useAuth } from './state/auth'
import { useAndroidBackButton } from './state/backButton'
import { ChildFilterProvider } from './state/childFilter'
import { HouseholdProvider } from './state/household'
import { usePageTransitionCommit } from './state/pageTransition'
import { useReminderSync } from './state/reminders'

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <ErrorBox error="Chưa cấu hình Supabase: cần VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local" />
      </div>
    )
  }
  return (
    <BrowserRouter>
      <Gate />
    </BrowserRouter>
  )
}

/** Signed out → login; signed in without a household → onboarding; otherwise the app. */
function Gate() {
  const { session, loading } = useAuth()
  useAndroidBackButton()
  usePageTransitionCommit()
  const membership = useMembership(session?.user.id)

  if (loading) return <Loading />
  if (!session) return <LoginPage />
  if (membership.isPending) return <Loading />
  if (membership.error && !membership.data) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-6">
        <ErrorBox error={membership.error} />
        <button className="btn-secondary w-full" onClick={() => membership.refetch()}>
          Thử lại
        </button>
      </div>
    )
  }
  if (!membership.data) return <OnboardingPage />

  return (
    <HouseholdProvider membership={membership.data}>
      <ChildFilterProvider>
        <ReminderSync />
        <Routes>
          <Route element={<TabsLayout />}>
            <Route index element={<AgendaPage />} />
            <Route path="thang" element={<MonthPage />} />
            <Route path="gia-dinh" element={<FamilyPage />} />
          </Route>
          <Route path="buoi/moi" element={<NewSessionPage />} />
          <Route path="buoi/:id" element={<EditSessionPage />} />
          <Route path="con/moi" element={<ChildPage />} />
          <Route path="con/:id" element={<ChildPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChildFilterProvider>
    </HouseholdProvider>
  )
}

function ReminderSync() {
  useReminderSync()
  return null
}

function TabsLayout() {
  return (
    <div className="pb-24">
      <Outlet />
      <BottomNav />
    </div>
  )
}
