import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'

// --- VISTAS DE APP ---
import InstagramView from './InstagramView'
import CatalogView from './CatalogView'
import ProductsListView from './ProductsListView'
import PlansView from './PlansView'
import WhatsAppView from './WhatsAppView.tsx' 
import Footer from './Footer'

// --- VISTAS LEGALES ---
import { PrivacyPolicy, TermsOfService, DataDeletion, SupportPage } from './LegalPages'

export default function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<any>(null)
  const [instance, setInstance] = useState<any>(null) // NUEVO: Estado para la instancia de Instagram
  const [activeTab, setActiveTab] = useState('instagram')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [legalView, setLegalView] = useState<string | null>(null);

  useEffect(() => { getData() }, [])

  async function getData() {
    // 1. Obtener Perfil (Límites, Plan, Nombre)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (profileData) setProfile(profileData)

    // 2. Obtener Instancia (Conexión Instagram, Prompt)
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

        <nav className="flex-1 p-4 space-y-1">
          <SidebarBtn 
            label="Instagram" 
            active={activeTab === 'instagram'} 
            onClick={() => {setActiveTab('instagram'); setLegalView(null)}} 
          />
          <SidebarBtn 
            label="WhatsApp" 
            active={activeTab === 'whatsapp'} 
            onClick={() => {setActiveTab('whatsapp'); setLegalView(null)}} 
          />
          <SidebarBtn 
            label="Catálogo" 
            active={activeTab === 'catalog' || activeTab === 'inventory'} 
            onClick={() => setCatalogOpen(!catalogOpen)} 
            isParent={true} 
            isOpen={catalogOpen} 
          />
          {catalogOpen && (
            <div className="ml-9 space-y-1">
              <SidebarSubBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} />
              <SidebarSubBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            </div>
          )}
          <SidebarBtn 
            label="Planes" 
            active={activeTab === 'plans'} 
            onClick={() => setActiveTab('plans')} 
          />
        </nav>

        <div className="p-4 border-t border-gray-800">
            <button onClick={() => supabase.auth.signOut()} className="w-full text-left text-red-500 p-2 hover:bg-red-500/10 rounded-lg">Cerrar Sesión</button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#050505]">
        <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex-grow">
            {activeTab === 'instagram' && (
              <InstagramView 
                session={session} 
                profile={profile} 
                instance={instance} // Pasamos la instancia real
                onUpdate={getData} 
              />
            )}
            {activeTab === 'whatsapp' && <WhatsAppView />} 
            {activeTab === 'catalog' && <CatalogView session={session} profile={profile} onProductAdded={getData} goToPlans={() => setActiveTab('plans')} />}
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

// Auxiliares rápidos para el Sidebar
const SidebarBtn = ({ label, active, onClick, isParent, isOpen }: any) => (
  <button onClick={onClick} className={`w-full flex items-center p-3 rounded-xl text-sm ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-400 hover:bg-gray-800'}`}>
    <span className="font-semibold">{label}</span>
  </button>
)
const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full text-left py-2 text-xs uppercase ${active ? 'text-blue-400' : 'text-gray-500'}`}>{label}</button>
)