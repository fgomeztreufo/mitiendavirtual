import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { FaMeta } from 'react-icons/fa6'
import { TermsOfService, PrivacyPolicy, DataDeletion } from './LegalPages'

interface LoginPageProps {
  onBack: () => void;
  initialView?: 'sign_in' | 'update_password';
  onPasswordUpdated?: () => void;
}

export default function LoginPage({ onBack, initialView, onPasswordUpdated }: LoginPageProps) {
  const [legalView, setLegalView] = useState<string | null>(null)

  useEffect(() => {
    if (initialView !== 'update_password' || !onPasswordUpdated) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') onPasswordUpdated()
    })
    return () => subscription.unsubscribe()
  }, [initialView, onPasswordUpdated])

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 flex flex-col relative overflow-x-hidden font-sans">

      {/* ═══ Glow orb — same as Index ═══ */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-br from-indigo-500/[0.07] via-purple-500/[0.04] to-transparent blur-[100px] pointer-events-none z-0" />

      {/* ═══ Top bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 active:scale-95 text-sm transition-all py-2 pr-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50">
          <FaMeta className="text-blue-600 text-sm" />
          <span className="text-[10px] text-gray-600 font-medium tracking-wide hidden sm:inline">Technology Partner</span>
        </div>
      </motion.div>

      {/* ═══ Main content ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16 relative z-10">

        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-[0_8px_24px_rgba(99,102,241,0.3)]">
            <span className="text-2xl font-black text-white">M</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600">MiTienda</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Virtual</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Accede a tu panel de automatización IA</p>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
        >
          <Auth
            supabaseClient={supabase}
            view={initialView || 'sign_in'}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#6366f1',
                    brandAccent: '#4f46e5',
                    inputBackground: '#f9fafb',
                    inputBorder: '#e5e7eb',
                    inputBorderFocus: '#6366f1',
                    inputText: '#111827',
                    inputPlaceholder: '#9ca3af',
                    messageText: '#6b7280',
                    anchorTextColor: '#6366f1',
                    anchorTextHoverColor: '#4f46e5',
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
            theme="default"
            providers={['google']}
            redirectTo={globalThis.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  button_label: 'Iniciar sesión',
                  email_input_placeholder: 'tu@correo.cl',
                  password_input_placeholder: '••••••••',
                  link_text: '¿Ya tienes cuenta? Inicia sesión',
                  social_provider_text: 'Iniciar sesión con',
                  loading_button_label: 'Cargando...',
                  forgot_password_text: '¿Olvidaste tu contraseña?',
                  email_input: 'Correo electrónico',
                  password_input: 'Contraseña',
                },
                sign_up: {
                  email_label: 'Correo electrónico',
                  password_label: 'Contraseña',
                  button_label: 'Crear cuenta',
                  email_input_placeholder: 'tu@correo.cl',
                  password_input_placeholder: 'Mínimo 6 caracteres',
                  link_text: '¿No tienes cuenta? Regístrate',
                  loading_button_label: 'Cargando...',
                  social_provider_text: 'Registrarse con',
                  email_input: 'Correo electrónico',
                  password_input: 'Contraseña',
                  confirmation_text: 'Revisa tu correo para el enlace de confirmación',
                },
                forgotten_password: {
                  email_label: 'Correo electrónico',
                  button_label: 'Enviar enlace',
                  loading_button_label: 'Enviando...',
                  confirmation_text: 'Revisa tu correo para el enlace de recuperación',
                  email_input_placeholder: 'tu@correo.cl',
                  link_text: '¿Olvidaste tu contraseña?',
                  email_input: 'Correo electrónico',
                },
                magic_link: {
                  email_input_label: 'Correo electrónico',
                  email_input_placeholder: 'tu@correo.cl',
                  button_label: 'Enviar enlace mágico',
                  link_text: 'Iniciar sesión con enlace mágico',
                  loading_button_label: 'Enviando...',
                  confirmation_text: 'Revisa tu correo para el enlace de acceso',
                  email_input: 'Correo electrónico',
                },
                update_password: {
                  password_label: 'Nueva contraseña',
                  button_label: 'Actualizar contraseña',
                  loading_button_label: 'Actualizando...',
                  confirmation_text: 'Tu contraseña ha sido actualizada',
                  password_input_placeholder: 'Nueva contraseña',
                  password_input: 'Nueva contraseña',
                },
                email_verification: {
                  confirmation_text: 'Revisa tu correo para el enlace de confirmación',
                },
                errors: {
                  email_required: 'El correo es obligatorio',
                  password_required: 'La contraseña es obligatoria',
                  email_invalid: 'Correo inválido',
                  password_too_short: 'La contraseña es muy corta',
                  unknown: 'Ocurrió un error. Intenta nuevamente.',
                },
                messages: {
                  confirmation_email_sent: 'Revisa tu correo para el enlace de confirmación',
                  password_reset_email_sent: 'Revisa tu correo para el enlace de recuperación',
                  email_verified: '¡Correo verificado exitosamente!',
                  password_updated: 'Contraseña actualizada correctamente',
                },
                social_provider: {
                  google: 'Google',
                },
                default: {
                  email_input: 'Correo electrónico',
                  password_input: 'Contraseña',
                }
              }
            }}
          />
        </motion.div>

        {/* Security note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-6 text-[11px] text-gray-400 text-center flex items-center gap-1.5"
        >
          <svg className="w-3 h-3 text-green-500/70" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Tus datos están protegidos conforme a la Ley 19.628 (Chile)
        </motion.p>
      </div>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-gray-100 bg-[#F8FAFC] px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <button onClick={() => setLegalView('terms')} className="hover:text-gray-900 transition-colors">
              Términos
            </button>
            <button onClick={() => setLegalView('privacy')} className="hover:text-gray-900 transition-colors">
              Privacidad
            </button>
            <button onClick={() => setLegalView('data-deletion')} className="hover:text-red-500 transition-colors">
              Eliminar datos
            </button>
            <button onClick={() => setLegalView('support')} className="hover:text-indigo-600 transition-colors">
              Ayuda
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
            © 2026 MiTiendaVirtual • Santiago, CL
          </p>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-[10px] text-gray-500">
            <FaMeta className="text-blue-600 text-sm" /> Meta Partner
          </div>
        </div>
      </footer>

      {/* Legal modals */}
      {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
      {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
    </div>
  )
}
