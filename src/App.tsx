import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom' // <--- IMPORTANTE
import { supabase } from './supabaseClient'
import { Session } from '@supabase/supabase-js'

// --- TUS COMPONENTES ---
import IndexLanding from './components/Index'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import PaymentResult from './components/PaymentResult' // <--- TU NUEVA PÁGINA

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate() // Hook para movernos programáticamente

  useEffect(() => {
    // 1. Verificamos sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escuchamos cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>
  }

  return (
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
          // Si ya hay sesión, no lo dejamos entrar al login, lo mandamos al dashboard
          session ? <Navigate to="/dashboard" /> : <LoginPage onBack={() => navigate('/')} />
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
        element={<PaymentResult />} 
      />

      {/* RUTA COMODÍN: Si escriben cualquier cosa rara, volver al inicio */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  )
}

export default App