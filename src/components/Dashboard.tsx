import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

// --- VISTAS DE APP ---
import InstagramView from './InstagramView'
import CatalogView from './CatalogView'
import ProductsListView from './ProductsListView'
import PlansView from './PlansView'
import WhatsAppView from './WhatsAppView.tsx' 
import FaqsView from './FaqsView' // <--- RE-INCORPORADO
import Footer from './Footer'

// --- VISTAS LEGALES ---
import { PrivacyPolicy, TermsOfService } from './LegalPages'
import KnowlowerView from './KnowlowerView.tsx'
import Leads from './Leads.tsx'
import LeadsView from './Leads.tsx'

export default function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<any>(null)
  const [instance, setInstance] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('instagram')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [legalView, setLegalView] = useState<string | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);

  // Manejo de alertas por URL (Pagos o Conexiones)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      Swal.fire({ title: '¡Conexión Exitosa!', icon: 'success', confirmButtonColor: '#10B981', timer: 3000 });
      window.history.replaceState({}, document.title, window.location.pathname);
      getData(); setActiveTab('instagram'); 
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
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">M</div>
                <span className="font-bold text-lg">MiTienda<span className="text-blue-500">Virtual</span></span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">Canales</p>
          
         {/* Botón Instagram con submenú */}
        <SidebarBtn 
          label="Instagram" 
          active={ activeTab === 'leads'} 
          onClick={() => setCatalogOpen(!catalogOpen)} 
          isParent={true} 
          isOpen={catalogOpen} 
        />
        {catalogOpen && (
          <div className="ml-4 border-l border-gray-800 pl-4 space-y-1">
            <SidebarSubBtn 
              label="Ventas Capturadas" 
              active={activeTab === 'leads'} 
              onClick={() => setActiveTab('leads')} 
            />
          </div>
        )}
          <SidebarBtn 
            label="WhatsApp" 
            active={activeTab === 'whatsapp'} 
            onClick={() => {setActiveTab('whatsapp'); setLegalView(null)}} 
          />
          
          <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Configuración</p>
          {/* NUEVO: Link directo que pediste */}
        <SidebarBtn 
          label="Configura tu Instagram" 
          active={activeTab === 'instagram'} 
          onClick={() => setActiveTab('instagram')} 
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
          <div className="ml-4 border-l border-gray-800 pl-4 space-y-1">
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
            <div className="ml-4 border-l border-gray-800 pl-4 space-y-1">
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

        <div className="p-4 border-t border-gray-800">
            <button onClick={() => supabase.auth.signOut()} className="w-full text-left text-red-500 p-2 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#050505]">
        <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex-grow">
            {activeTab === 'instagram' && (
              <InstagramView 
                session={session} 
                profile={profile} 
                instance={instance} 
                onUpdate={getData} 
              />
            )}
            {activeTab === 'whatsapp' && <WhatsAppView />} 
            
            {/* VISTA DE FAQs RE-INCORPORADA */}
            {activeTab === 'faqs' && <FaqsView session={session} />}
            {activeTab === 'leads' && <LeadsView userId={session.user.id}/>}
            {activeTab === 'knowlower' && <KnowlowerView userId={session.user.id} />}
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
        
        <Footer onNavigate={(tab) => setLegalView(tab)} />

        {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
        {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
      </main>
    </div>
  )
}

// Auxiliares del Sidebar
const SidebarBtn = ({ label, active, onClick, isParent, isOpen }: any) => (
  <button onClick={onClick} className={`w-full flex items-center p-3 rounded-xl text-sm transition-all ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-400 hover:bg-gray-800'}`}>
    <span className="font-semibold">{label}</span>
    {isParent && (
      <span className="ml-auto">
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
      </span>
    )}
  </button>
)

const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left py-2 text-xs font-medium uppercase tracking-wider transition-colors ${active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>{label}</button>
)