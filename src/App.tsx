import { useEffect, useRef } from 'react'
import {
  IonApp,
  IonButton,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  useIonRouter,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Navigate, Route } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { calendarOutline, peopleOutline, todayOutline } from 'ionicons/icons'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorBox, Loading } from './components/States'
import { useMembership } from './data/queries'
import { isNative } from './lib/native'
import { supabaseConfigured } from './lib/supabase'
import { AgendaPage } from './pages/AgendaPage'
import { ChildPage } from './pages/ChildPage'
import { FamilyPage } from './pages/FamilyPage'
import { LoginPage } from './pages/LoginPage'
import { MonthPage } from './pages/MonthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SessionPage } from './pages/SessionPage'
import { useAuth } from './state/auth'
import { ChildFilterProvider } from './state/childFilter'
import { HouseholdProvider } from './state/household'
import { useReminderSync } from './state/reminders'

export default function App() {
  return (
    <IonApp>
      {supabaseConfigured ? (
        <ErrorBoundary>
          <Gate />
        </ErrorBoundary>
      ) : (
        <Plain>
          <ErrorBox error="Chưa cấu hình Supabase: cần VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local" />
        </Plain>
      )}
    </IonApp>
  )
}

/** Full-screen page outside the router (loading, errors). */
function Plain({ children }: { children: React.ReactNode }) {
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="mx-auto max-w-sm space-y-3 pt-16">{children}</div>
      </IonContent>
    </IonPage>
  )
}

/** Signed out → login; signed in without a household → onboarding; otherwise the app. */
function Gate() {
  const { session, loading } = useAuth()
  const membership = useMembership(session?.user.id)

  if (loading)
    return (
      <Plain>
        <Loading />
      </Plain>
    )
  if (!session) return <LoginPage />
  if (membership.isPending)
    return (
      <Plain>
        <Loading />
      </Plain>
    )
  if (membership.error && !membership.data) {
    return (
      <Plain>
        <ErrorBox error={membership.error} />
        <IonButton expand="block" fill="outline" onClick={() => membership.refetch()}>
          Thử lại
        </IonButton>
      </Plain>
    )
  }
  if (!membership.data) return <OnboardingPage />

  return (
    <HouseholdProvider membership={membership.data}>
      <ChildFilterProvider>
        <IonReactRouter>
          <AppEffects />
          <IonRouterOutlet>
            <Route path="/tabs/*" element={<Tabs />} />
            <Route path="/buoi/:id" element={<SessionPage />} />
            <Route path="/con/moi" element={<ChildPage />} />
            <Route path="/con/:id" element={<ChildPage />} />
            <Route path="*" element={<Navigate to="/tabs/lich" replace />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </ChildFilterProvider>
    </HouseholdProvider>
  )
}

function Tabs() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="lich" element={<AgendaPage />} />
        <Route path="thang" element={<MonthPage />} />
        <Route path="gia-dinh" element={<FamilyPage />} />
        <Route index element={<Navigate to="lich" replace />} />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="lich" href="/tabs/lich">
          <IonIcon icon={todayOutline} />
          <IonLabel>Lịch</IonLabel>
        </IonTabButton>
        <IonTabButton tab="thang" href="/tabs/thang">
          <IonIcon icon={calendarOutline} />
          <IonLabel>Tháng</IonLabel>
        </IonTabButton>
        <IonTabButton tab="gia-dinh" href="/tabs/gia-dinh">
          <IonIcon icon={peopleOutline} />
          <IonLabel>Gia đình</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}

function AppEffects() {
  useReminderSync()
  useExitOnRootBack()
  return null
}

/**
 * Android back button: Ionic closes open overlays and goes back in the stack by itself;
 * on a root page (nothing to go back to) it leaves the app instead of doing nothing.
 */
function useExitOnRootBack() {
  const router = useIonRouter()
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  })
  useEffect(() => {
    if (!isNative) return
    // Capacitor only forwards the button to the web layer (Ionic's "backbutton") while someone listens
    const listener = CapApp.addListener('backButton', () => {})
    const onBack = (ev: Event) =>
      (ev as CustomEvent<{ register: (priority: number, handler: () => void) => void }>).detail.register(-1, () => {
        if (!routerRef.current.canGoBack()) CapApp.exitApp()
      })
    document.addEventListener('ionBackButton', onBack)
    return () => {
      document.removeEventListener('ionBackButton', onBack)
      listener.then((l) => l.remove())
    }
  }, [])
}
