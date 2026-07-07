import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { PrivacyPolicy, TermsOfService, DataDeletion } from './components/LegalPages'
import { supabase } from './supabaseClient'
import { Session } from '@supabase/supabase-js'
import ErrorBoundary from './components/ErrorBoundary'

import IndexLanding from './components/Index'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import PaymentResult from './components/PaymentResult'

const KnowlowerView = lazy(() => import('./components/KnowlowerView'))

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        navigate('/login?view=update_password')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>
  }

  return (
    <ErrorBoundary>
    <Routes>
      
      {/* RUTA 1: LANDING PAGE (Inicio) */}
      <Route 
        path="/" 
        element={
          // Si ya hay sesión, lo mandamos directo al dashboard, si no, mostramos la Landing
          session ? <Navigate to="/dashboard" /> : <IndexLanding onLoginClick={() => navigate('/login')} />
        } 
      />

      {/* RUTA 2: LOGIN */}
      <Route
        path="/login"
        element={
          passwordRecovery
            ? <LoginPage onBack={() => navigate('/')} initialView="update_password" onPasswordUpdated={() => { setPasswordRecovery(false); navigate('/dashboard') }} />
            : session ? <Navigate to="/dashboard" /> : <LoginPage onBack={() => navigate('/')} />
        }
      />

      {/* RUTA 3: DASHBOARD (Protegida) */}
      <Route 
        path="/dashboard" 
        element={
          // Si NO hay sesión, lo mandamos al login. Si SI hay, mostramos Dashboard.
          session ? <Dashboard session={session} /> : <Navigate to="/login" />
        } 
      />

      {/* RUTA 4: RESULTADO DE PAGO (Pública) */}
      {/* Esta es la URL que llamará Mercado Pago */}
      <Route
        path="/payment-result"
        element={<PaymentResult session={session} />}
      />
      
      <Route
  path="/privacy"
  element={<PrivacyPolicy onClose={() => navigate('/')} />}
/>
<Route
  path="/terms"
  element={<TermsOfService onClose={() => navigate('/')} />}
/>
<Route
  path="/data-deletion"
  element={<DataDeletion onClose={() => navigate('/')} />}
/>
<Route
        path="/knowlower"
        element={<Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>}><KnowlowerView onClose={() => navigate('/')} userId={session?.user?.id || ''} /></Suspense>}
      />

      {/* RUTA COMODÍN (Debe ser la última) */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
    </ErrorBoundary>
  )
}

export default App