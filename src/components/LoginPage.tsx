import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import Footer from './Footer';

// Definimos la "puerta de entrada" para recibir la función onBack
interface LoginPageProps {
  onBack: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(event, session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: '#1a1a1a', 
      color: 'white',
      position: 'relative'
    }}>
      
      {/* Botón Volver */}
      <button 
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'transparent',
          border: '1px solid #333',
          color: '#888',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Volver
      </button>

      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Acceso a MiTiendaVirtual
        </h2>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={['google']}
          redirectTo={window.location.origin} 
          localization={{
            variables: {
              sign_in: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                button_label: 'Iniciar Sesión',
              },
              sign_up: {
                link_text: '¿No tienes cuenta? Regístrate',
                button_label: 'Crear Cuenta',
              }
            }
          }}
        />
      </div>
     {/* FOOTER DINÁMICO */}
     <div className="w-full">
        <Footer onNavigate={() => {}} variant="login" />
      </div>
    </div>
  )
}