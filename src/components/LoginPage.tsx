import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { TermsOfService, PrivacyPolicy, DataDeletion } from './LegalPages';

// Definimos la "puerta de entrada" para recibir la función onBack
interface LoginPageProps {
  onBack: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  // --- ESTADO LOCAL PARA LEGALES ---
  const [legalView, setLegalView] = useState<string | null>(null);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(event, session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col relative overflow-x-hidden">

      {/* Fondo degradado sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a3e_0%,_#080810_60%)] pointer-events-none" />

      {/* Barra superior con botón Volver */}
      <div className="relative z-50 flex items-center px-4 py-4 border-b border-white/5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white active:text-white text-sm transition-colors py-2 pr-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
      </div>

      {/* Contenido central */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">

        {/* Logo + Marca */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
            <span className="text-2xl font-black text-white">M</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            MiTienda<span className="text-blue-500">Virtual</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Accede a tu panel de control</p>
        </div>

        {/* Card del formulario */}
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                    inputBackground: 'transparent',
                    inputBorder: 'rgba(255,255,255,0.1)',
                    inputBorderFocus: '#2563eb',
                    inputText: 'white',
                    inputPlaceholder: '#6b7280',
                    messageText: '#9ca3af',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    buttonBorderRadius: '12px',
                    inputBorderRadius: '12px',
                  },
                  fontSizes: {
                    baseInputSize: '14px',
                  },
                }
              }
            }}
            theme="dark"
            providers={['google']}
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  button_label: 'Iniciar Sesión',
                  email_input_placeholder: 'tu@correo.cl',
                  password_input_placeholder: '••••••••',
                },
                sign_up: {
                  link_text: '¿No tienes cuenta? Regístrate',
                  button_label: 'Crear Cuenta',
                  email_input_placeholder: 'tu@correo.cl',
                  password_input_placeholder: 'Mínimo 6 caracteres',
                },
                forgotten_password: {
                  link_text: '¿Olvidaste tu contraseña?',
                  button_label: 'Enviar enlace',
                }
              }
            }}
          />
        </div>

        {/* Nota de seguridad */}
        <p className="mt-6 text-[11px] text-gray-500 text-center">
          Tus datos están protegidos conforme a la Ley 19.628 (Chile)
        </p>
      </div>

      {/* Footer compacto */}
      <div className="relative z-10 border-t border-white/10 bg-[#05050e] px-6 py-6 text-center">
        <p className="text-xs text-gray-400 font-bold mb-3">MiTienda<span className="text-blue-500">Virtual</span></p>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <button onClick={() => setLegalView('terms')} className="hover:text-white transition-colors">
            Términos de Servicio
          </button>
          <span className="text-gray-700">•</span>
          <button onClick={() => setLegalView('privacy')} className="hover:text-white transition-colors">
            Privacidad
          </button>
          <span className="text-gray-700">•</span>
          <button onClick={() => setLegalView('data-deletion')} className="hover:text-red-400 text-red-500/60 transition-colors">
            Eliminación de Datos
          </button>
          <span className="text-gray-700">•</span>
          <button onClick={() => setLegalView('support')} className="hover:text-blue-300 text-blue-400/70 transition-colors">
            Centro de Ayuda
          </button>
        </div>
        <p className="text-[10px] text-gray-700 mt-4 font-mono tracking-widest uppercase">© 2026 MiTiendaVirtual • Santiago, CL</p>
      </div>

      {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
      {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
    </div>
  )
}