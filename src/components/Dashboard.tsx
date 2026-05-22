import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { normalizePlanType } from '../utils/planUtils'

// --- VISTAS DE APP ---
import InstagramView from './InstagramView'
import CatalogView from './CatalogView'
import ProductsListView from './ProductsListView'
import PlansView from './PlansView'
import WhatsAppView from './WhatsAppView.tsx' 
import FaqsView from './FaqsView' // <--- RE-INCORPORADO

// --- VISTAS LEGALES ---
import { PrivacyPolicy, TermsOfService, DataDeletion, SupportPage } from './LegalPages'
import KnowlowerView from './KnowlowerView.tsx'
import LeadsView from './Leads.tsx'
import TelegramLeadsView from './TelegramLeadsView'
import FloatingWhatsAppButton from './FloatingWhatsAppButton'
import NotificationsView from './NotificationsView.tsx'
import TelegramView from './TelegramView'
import AgentsDashboard from './AgentsDashboard'

export default function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<any>(null)
  const [instance, setInstance] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [instagramMenuOpen, setInstagramMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [telegramMenuOpen, setTelegramMenuOpen] = useState(false)
  const [legalView, setLegalView] = useState<string | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Plan access helpers (evaluated after profile loads)
  const planCode = normalizePlanType(profile?.plan_type)
  const hasTelegram = ['basic', 'pro', 'full'].includes(planCode)
  const hasWhatsApp = false // próximamente para todos

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
    // 1. Obtener Perfil (Límites, Plan, Nombre) - Mantenemos .single() como pediste
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (profileData) setProfile(profileData)

    // 2. Obtener Instancia (Conexión Instagram, Prompt) - Mantenemos .single()
    const { data: instanceData } = await supabase
      .from('instances')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (instanceData) setInstance(instanceData)
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
            <MobileNavBtn label="WhatsApp" active={activeTab === 'whatsapp'} locked={!hasWhatsApp} lockLabel="Próx." onClick={() => { setActiveTab('plans'); setMobileMenuOpen(false); }} />
            <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-4 mb-2 tracking-widest">Configuración</p>
            <MobileNavBtn label="Notificaciones" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Configura tu Instagram" active={activeTab === 'instagram'} onClick={() => { setActiveTab('instagram'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Cargar FAQs" active={activeTab === 'faqs'} onClick={() => { setActiveTab('faqs'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Cerebro IA" active={activeTab === 'knowlower'} onClick={() => { setActiveTab('knowlower'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => { setActiveTab('catalog'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }} />
            <MobileNavBtn label="Planes / Saldo" active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setMobileMenuOpen(false); }} />
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
        <div className="p-6 border-b border-white/5">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center font-bold shadow-[0_4px_12px_rgba(99,102,241,0.3)]">M</div>
                <span className="font-bold text-lg">MiTienda<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Virtual</span></span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarBtn
            label="Panel de Agentes"
            active={activeTab === 'home'}
            onClick={() => { setActiveTab('home'); setLegalView(null) }}
          />

          <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Canales</p>
          
         {/* Instagram — siempre disponible */}
        <SidebarBtn 
          label="Instagram" 
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
            active={activeTab === 'telegram' || activeTab === 'telegram-leads'} 
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

          {/* WhatsApp — próximamente */}
          <SidebarBtn 
            label="WhatsApp"
            active={activeTab === 'whatsapp'} 
            onClick={() => hasWhatsApp ? (setActiveTab('whatsapp'), setLegalView(null)) : setActiveTab('plans')} 
            locked={!hasWhatsApp}
            lockLabel="Próx."
          />

          <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Configuración</p>
        <SidebarBtn
          label="Notificaciones"
          active={activeTab === 'notifications'}
          onClick={() => { setActiveTab('notifications'); setLegalView(null) }}
          />
        <SidebarBtn 
          label="Configura tu Instagram" 
          active={activeTab === 'instagram'} 
          onClick={() => setActiveTab('instagram')} 
        />
        <SidebarBtn 
          label="Configura tu Telegram"
          active={activeTab === 'telegram'} 
          onClick={() => hasTelegram ? (setActiveTab('telegram'), setLegalView(null)) : setActiveTab('plans')}
          locked={!hasTelegram}
          lockLabel="Básico+"
        />
        <SidebarBtn 
          label="Configura tu WhatsApp"
          active={activeTab === 'whatsapp'} 
          onClick={() => hasWhatsApp ? (setActiveTab('whatsapp'), setLegalView(null)) : setActiveTab('plans')}
          locked={!hasWhatsApp}
          lockLabel="Próx."
        />
         {/* Botón Conocimiento con submenú */}
        <SidebarBtn 
          label="Faqs / Base Conocimiento" 
          active={activeTab === 'faqs' || activeTab === 'knowlower'} 
          onClick={() => setKnowledgeOpen(!knowledgeOpen)} 
          isParent={true} 
          isOpen={knowledgeOpen} 
        />
        {knowledgeOpen && (
          <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
            <SidebarSubBtn 
                label="Cargar" 
                active={activeTab === 'faqs'} 
                onClick={() => setActiveTab('faqs')} 
              />
            <SidebarSubBtn 
              label="Cerebro IA" 
              active={activeTab === 'knowlower'} 
              onClick={() => setActiveTab('knowlower')} 
            />
          </div>
        )}

          <SidebarBtn 
            label="Catálogo" 
            active={activeTab === 'catalog' || activeTab === 'inventory'} 
            onClick={() => setCatalogOpen(!catalogOpen)} 
            isParent={true} 
            isOpen={catalogOpen} 
          />
          {catalogOpen && (
            <div className="ml-4 border-l border-white/5 pl-4 space-y-1">
              <SidebarSubBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} />
              <SidebarSubBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            </div>
          )}

          <SidebarBtn 
            label="Planes / Saldo" 
            active={activeTab === 'plans'} 
            onClick={() => setActiveTab('plans')} 
          />
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
              />
            )}
            {activeTab === 'whatsapp' && <WhatsAppView />} 
            {activeTab === 'telegram' && (
              <TelegramView
                session={session}
                profile={profile}
                instance={instance}
                onUpdate={getData}
                goToPlans={() => setActiveTab('plans')}
              />
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
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}
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
          </div>
        </div>

          {/* Botón flotante WhatsApp: solo visible para planes Pro / Full (case-insensitive) */}
          <FloatingWhatsAppButton
            visible={!!profile && ['pro', 'full'].includes(normalizePlanType(profile?.plan_type))}
          />

        {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
        {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
        {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
        {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
      </main>
    </div>
  )
}

// Auxiliares del Sidebar
const SidebarBtn = ({ label, active, onClick, isParent, isOpen, locked, lockLabel }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-xl text-sm transition-all duration-200 ${
      locked
        ? 'text-gray-600 hover:bg-white/[0.02] cursor-pointer'
        : active
        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_2px_8px_rgba(99,102,241,0.08)]'
        : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
    }`}
  >
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