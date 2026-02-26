import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

// --- TUS COMPONENTES ---
import CatalogView from './CatalogView'
import WhatsAppView from './WhatsAppView.tsx'
import PlansView from './PlansView'
import Footer from './Footer'
import InstagramView from './InstagramView'
import FaqsView from './FaqsView'
import ProductsListView from './ProductsListView'

interface DashboardProps {
  session: Session
}

export interface Instance {
  id: string;
  user_id: string;
  provider_id?: string | null;
  bot_prompt?: string;
  plan?: string;
  status?: string;
}

export interface Profile {
    id: string;
    full_name?: string;
    public_reply?: string;
    plan_type?: string;        
    monthly_limit?: number;    
    messages_used?: number;    
    plan_expires_at?: string;  
    current_products?: number;
}

export default function Dashboard({ session }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [instance, setInstance] = useState<Instance | null>(null)
  const [activeTab, setActiveTab] = useState('instagram')
  
  // Estado para controlar el submenú de Catálogo
  const [catalogOpen, setCatalogOpen] = useState(false)

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
    try {
      setLoading(true)
      const { user } = session
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)

      const { data: instanceData } = await supabase.from('instances').select('*').eq('user_id', user.id).single() 
      if (instanceData) setInstance(instanceData)
    } catch (error) { console.warn(error) } finally { setLoading(false) }
  }

  // Función para manejar la actualización de productos y el perfil
  const handleProductAdded = async (newCount?: number) => {
    if (newCount !== undefined && profile) {
        setProfile({ ...profile, current_products: newCount });
    } else {
        await getData();
    }
  }

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-800">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">M</div>
                <span className="font-bold text-lg tracking-tight">MiTienda<span className="text-blue-500">Virtual</span></span>
             </div>
        </div>

        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-2 tracking-widest">Canales</p>
            
            <SidebarBtn 
                icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                label="Instagram"
                active={activeTab === 'instagram'}
                onClick={() => { setActiveTab('instagram'); setCatalogOpen(false); }}
                status={instance?.provider_id ? 'connected' : undefined}
            />

            {/* --- SECCIÓN CATÁLOGO DINÁMICA --- */}
            <div>
              <SidebarBtn 
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>}
                  label="Catálogo"
                  active={activeTab === 'catalog' || activeTab === 'inventory'}
                  onClick={() => setCatalogOpen(!catalogOpen)}
                  isParent={true}
                  isOpen={catalogOpen}
              />
              
              {catalogOpen && (
                <div className="ml-9 mt-1 space-y-1 border-l border-gray-800 animate-fade-in">
                  <SidebarSubBtn 
                    label="Subir Producto" 
                    active={activeTab === 'catalog'} 
                    onClick={() => setActiveTab('catalog')} 
                  />
                  <SidebarSubBtn 
                    label="Mantenedor / Edit" 
                    active={activeTab === 'inventory'} 
                    onClick={() => setActiveTab('inventory')} 
                  />
                </div>
              )}
            </div>

            <SidebarBtn 
                icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>}
                label="WhatsApp"
                active={activeTab === 'whatsapp'}
                onClick={() => { setActiveTab('whatsapp'); setCatalogOpen(false); }}
            />

            <SidebarBtn 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                label="Faqs"
                active={activeTab === 'faqs'}
                onClick={() => { setActiveTab('faqs'); setCatalogOpen(false); }}
            />

            <SidebarBtn 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>}
                label="Planes / Saldo"
                active={activeTab === 'plans'}
                onClick={() => { setActiveTab('plans'); setCatalogOpen(false); }}
            />
            
            <p className="text-xs font-bold text-gray-500 uppercase px-2 mt-6 mb-2 tracking-widest">Cuenta</p>
             <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/10 transition-all font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span>Cerrar Sesión</span>
             </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 overflow-y-auto relative bg-black flex flex-col justify-between">
        <div className="max-w-6xl mx-auto p-4 md:p-10 w-full flex-grow">
            
            {activeTab === 'instagram' && <InstagramView session={session} profile={profile} instance={instance} onUpdate={getData} />}
            
            {activeTab === 'catalog' && (
              <CatalogView 
                session={session} 
                profile={profile} 
                onProductAdded={handleProductAdded} 
                goToPlans={() => setActiveTab('plans')}
              />
            )}

            {activeTab === 'inventory' && (
                <div className="p-8 text-center">
                    { <ProductsListView session={session} onUpdate={getData} /> }
                </div>
            )}
            
            {activeTab === 'whatsapp' && <WhatsAppView />}
            {activeTab === 'faqs' && <FaqsView session={session} />}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}

        </div>
        
        <div className="max-w-6xl mx-auto px-4 md:px-10 w-full">
            <Footer />
        </div>
      </main>
    </div>
  )
}

// COMPONENTE PARA BOTONES DEL SUBMENÚ
const SidebarSubBtn = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-tighter transition-all ${active ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}
  >
    <span className="flex items-center gap-2">
      <div className={`w-1 h-1 rounded-full ${active ? 'bg-blue-400' : 'bg-transparent'}`} />
      {label}
    </span>
  </button>
)

const SidebarBtn = ({ icon, label, active, onClick, status, isParent, isOpen }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active && !isParent ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-400 hover:bg-gray-800'}`}
    >
        {icon}
        <span className="font-medium">{label}</span>
        {status === 'connected' && <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
        {isParent && (
          <svg 
            className={`ml-auto w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
    </button>
)