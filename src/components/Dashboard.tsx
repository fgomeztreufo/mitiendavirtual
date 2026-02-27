import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

// Vistas de App
import InstagramView from './InstagramView'
import CatalogView from './CatalogView'
import ProductsListView from './ProductsListView'
import PlansView from './PlansView'
import Footer from './Footer'

// Vistas Legales y Soporte
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
    <div className="flex h-screen bg-black text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-6 font-bold text-xl border-b border-gray-800">MiTienda<span className="text-blue-500">Virtual</span></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => {setActiveTab('instagram'); setCatalogOpen(false)}} className={`w-full text-left p-3 rounded-lg ${activeTab === 'instagram' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400'}`}>📱 Instagram</button>
          <button onClick={() => setCatalogOpen(!catalogOpen)} className="w-full text-left p-3 rounded-lg text-gray-400">📦 Catálogo</button>
          {catalogOpen && (
            <div className="ml-6 space-y-1">
              <button onClick={() => setActiveTab('catalog')} className="w-full text-left p-2 text-xs text-gray-500 hover:text-white">Subir Producto</button>
              <button onClick={() => setActiveTab('inventory')} className="w-full text-left p-2 text-xs text-gray-500 hover:text-white">Inventario</button>
            </div>
          )}
          <button onClick={() => setActiveTab('plans')} className={`w-full text-left p-3 rounded-lg ${activeTab === 'plans' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400'}`}>💰 Planes</button>
        </nav>
      </aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 overflow-y-auto flex flex-col justify-between">
        <div className="max-w-5xl mx-auto p-8 w-full">
            
            {/* Control de Vistas */}
            {activeTab === 'instagram' && <InstagramView session={session} profile={profile} onUpdate={getData} />}
            {activeTab === 'catalog' && <CatalogView session={session} profile={profile} onProductAdded={getData} goToPlans={() => setActiveTab('plans')} />}
            {activeTab === 'inventory' && <ProductsListView session={session} onUpdate={getData} />}
            {activeTab === 'plans' && <PlansView session={session} profile={profile} />}

            {/* --- SOLUCIÓN VISTAS LEGALES/SOPORTE --- */}
            {activeTab === 'support' && <SupportPage onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'terms' && <TermsOfService onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'privacy' && <PrivacyPolicy onClose={() => setActiveTab('instagram')} />}
            {activeTab === 'data-deletion' && <DataDeletion onClose={() => setActiveTab('instagram')} />}
        </div>
        
        <div className="max-w-5xl mx-auto px-8 w-full pb-6">
            <Footer onNavigate={(tab) => setActiveTab(tab)} />
        </div>
      </main>
    </div>
  )
}