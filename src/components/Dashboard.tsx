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

  useEffect(() => { getData() }, [])

  async function getData() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) setProfile(data)
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        {/* LOGO */}
        <div className="p-6 border-b border-gray-800">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">M</div>
                <span className="font-bold text-lg tracking-tight">MiTienda<span className="text-blue-500">Virtual</span></span>
             </div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">Canales de Venta</p>
          
          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>} 
            label="Instagram" 
            active={activeTab === 'instagram'} 
            onClick={() => {setActiveTab('instagram'); setCatalogOpen(false)}} 
          />

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414zM12.001 0a11.993 11.993 0 00-10.373 17.96L0 24l6.233-1.635A11.948 11.948 0 0012.001 24c6.628 0 12.001-5.373 12.001-12.001S18.629 0 12.001 0zm0 21.932a9.914 9.914 0 01-5.06-1.385l-.362-.214-3.758.986 1.003-3.664-.234-.373a9.907 9.907 0 01-1.517-5.28c0-5.479 4.457-9.936 9.936-9.936s9.936 4.457 9.936 9.936c0 5.48-4.457 9.936-9.936 9.936z"/></svg>} 
            label="WhatsApp" 
            active={activeTab === 'whatsapp'} 
            onClick={() => {setActiveTab('whatsapp'); setCatalogOpen(false)}} 
          />
          
          <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Negocio</p>

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} 
            label="Catálogo" 
            active={activeTab === 'catalog' || activeTab === 'inventory'} 
            onClick={() => setCatalogOpen(!catalogOpen)} 
            isParent={true} 
            isOpen={catalogOpen} 
          />
          
          {catalogOpen && (
            <div className="ml-9 mt-1 space-y-1 border-l border-gray-800">
              <SidebarSubBtn label="Subir Producto" active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} />
              <SidebarSubBtn label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            </div>
          )}

          <SidebarBtn 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} 
            label="Planes / Saldo" 
            active={activeTab === 'plans'} 
            onClick={() => {setActiveTab('plans'); setCatalogOpen(false)}} 
          />
        </nav>

        {/* BOTÓN CERRAR SESIÓN */}
        <div className="p-4 border-t border-gray-800">
            <button 
                onClick={() => supabase.auth.signOut()} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-all font-semibold text-sm group"
            >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto flex flex-col justify-between relative bg-[#050505]">
        <div className="max-w-5xl mx-auto p-6 md:p-10 w-full flex-grow">
            
            {/* Vistas de Usuario */}
            {activeTab === 'instagram' && <InstagramView session={session} profile={profile} onUpdate={getData} />}
            {activeTab === 'whatsapp' && <WhatsAppView />} 
            {activeTab === 'catalog' && <CatalogView session={session} profile={profile} onProductAdded={getData} goToPlans={() => setActiveTab('plans')} />}
            {activeTab === 'inventory' && <ProductsListView session={session} onUpdate={getData} />}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}

            {/* Vistas Legales y Soporte */}
            {activeTab === 'support' && <SupportPage onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'terms' && <TermsOfService onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'privacy' && <PrivacyPolicy onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'data-deletion' && <DataDeletion onClose={() => setActiveTab('instagram')} />}
        </div>
        
       {/* FOOTER DINÁMICO AL FINAL DEL CONTENIDO */}
      <div className="w-full">
            <Footer onNavigate={(tab) => setActiveTab(tab)} variant="dashboard" />
        </div>
      </main>
    </div>
  )
}

// COMPONENTES AUXILIARES
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