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
import Footer from './Footer'

// --- VISTAS LEGALES Y SOPORTE ---
import { PrivacyPolicy, TermsOfService, DataDeletion, SupportPage } from './LegalPages'

export default function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('instagram')
  const [catalogOpen, setCatalogOpen] = useState(false)
  
  // Estado único para controlar las ventanas emergentes (overlays)
  const [legalView, setLegalView] = useState<string | null>(null);

  useEffect(() => { getData() }, [])

  async function getData() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) setProfile(data)
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">M</div>
                <span className="font-bold text-lg tracking-tight">MiTienda<span className="text-blue-500">Virtual</span></span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">Canales de Venta</p>
          
          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163..."/></svg>} 
            label="Instagram" 
            active={activeTab === 'instagram'} 
            onClick={() => {setActiveTab('instagram'); setCatalogOpen(false); setLegalView(null)}} 
          />

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382..."/></svg>} 
            label="WhatsApp" 
            active={activeTab === 'whatsapp'} 
            onClick={() => {setActiveTab('whatsapp'); setCatalogOpen(false); setLegalView(null)}} 
          />
          
          <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Negocio</p>

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} 
            label="Catálogo" 
            active={activeTab === 'catalog' || activeTab === 'inventory'} 
            onClick={() => {setCatalogOpen(!catalogOpen); setLegalView(null)}} 
            isParent={true} 
            isOpen={catalogOpen} 
          />
          
          {catalogOpen && (
            <div className="ml-9 mt-1 space-y-1 border-l border-gray-800">
              <SidebarSubBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => {setActiveTab('catalog'); setLegalView(null)}} />
              <SidebarSubBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => {setActiveTab('inventory'); setLegalView(null)}} />
            </div>
          )}

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18..." /></svg>} 
            label="Planes / Saldo" 
            active={activeTab === 'plans'} 
            onClick={() => {setActiveTab('plans'); setCatalogOpen(false); setLegalView(null)}} 
          />
        </nav>

        <div className="p-4 border-t border-gray-800">
            <button 
                onClick={() => supabase.auth.signOut()} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-all font-semibold text-sm group"
            >
                Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col justify-between relative bg-[#050505]">
        <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex-grow">
            {/* VISTAS DE FONDO */}
            {activeTab === 'instagram' && <InstagramView session={session} profile={profile} onUpdate={getData} instance={undefined} />}
            {activeTab === 'whatsapp' && <WhatsAppView />} 
            {activeTab === 'catalog' && <CatalogView session={session} profile={profile} onProductAdded={getData} goToPlans={() => setActiveTab('plans')} />}
            {activeTab === 'inventory' && <ProductsListView session={session} onUpdate={getData} />}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}
        </div>
        
        {/* FOOTER Y MODALES LEGALES */}
        <div className="w-full">
            <Footer 
                variant="dashboard" 
                onNavigate={(tab) => {
                    setLegalView(tab); // Abre el modal sin cambiar el activeTab de fondo
                    setCatalogOpen(false);
                }} 
            />

            {/* RENDERIZADO DE MODALES CON CIERRE FUNCIONAL */}
            {legalView === 'terms' && <TermsOfService onClose={() => setLegalView(null)} />}
            {legalView === 'privacy' && <PrivacyPolicy onClose={() => setLegalView(null)} />}
            {legalView === 'data-deletion' && <DataDeletion onClose={() => setLegalView(null)} />}
            {legalView === 'support' && <SupportPage onClose={() => setLegalView(null)} />}
        </div>
      </main>
    </div>
  )
}

// COMPONENTES AUXILIARES (Sidebar)
const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-tight transition-all ${active ? 'text-blue-400 border-l-2 border-blue-400 ml-[-1px]' : 'text-gray-500 hover:text-white'}`}>
    {label}
  </button>
)

const SidebarBtn = ({ icon, label, active, onClick, isParent, isOpen }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${active && !isParent ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}>
        <span className="flex-shrink-0">{icon}</span>
        <span className="font-semibold tracking-wide">{label}</span>
        {isParent && (
            <svg className={`ml-auto w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        )}
    </button>
)