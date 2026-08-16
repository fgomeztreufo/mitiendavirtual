import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { effectivePlan, getBusinessType, BUSINESS_TYPES } from '../utils/planUtils'
import { getLabels } from '../utils/businessLabels'
import { FaInstagram, FaTelegram, FaWhatsapp, FaGoogle } from 'react-icons/fa'
import { FaMeta } from 'react-icons/fa6'

import { PrivacyPolicy, TermsOfService, DataDeletion, SupportPage } from './LegalPages'
import FloatingWhatsAppButton from './FloatingWhatsAppButton'
import OnboardingWizard from './onboarding/OnboardingWizard'

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
const BranchesView = lazy(() => import('./BranchesView'))
const ReferralsView = lazy(() => import('./ReferralsView'))
const InstagramScannerView = lazy(() => import('./InstagramScannerView'))

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

  const planCode = effectivePlan(profile)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const shouldOnboard = useMemo(() => {
    if (!profile) return false
    if (localStorage.getItem('onboarding_completed_' + session.user.id)) return false
    if (profile.onboarding_completed_at) return false
    return !instance?.provider_id
      || !profile.business_type
      || profile.business_type === 'ecommerce'
  }, [profile, instance, session.user.id])

  useEffect(() => {
    if (shouldOnboard) setShowOnboarding(true)
  }, [shouldOnboard])

  // Manejo de alertas por URL (Pagos o Conexiones)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inOnboarding = !!sessionStorage.getItem('onboarding_step')
    if (params.get('connected') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
      getData();
      if (!inOnboarding) {
        Swal.fire({ title: '¡Conexión Exitosa!', icon: 'success', confirmButtonColor: '#10B981', timer: 3000 });
        setActiveTab('instagram');
      }
    }
    if (params.get('ig_error') === 'already_used') {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (!inOnboarding) {
        Swal.fire({
          icon: 'error',
          title: 'Instagram ya vinculado',
          text: 'Esta cuenta de Instagram ya está conectada a otra tienda en Mi Tienda Virtual.',
          confirmButtonColor: '#D4AF37'
        });
        setActiveTab('instagram');
      }
    }
    if (params.get('ig_error') === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (!inOnboarding) {
        Swal.fire({
          icon: 'error',
          title: 'Instagram ya no vinculado',
          text: 'Esta cuenta de Instagram no se pudo vincular a Mi Tienda Virtual. Por favor, intenta nuevamente, con otra cuenta.',
          confirmButtonColor: '#D4AF37'
        });
        setActiveTab('instagram');
      }
    }
    if (params.get('payment') === 'success') {
        Swal.fire({ title: '¡Pago Recibido!', icon: 'success', confirmButtonColor: '#10B981' });
        window.history.replaceState({}, document.title, window.location.pathname);
        getData(); setActiveTab('plans');
    }
  }, []);

  useEffect(() => { getData() }, [])


  const pickBusinessType = async () => {
    const current = profile?.business_type || 'ecommerce'
    const icons: Record<string, string> = {
      ecommerce: '🛍️', inmobiliaria: '🏠', clinica: '🏥', servicios: '✂️', restaurant: '🍽️',
    }
    const cardsHtml = Object.entries(BUSINESS_TYPES)
      .map(([k, v]) => `<button type="button" data-btype="${k}" class="btype-card" style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 16px;margin:6px 0;border-radius:12px;border:1px solid ${k === current ? 'rgba(99,102,241,0.5)' : '#e5e7eb'};background:${k === current ? 'rgba(99,102,241,0.08)' : '#f9fafb'};color:#374151;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;text-align:left"><span style="font-size:20px">${icons[k] || '📦'}</span><span>${v}</span></button>`)
      .join('')
    const { isConfirmed, value } = await Swal.fire({
      title: '¿Qué tipo de negocio tienes?',
      html: `<p style="color:#9ca3af;font-size:13px;margin-bottom:16px">Esto personaliza tu catálogo y la experiencia de la plataforma.</p><div id="btype-grid">${cardsHtml}</div><input type="hidden" id="swal-btype" value="${current}">`,
      confirmButtonText: 'Confirmar',
      allowOutsideClick: false,
      didOpen: () => {
        document.querySelectorAll('.btype-card').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.btype-card').forEach(b => {
              (b as HTMLElement).style.borderColor = '#e5e7eb';
              (b as HTMLElement).style.background = '#f9fafb';
            });
            (btn as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)';
            (btn as HTMLElement).style.background = 'rgba(99,102,241,0.08)';
            (document.getElementById('swal-btype') as HTMLInputElement).value = (btn as HTMLElement).dataset.btype || 'ecommerce';
          })
        })
      },
      preConfirm: () => (document.getElementById('swal-btype') as HTMLInputElement)?.value || 'ecommerce',
    })
    if (isConfirmed && value) {
      await supabase.from('profiles').update({ business_type: value }).eq('id', session.user.id)
      setProfile((prev: any) => prev ? { ...prev, business_type: value } : prev)
    }
  }

  useEffect(() => {
    if (!profile || shouldOnboard) return
    const key = 'btype_chosen_' + session.user.id
    if (localStorage.getItem(key)) return
    if (profile.business_type && profile.business_type !== 'ecommerce') {
      localStorage.setItem(key, '1')
      return
    }
    localStorage.setItem(key, '1')
    pickBusinessType()
  }, [profile, shouldOnboard])

  const businessType = getBusinessType(profile)
  const bLabels = getLabels(businessType)

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

      })
    }
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans">
      {/* MOBILE TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]">M</div>
          <span className="font-bold text-sm">MiTienda<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Virtual</span></span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-14 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 p-4 space-y-1 max-h-[70vh] overflow-y-auto shadow-xl">
            <MobileNavBtn label="Panel de Agentes" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} />
            <p className="text-xs font-bold text-gray-400 uppercase px-2 mb-2 tracking-widest">Canales</p>
            <MobileNavBtn label="Ventas Capturadas" active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Telegram" active={activeTab === 'telegram'} onClick={() => { setActiveTab('telegram'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Leads Telegram" active={activeTab === 'telegram-leads'} onClick={() => { setActiveTab('telegram-leads'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="WhatsApp" active={activeTab === 'whatsapp'} onClick={() => { setActiveTab('whatsapp'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Leads WhatsApp" active={activeTab === 'wpp-leads'} onClick={() => { setActiveTab('wpp-leads'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Google Calendar" active={activeTab === 'scheduling'} onClick={() => { setActiveTab('scheduling'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Sucursales" active={activeTab === 'branches'} onClick={() => { setActiveTab('branches'); setMobileMenuOpen(false); }} />
            <p className="text-xs font-bold text-gray-400 uppercase px-2 mt-4 mb-2 tracking-widest">Configuración</p>
            <MobileNavBtn label="Notificaciones" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu Instagram" active={activeTab === 'instagram'} onClick={() => { setActiveTab('instagram'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu Telegram" active={activeTab === 'telegram'} onClick={() => { setActiveTab('telegram'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu WhatsApp" active={activeTab === 'whatsapp'} onClick={() => { setActiveTab('whatsapp'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Cargar FAQs" active={activeTab === 'faqs'} onClick={() => { setActiveTab('faqs'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Cerebro IA" active={activeTab === 'knowlower'} onClick={() => { setActiveTab('knowlower'); setMobileMenuOpen(false); }} />
            {bLabels.showCatalog && <MobileNavBtn label={bLabels.catalog} active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setMobileMenuOpen(false); }} />}
            {bLabels.showCatalog && <MobileNavBtn label={bLabels.inventory} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} />}
            <MobileNavBtn label={bLabels.services} active={activeTab === 'services'} onClick={() => { setActiveTab('services'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Planes" active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Referidos" active={activeTab === 'referrals'} onClick={() => { setActiveTab('referrals'); setMobileMenuOpen(false); }} />
            <div className="pt-3 border-t border-gray-100 mt-3">
              <button onClick={() => supabase.auth.signOut({ scope: 'local' })} className="w-full text-left text-red-500 p-3 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors text-sm">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-white/80 backdrop-blur-md border-r border-gray-100 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-purple-50 to-transparent relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 pointer-events-none" />
             <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-200/30 blur-2xl pointer-events-none" />
             <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.4)] ring-2 ring-indigo-200">M</div>
                <span className="font-bold text-lg">MiTienda<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Virtual</span></span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarBtn
            label="Panel de Agentes"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
            active={activeTab === 'home'}
            onClick={() => { setActiveTab('home'); setLegalView(null) }}
          />

          <p className="text-xs font-bold text-gray-400 uppercase px-2 mt-6 mb-2 tracking-widest">Canales</p>

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
            <div className="ml-4 border-l border-gray-100 pl-4 space-y-1">
              <SidebarSubBtn
                label="Ventas Capturadas"
                active={activeTab === 'leads'}
                onClick={() => setActiveTab('leads')}
              />
            </div>
          )}

          {/* Telegram */}
          <SidebarBtn
            label="Telegram"
            icon={<FaTelegram className="text-sky-500" />}
            active={activeTab === 'telegram-leads'}
            onClick={() => setTelegramMenuOpen(!telegramMenuOpen)}
            isParent
            isOpen={telegramMenuOpen}
          />
          {telegramMenuOpen && (
            <div className="ml-4 border-l border-gray-100 pl-4 space-y-1">
              <SidebarSubBtn
                label="Leads"
                active={activeTab === 'telegram-leads'}
                onClick={() => setActiveTab('telegram-leads')}
              />
            </div>
          )}

          {/* WhatsApp */}
          <SidebarBtn
            label="WhatsApp"
            icon={<FaWhatsapp className="text-green-500" />}
            active={activeTab === 'wpp-messages' || activeTab === 'wpp-leads'}
            onClick={() => setWhatsappMenuOpen(!whatsappMenuOpen)}
            isParent
            isOpen={whatsappMenuOpen}
          />
          {whatsappMenuOpen && (
            <div className="ml-4 border-l border-gray-100 pl-4 space-y-1">
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

          {/* Sucursales */}
          <SidebarBtn
            label="Sucursales"
            icon={<svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            active={activeTab === 'branches'}
            onClick={() => { setActiveTab('branches'); setLegalView(null) }}
          />

          <p className="text-xs font-bold text-gray-400 uppercase px-2 mt-6 mb-2 tracking-widest">Configuración</p>

          {/* Entrenamiento IA */}
          <div className="mb-2 mx-1 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 overflow-hidden">
            <button
              onClick={() => setKnowledgeOpen(!knowledgeOpen)}
              className={`w-full flex items-center gap-2.5 p-3 text-sm transition-all duration-200 ${
                activeTab === 'faqs' || activeTab === 'knowlower' || activeTab === 'catalog' || activeTab === 'inventory' || activeTab === 'ig-scanner'
                  ? 'text-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs shadow-[0_2px_8px_rgba(139,92,246,0.3)]">🧠</span>
              <span className="font-bold text-xs uppercase tracking-wider">Entrenamiento IA</span>
              <svg className={`w-4 h-4 ml-auto transition-transform duration-200 ${knowledgeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {knowledgeOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-purple-100">
                <button onClick={() => setActiveTab('faqs')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'faqs' ? 'text-purple-600 bg-purple-100' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                  FAQs / Base Conocimiento
                </button>
                <button onClick={() => setActiveTab('knowlower')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'knowlower' ? 'text-purple-600 bg-purple-100' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                  Cerebro IA
                </button>
                {bLabels.showCatalog && (
                  <button onClick={() => setActiveTab('catalog')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'catalog' ? 'text-purple-600 bg-purple-100' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                    {bLabels.catalog}
                  </button>
                )}
                {bLabels.showCatalog && (
                  <button onClick={() => setActiveTab('inventory')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg ${activeTab === 'inventory' ? 'text-purple-600 bg-purple-100' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                    {bLabels.inventory}
                  </button>
                )}
                {!['clinica', 'servicios'].includes(profile?.business_type || '') && (
                <button onClick={() => setActiveTab('ig-scanner')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'ig-scanner' ? 'text-pink-600 bg-pink-50' : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50'}`}>
                  <FaInstagram className="text-pink-500 text-sm" /> Cargar desde Instagram
                </button>
                )}
              </div>
            )}
          </div>

          {/* Configura Agentes */}
          <div className="mb-2 mx-1 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200 overflow-hidden">
            <button
              onClick={() => setConfigAgentsOpen(!configAgentsOpen)}
              className={`w-full flex items-center gap-2.5 p-3 text-sm transition-all duration-200 ${
                activeTab === 'instagram' || activeTab === 'telegram' || activeTab === 'whatsapp' || activeTab === 'scheduling'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs shadow-[0_2px_8px_rgba(99,102,241,0.3)]">⚙️</span>
              <span className="font-bold text-xs uppercase tracking-wider">Configura Agentes</span>
              <svg className={`w-4 h-4 ml-auto transition-transform duration-200 ${configAgentsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {configAgentsOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-indigo-100">
                <button onClick={() => setActiveTab('instagram')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'instagram' ? 'text-pink-600 bg-pink-50' : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50'}`}>
                  <FaInstagram className="text-pink-500 text-sm" /> Instagram
                </button>
                <button onClick={() => setActiveTab('telegram')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'telegram' ? 'text-sky-600 bg-sky-50' : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'}`}>
                  <FaTelegram className="text-sm text-sky-500" /> Telegram
                </button>
                <button onClick={() => setActiveTab('whatsapp')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'whatsapp' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                  <FaWhatsapp className="text-sm text-green-500" /> WhatsApp
                </button>
                <button onClick={() => setActiveTab('scheduling')} className={`w-full text-left py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors rounded-lg flex items-center gap-2 ${activeTab === 'scheduling' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}>
                  <FaGoogle className="text-sm text-blue-500" /> Google Calendar
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

          <SidebarBtn
            label="Referidos"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            active={activeTab === 'referrals'}
            onClick={() => setActiveTab('referrals')}
          />

        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
            <button onClick={pickBusinessType} className="w-full text-left text-gray-500 p-2.5 hover:bg-gray-50 rounded-xl flex items-center gap-2 transition-all text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <span>{BUSINESS_TYPES[businessType] || 'Tipo de negocio'}</span>
            </button>
            <button onClick={() => supabase.auth.signOut({ scope: 'local' })} className="w-full text-left text-red-500 p-2.5 hover:bg-red-50 rounded-xl flex items-center gap-2 transition-all text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-gray-50 pt-14 md:pt-0 relative">
        {/* Subtle glow in content area */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-indigo-500/[0.05] to-transparent blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 w-full flex-grow relative z-10">
          {/* Banner plan expirado o créditos agotados */}
          {planCode === 'expired' && (
            <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600">Tu plan ha expirado</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(profile?.bonus_credits ?? 0) > 0
                    ? `Te quedan ${(profile.bonus_credits).toLocaleString('es-CL')} créditos de recarga. Renueva tu plan para seguir operando.`
                    : 'No tienes créditos disponibles. Contrata un plan o compra una bolsa de recarga.'}
                </p>
              </div>
              <button onClick={() => setActiveTab('plans')} className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all whitespace-nowrap">
                Ver planes
              </button>
            </div>
          )}
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
                setActiveTab={setActiveTab}
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
                businessType={businessType}
              />
            )}
            {activeTab === 'inventory' && <ProductsListView session={session} onUpdate={getData} businessType={businessType} />}
            {activeTab === 'ig-scanner' && (
              <InstagramScannerView
                session={session}
                profile={profile}
                instance={instance}
                onProductsImported={getData}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'services' && (
              <ServicesView
                session={session}
                profile={profile}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
                businessType={businessType}
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
            {activeTab === 'branches' && (
              <BranchesView
                session={session}
                profile={profile}
                goToPlans={() => setActiveTab('plans')}
              />
            )}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}
            {activeTab === 'referrals' && <ReferralsView session={session} />}
          </Suspense>
        </div>

        {/* Footer compacto */}
        <div className="border-t border-gray-100 bg-[#F8FAFC] px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              MiTiendaVirtual
            </span>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
              <button onClick={() => setLegalView('terms')} className="hover:text-gray-900 transition-colors">Términos</button>
              <button onClick={() => setLegalView('privacy')} className="hover:text-gray-900 transition-colors">Privacidad</button>
              <button onClick={() => setLegalView('data-deletion')} className="hover:text-red-500 transition-colors">Eliminar datos</button>
              <button onClick={() => setLegalView('support')} className="hover:text-indigo-600 transition-colors">Ayuda</button>
            </div>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">© 2026 • Santiago, CL</p>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-[10px] text-gray-500">
              <FaMeta className="text-blue-600 text-sm" /> Meta Partner
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

      {showOnboarding && (
        <OnboardingWizard
          session={session}
          profile={profile}
          instance={instance}
          onComplete={() => {
            localStorage.setItem('onboarding_completed_' + session.user.id, '1')
            setShowOnboarding(false)
            getData()
          }}
          onRefreshData={getData}
        />
      )}
    </div>
  )
}

// Auxiliares del Sidebar
const SidebarBtn = ({ label, icon, active, onClick, isParent, isOpen }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 p-3 rounded-xl text-sm transition-all duration-200 ${
      active
        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-[0_2px_8px_rgba(99,102,241,0.08)]'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    {icon && <span className="text-base shrink-0">{icon}</span>}
    <span className="font-medium">{label}</span>
    {isParent && (
      <span className="ml-auto">
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
      </span>
    )}
  </button>
)

const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left py-2 text-xs font-medium uppercase tracking-wider transition-colors ${active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
)

const MobileNavBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
    active ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
  }`}>
    <span>{label}</span>
  </button>
)
