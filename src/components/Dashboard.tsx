import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { normalizePlanType, isInTrial, trialDaysLeft, effectivePlan } from '../utils/planUtils'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle } from 'react-icons/fa'
import { FaMeta } from 'react-icons/fa6'

import { PrivacyPolicy, TermsOfService, DataDeletion, SupportPage } from './LegalPages'
import FloatingWhatsAppButton from './FloatingWhatsAppButton'

const InstagramView = lazy(() => import('./InstagramView'))
const CatalogView = lazy(() => import('./CatalogView'))
const ProductsListView = lazy(() => import('./ProductsListView'))
const PlansView = lazy(() => import('./PlansView'))
const WhatsAppView = lazy(() => import('./WhatsAppView'))
const FaqsView = lazy(() => import('./FaqsView'))
const KnowlowerView = lazy(() => import('./KnowlowerView'))
const LeadsView = lazy(() => import('./Leads'))
const TelegramLeadsView = lazy(() => import('./TelegramLeadsView'))
const NotificationsView = lazy(() => import('./NotificationsView'))
const TelegramView = lazy(() => import('./TelegramView'))
const AgentsDashboard = lazy(() => import('./AgentsDashboard'))
const SchedulingView = lazy(() => import('./SchedulingView'))
const ServicesView = lazy(() => import('./ServicesView'))
const WhatsAppMessagesView = lazy(() => import('./WhatsAppMessagesView'))
const WhatsAppLeadsView = lazy(() => import('./WhatsAppLeadsView'))
const ContabilidadView = lazy(() => import('./ContabilidadView'))

const LazyFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<any>(null)
  const [instance, setInstance] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [instagramMenuOpen, setInstagramMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [telegramMenuOpen, setTelegramMenuOpen] = useState(false)
  const [whatsappMenuOpen, setWhatsappMenuOpen] = useState(false)
  const [legalView, setLegalView] = useState<string | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [configAgentsOpen, setConfigAgentsOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Plan access helpers (evaluated after profile loads)
  const planCode = effectivePlan(profile)
  const hasTelegram = ['basic', 'pro', 'full'].includes(planCode)
  const hasWhatsApp = ['pro', 'full'].includes(planCode)
  const hasScheduling = planCode === 'full'
  const isAdmin = profile?.is_admin === true

  // Manejo de alertas por URL (Pagos o Conexiones)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      Swal.fire({ title: '¡Conexión Exitosa!', icon: 'success', confirmButtonColor: '#10B981', timer: 3000 });
      window.history.replaceState({}, document.title, window.location.pathname);
      getData(); setActiveTab('instagram'); 
    }
    if (params.get('ig_error') === 'already_used') {
      Swal.fire({
        icon: 'error',
        title: 'Instagram ya vinculado',
        text: 'Esta cuenta de Instagram ya está conectada a otra tienda en Mi Tienda Virtual.',
        confirmButtonColor: '#D4AF37'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setActiveTab('instagram');
    }
      if (params.get('ig_error') === 'cancelled') {
      Swal.fire({
        icon: 'error',
        title: 'Instagram ya no vinculado',
        text: 'Esta cuenta de Instagram no se pudo vincular a Mi Tienda Virtual. Por favor, intenta nuevamente, con otra cuenta.',
        confirmButtonColor: '#D4AF37'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setActiveTab('instagram');
    }
    if (params.get('payment') === 'success') {
        Swal.fire({ title: '¡Pago Recibido!', icon: 'success', confirmButtonColor: '#10B981' });
        window.history.replaceState({}, document.title, window.location.pathname);
        getData(); setActiveTab('plans'); 
    }
  }, []);

  useEffect(() => { getData() }, [])

  async function getData() {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (profileData) setProfile(profileData)

      const { data: instanceData } = await supabase
        .from('instances')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (instanceData) setInstance(instanceData)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudieron cargar tus datos. Intenta recargar la página.',
        confirmButtonColor: '#6366f1',
      })
    }
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* MOBILE TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-[0_4px_12px_rgba(99,102,241,0.3)]">M</div>
          <span className="font-bold text-sm">MiTienda<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Virtual</span></span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-1 max-h-[70vh] overflow-y-auto">
            <MobileNavBtn label="Panel de Agentes" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} />
            <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">Canales</p>
            <MobileNavBtn label="Ventas Capturadas" active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Telegram" active={activeTab === 'telegram'} locked={!hasTelegram} lockLabel="Básico+" onClick={() => { if (hasTelegram) { setActiveTab('telegram'); setMobileMenuOpen(false); } else { setActiveTab('plans'); setMobileMenuOpen(false); } }} />
            {hasTelegram && <MobileNavBtn label="Leads Telegram" active={activeTab === 'telegram-leads'} onClick={() => { setActiveTab('telegram-leads'); setMobileMenuOpen(false); }} />}
            <MobileNavBtn label="WhatsApp" active={activeTab === 'whatsapp'} locked={!hasWhatsApp} lockLabel="Pro+" onClick={() => { if (hasWhatsApp) { setActiveTab('whatsapp'); setMobileMenuOpen(false); } else { setActiveTab('plans'); setMobileMenuOpen(false); } }} />
            {hasWhatsApp && <MobileNavBtn label="Leads WhatsApp" active={activeTab === 'wpp-leads'} onClick={() => { setActiveTab('wpp-leads'); setMobileMenuOpen(false); }} />}
            <MobileNavBtn label="Agendamiento" active={activeTab === 'scheduling'} locked={!hasScheduling} lockLabel="Full" onClick={() => { if (hasScheduling) { setActiveTab('scheduling'); setMobileMenuOpen(false); } else { setActiveTab('plans'); setMobileMenuOpen(false); } }} />
            <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-4 mb-2 tracking-widest">Configuración</p>
            <MobileNavBtn label="Notificaciones" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu Instagram" active={activeTab === 'instagram'} onClick={() => { setActiveTab('instagram'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu Telegram" active={activeTab === 'telegram'} locked={!hasTelegram} lockLabel="Básico+" onClick={() => { if (hasTelegram) { setActiveTab('telegram'); setMobileMenuOpen(false); } else { setActiveTab('plans'); setMobileMenuOpen(false); } }} />
            <MobileNavBtn label="Configura tu WhatsApp" active={activeTab === 'whatsapp'} locked={!hasWhatsApp} lockLabel="Pro+" onClick={() => { if (hasWhatsApp) { setActiveTab('whatsapp'); setMobileMenuOpen(false); } else { setActiveTab('plans'); setMobileMenuOpen(false); } }} />
            <MobileNavBtn label="Cargar FAQs" active={activeTab === 'faqs'} onClick={() => { setActiveTab('faqs'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Cerebro IA" active={activeTab === 'knowlower'} onClick={() => { setActiveTab('knowlower'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Servicios" active={activeTab === 'services'} onClick={() => { setActiveTab('services'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Planes" active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setMobileMenuOpen(false); }} />
            {isAdmin && <MobileNavBtn label="Contabilidad" active={activeTab === 'contabilidad'} onClick={() => { setActiveTab('contabilidad'); setMobileMenuOpen(false); }} />}
            <div className="pt-3 border-t border-white/5 mt-3">
              <button onClick={() => supabase.auth.signOut()} className="w-full text-left text-red-500 p-3 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition-colors text-sm">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0a0f]/80 backdrop-blur-md border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-transparent relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/5 pointer-events-none" />
             <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
             <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] ring-2 ring-indigo-400/20">M</div>
                <span className="font-bold text-lg">MiTienda<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">Virtual</span></span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarBtn
            label="Panel de Agentes"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
            active={activeTab === 'home'}
            onClick={() => { setActiveTab('home'); setLegalView(null) }}
          />

          <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Canales</p>

          {/* Instagram — siempre disponible */}
          <SidebarBtn
            label="Instagram"
            icon={<FaInstagram className="text-pink-500" />}
            active={activeTab === 'leads'}
            onClick={() => setInstagramMenuOpen(!instagramMenuOpen)}
            isParent={true}
            isOpen={instagramMenuOpen}
          />
          {instagramMenuOpen && (
            <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
              <SidebarSubBtn
                label="Ventas Capturadas"
                active={activeTab === 'leads'}
                onClick={() => setActiveTab('leads')}
              />
            </div>
          )}

          {/* Telegram — desde plan Básico */}
          <SidebarBtn
            label="Telegram"
            icon={<FaTelegram className="text-sky-400" />}
            active={activeTab === 'telegram-leads'}
            onClick={() => hasTelegram ? setTelegramMenuOpen(!telegramMenuOpen) : setActiveTab('plans')}
            isParent={hasTelegram}
            isOpen={telegramMenuOpen}
            locked={!hasTelegram}
            lockLabel="Básico+"
          />
          {hasTelegram && telegramMenuOpen && (
            <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
              <SidebarSubBtn
                label="Leads"
                active={activeTab === 'telegram-leads'}
                onClick={() => setActiveTab('telegram-leads')}
              />
            </div>
          )}

          {/* WhatsApp — desde plan Pro */}
          <SidebarBtn
            label="WhatsApp"
            icon={<FaWhatsapp className="text-green-400" />}
            active={activeTab === 'wpp-messages' || activeTab === 'wpp-leads'}
            onClick={() => hasWhatsApp ? setWhatsappMenuOpen(!whatsappMenuOpen) : setActiveTab('plans')}
            isParent={hasWhatsApp}
            isOpen={whatsappMenuOpen}
            locked={!hasWhatsApp}
            lockLabel="Pro+"
          />
          {hasWhatsApp && whatsappMenuOpen && (
            <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
              <SidebarSubBtn
                label="Leads"
                active={activeTab === 'wpp-leads'}
                onClick={() => { setActiveTab('wpp-leads'); setLegalView(null) }}
              />
              <SidebarSubBtn
                label="Bandeja"
                active={activeTab === 'wpp-messages'}
                onClick={() => { setActiveTab('wpp-messages'); setLegalView(null) }}
              />
            </div>
          )}

          {/* Google Calendar — solo plan Full */}
          <SidebarBtn
            label="Google Calendar"
            icon={<FaGoogle className="text-blue-400" />}
            active={activeTab === 'scheduling'}
            onClick={() => hasScheduling ? (setActiveTab('scheduling'), setLegalView(null)) : setActiveTab('plans')}
            locked={!hasScheduling}
            lockLabel="Full"
          />

          {profile && isInTrial(profile) && (
            <div className="mx-1 mt-4 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Trial {profile.trial_plan?.toUpperCase()}</p>
              <p className="text-[10px] text-amber-300/70">{trialDaysLeft(profile)} días restantes</p>
            </div>
          )}

          <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Configuración</p>

          {/* Entrenamiento IA */}
          <div className="mb-2 mx-1 rounded-xl bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 overflow-hidden">
            <button
              onClick={() => setKnowledgeOpen(!knowledgeOpen)}
              className={`w-full flex items-center gap-2.5 p-3 text-sm transition-all duration-200 ${
                activeTab === 'faqs' || activeTab === 'knowlower' || activeTab === 'catalog' || activeTab === 'inventory' || activeTab === 'services'
                  ? 'text-purple-300'
                  : 'text-gray-300 hover:text-purple-300'
              }`}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs shadow-[0_2px_8px_rgba(139,92,246,0.3)]">🧠</span>
              <span className="font-bold text-xs uppercase tracking-wider">Entrenamiento IA</span>
              <svg className={`w-4 h-4 ml-auto transition-transform duration-200 ${knowledgeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {knowledgeOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-purple-500/10">
                <button onClick={() => setActiveTab('faqs')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'faqs' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-500 hover:text-purple-300 hover:bg-purple-500/5'}`}>
                  FAQs / Base Conocimiento
                </button>
                <button onClick={() => setActiveTab('knowlower')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'knowlower' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-500 hover:text-purple-300 hover:bg-purple-500/5'}`}>
                  Cerebro IA
                </button>
                <button onClick={() => setActiveTab('catalog')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'catalog' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-500 hover:text-purple-300 hover:bg-purple-500/5'}`}>
                  Subir Producto
                </button>
                <button onClick={() => setActiveTab('inventory')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'inventory' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-500 hover:text-purple-300 hover:bg-purple-500/5'}`}>
                  Inventario
                </button>
                <button onClick={() => setActiveTab('services')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'services' ? 'text-purple-300 bg-purple-500/10' : 'text-gray-500 hover:text-purple-300 hover:bg-purple-500/5'}`}>
                  Servicios
                </button>
              </div>
            )}
          </div>

          {/* Configura Agentes */}
          <div className="mb-2 mx-1 rounded-xl bg-gradient-to-r from-indigo-600/10 to-sky-600/10 border border-indigo-500/20 overflow-hidden">
            <button
              onClick={() => setConfigAgentsOpen(!configAgentsOpen)}
              className={`w-full flex items-center gap-2.5 p-3 text-sm transition-all duration-200 ${
                activeTab === 'instagram' || activeTab === 'telegram' || activeTab === 'whatsapp'
                  ? 'text-indigo-300'
                  : 'text-gray-300 hover:text-indigo-300'
              }`}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs shadow-[0_2px_8px_rgba(99,102,241,0.3)]">⚙️</span>
              <span className="font-bold text-xs uppercase tracking-wider">Configura Agentes</span>
              <svg className={`w-4 h-4 ml-auto transition-transform duration-200 ${configAgentsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {configAgentsOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-indigo-500/10">
                <button onClick={() => setActiveTab('instagram')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'instagram' ? 'text-pink-400 bg-pink-500/10' : 'text-gray-500 hover:text-pink-400 hover:bg-pink-500/5'}`}>
                  <FaInstagram className="text-pink-500 text-sm" /> Instagram
                </button>
                <button onClick={() => hasTelegram ? setActiveTab('telegram') : setActiveTab('plans')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${!hasTelegram ? 'text-gray-600' : activeTab === 'telegram' ? 'text-sky-400 bg-sky-500/10' : 'text-gray-500 hover:text-sky-400 hover:bg-sky-500/5'}`}>
                  <FaTelegram className={`text-sm ${hasTelegram ? 'text-sky-400' : 'opacity-30'}`} /> Telegram
                  {!hasTelegram && <span className="ml-auto text-[9px] text-gray-600 font-bold">Básico+</span>}
                </button>
                <button onClick={() => hasWhatsApp ? setActiveTab('whatsapp') : setActiveTab('plans')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${!hasWhatsApp ? 'text-gray-600' : activeTab === 'whatsapp' ? 'text-green-400 bg-green-500/10' : 'text-gray-500 hover:text-green-400 hover:bg-green-500/5'}`}>
                  <FaWhatsapp className={`text-sm ${hasWhatsApp ? 'text-green-400' : 'opacity-30'}`} /> WhatsApp
                  {!hasWhatsApp && <span className="ml-auto text-[9px] text-gray-600 font-bold">Pro+</span>}
                </button>
              </div>
            )}
          </div>

          <SidebarBtn
            label="Notificaciones"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            active={activeTab === 'notifications'}
            onClick={() => { setActiveTab('notifications'); setLegalView(null) }}
          />

          <SidebarBtn
            label="Planes"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            active={activeTab === 'plans'}
            onClick={() => setActiveTab('plans')}
          />

          {isAdmin && (
            <SidebarBtn
              label="Contabilidad"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              active={activeTab === 'contabilidad'}
              onClick={() => setActiveTab('contabilidad')}
            />
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
            <button onClick={() => supabase.auth.signOut()} className="w-full text-left text-red-400/80 p-2.5 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition-all text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#050505] pt-14 md:pt-0 relative">
        {/* Subtle glow in content area */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-indigo-600/5 to-transparent blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 w-full flex-grow relative z-10">
          <Suspense fallback={<LazyFallback />}>
            {activeTab === 'home' && (
              <AgentsDashboard
                session={session}
                profile={profile}
                instance={instance}
                onNavigate={(tab: string) => setActiveTab(tab)}
              />
            )}
            {activeTab === 'instagram' && (
              <InstagramView
                session={session}
                profile={profile}
                instance={instance}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'whatsapp' && (
              <WhatsAppView
                session={session}
                profile={profile}
                instance={instance}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'telegram' && (
              <TelegramView
                session={session}
                profile={profile}
                instance={instance}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'wpp-leads' && <WhatsAppLeadsView userId={session.user.id} />}
            {activeTab === 'wpp-messages' && (
              <WhatsAppMessagesView session={session} />
            )}
            {activeTab === 'telegram-leads' && <TelegramLeadsView userId={session.user.id} />}
            
            {/* VISTA DE FAQs RE-INCORPORADA */}
            {activeTab === 'faqs' && <FaqsView session={session} />}
            {activeTab === 'leads' && <LeadsView userId={session.user.id}/>}
            {activeTab === 'knowlower' && <KnowlowerView userId={session.user.id} />}
            {/* RENDER DE LA NUEVA VISTA */}
            {activeTab === 'notifications' && <NotificationsView session={session} profile={profile} />}
            {activeTab === 'catalog' && (
              <CatalogView 
                session={session} 
                profile={profile} 
                onProductAdded={getData} 
                goToPlans={() => setActiveTab('plans')} 
              />
            )}
            {activeTab === 'inventory' && <ProductsListView session={session} onUpdate={getData} />}
            {activeTab === 'services' && (
              <ServicesView
                session={session}
                profile={profile}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'scheduling' && (
              <SchedulingView
                session={session}
                profile={profile}
                instance={instance}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}
            {activeTab === 'contabilidad' && isAdmin && <ContabilidadView session={session} />}
          </Suspense>
        </div>
        
        {/* Footer compacto */}
        <div className="border-t border-white/5 bg-black/40 backdrop-blur-sm px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              MiTiendaVirtual
            </span>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
              <button onClick={() => setLegalView('terms')} className="hover:text-white transition-colors">Términos</button>
              <button onClick={() => setLegalView('privacy')} className="hover:text-white transition-colors">Privacidad</button>
              <button onClick={() => setLegalView('data-deletion')} className="hover:text-red-400 transition-colors">Eliminar datos</button>
              <button onClick={() => setLegalView('support')} className="hover:text-blue-300 transition-colors">Ayuda</button>
            </div>
            <p className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">© 2026 • Santiago, CL</p>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] text-gray-400">
              <FaMeta className="text-blue-400 text-sm" /> Meta Partner
            </div>
          </div>
        </div>

          {/* Botón flotante WhatsApp: visible para todos los planes */}
          <FloatingWhatsAppButton visible={!!profile} />

        {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
        {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
        {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
        {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
      </main>
    </div>
  )
}

// Auxiliares del Sidebar
const SidebarBtn = ({ label, icon, active, onClick, isParent, isOpen, locked, lockLabel }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 p-3 rounded-xl text-sm transition-all duration-200 ${
      locked
        ? 'text-gray-600 hover:bg-white/[0.02] cursor-pointer'
        : active
        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_2px_8px_rgba(99,102,241,0.08)]'
        : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
    }`}
  >
    {icon && <span className="text-base shrink-0">{icon}</span>}
    <span className="font-medium">{label}</span>
    {locked ? (
      <span className="ml-auto flex items-center gap-1">
        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        {lockLabel && <span className="text-[9px] text-gray-600 font-bold tracking-wide">{lockLabel}</span>}
      </span>
    ) : isParent ? (
      <span className="ml-auto">
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
      </span>
    ) : null}
  </button>
)

const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left py-2 text-xs font-medium uppercase tracking-wider transition-colors ${active ? 'text-indigo-300' : 'text-gray-500 hover:text-gray-300'}`}>{label}</button>
)

const MobileNavBtn = ({ label, active, onClick, locked, lockLabel }: any) => (
  <button onClick={onClick} className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
    locked ? 'text-gray-600' : active ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
  }`}>
    <span>{label}</span>
    {locked && (
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        {lockLabel && <span className="text-[9px] font-bold tracking-wide">{lockLabel}</span>}
      </span>
    )}
  </button>
)