import { useState } from 'react'
import Swal from 'sweetalert2'

export default function CatalogView({ session, profile, onProductAdded,goToPlans }: any) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', price: '', description: '' })
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // --- LÓGICA DE RESTRICCIÓN ---
  // Nota: Asegúrate que en n8n el plan se llame 'Básico' igual que aquí
  const planType = profile?.plan_type || 'Free';
  const currentCount = Number(profile?.current_products) || 0;
  
  const capacityMap: Record<string, number> = {
    'Free': 10, 
    'Básico': 50, 
    'Pro': 500, 
    'Full': 2000
  };

  const limit = capacityMap[planType] || 10;
  const isFull = currentCount >= limit && planType !== 'Full';
  const percentage = Math.min((currentCount / limit) * 100, 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Limpiar URL previa para evitar fugas de memoria
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isFull) {
        Swal.fire({
            icon: 'error',
            title: 'Límite alcanzado',
            text: `Tu plan ${planType} ha llegado al límite de productos (${limit}).`,
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    if (!file) {
      Swal.fire('Falta la foto', 'Por favor selecciona una imagen del producto.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('user_id', session.user.id);
      data.append('name', formData.name);
      data.append('price', formData.price);
      data.append('description', formData.description);
      data.append('foto', file); 
      const res = await fetch('https://webhook.mitiendavirtual.cl/webhook/subir-productos', {
        method: 'POST',
        body: data
      });

      if (res.status === 409) throw new Error('LIMITE_N8N');
      if (!res.ok) throw new Error('SERVER_ERROR');
      // --- NUEVA LÓGICA DE ACTUALIZACIÓN ---
      const responseData = await res.json();
      Swal.fire({
          title: '¡Guardado con éxito!',
          text: 'Tu IA ya conoce este producto.',
          icon: 'success',
          confirmButtonColor: '#10B981'
      });

      // --- RESETEO TOTAL DEL FORMULARIO ---
      setFormData({ name: '', price: '', description: '' });
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);

      // Resetear el input físicamente para que permita cargar la misma imagen u otra nueva
      const fileInput = document.getElementById('product-image') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Notificar al Dashboard para refrescar el contador
      if (onProductAdded) {
        onProductAdded(responseData.newCount); 
      }

    } catch (err: any) {
      if (err.message === 'LIMITE_N8N') {
        Swal.fire('Límite en Servidor', 'Has superado tu cuota en n8n.', 'error');
      } else {
        Swal.fire('Error', 'Hubo un problema al conectar con n8n.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in p-4 md:p-8">
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Mi Catálogo</h1>
          {planType === 'Full' && (
            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
              👑 VIP FULL
            </span>
          )}
        </div>
        
        {/* BARRA DE CAPACIDAD */}
        <div className={`p-4 rounded-2xl w-full md:w-64 border transition-all ${planType === 'Full' ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-gray-900 border-gray-800'}`}>
          <div className="flex justify-between text-[10px] font-black mb-2 tracking-widest uppercase">
            <span className="text-gray-500">Capacidad</span>
            <span className="text-white">{planType === 'Full' ? '∞ ILIMITADO' : `${currentCount} / ${limit}`}</span>
          </div>
          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 ${planType === 'Full' ? 'bg-gradient-to-r from-yellow-600 to-orange-400' : isFull ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${planType === 'Full' ? 100 : percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-[#111827] border border-gray-800 rounded-[2rem] p-8 relative overflow-hidden">
        {isFull && (
       <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center">
          <span className="text-4xl mb-4">🔒</span>
          <h3 className="text-xl font-bold text-white mb-2 uppercase">Plan {planType} al máximo</h3>
          <p className="text-gray-400 text-xs mb-8">Has alcanzado el límite de {limit} productos.</p>
          
          {/* CAMBIA EL ONCLICK AQUÍ */}
          <button 
            type="button"
            onClick={goToPlans} 
            className="bg-white text-black px-10 py-3 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-all"
          >
            Mejorar mi Plan
          </button>
       </div>
    )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre del Producto</label>
                <input required
                  className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Zapatillas Adidas"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio ($ CLP)</label>
                <input required type='number'
                  className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="9990"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Foto Real del Producto</label>
              <label className="h-40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/5 transition-all overflow-hidden relative group">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-2">📸</span>
                    <span className="text-gray-600 font-bold text-[10px] uppercase tracking-tighter">Click para seleccionar imagen</span>
                  </div>
                )}
                {/* ID AÑADIDO PARA RESETEO FÍSICO */}
                <input id="product-image" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>

            <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción para la IA</label>
                <textarea required
                    className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm h-24"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detalla tallas, materiales y beneficios..."
                />
            </div>

            <button type="submit" disabled={loading || isFull} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${loading ? 'bg-gray-800 text-gray-600' : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.01] shadow-blue-900/20'}`}>
              {loading ? 'Subiendo Producto...' : '🚀 Guardar en Catálogo'}
            </button>
          </form>
        </div>

        {/* VISTA PREVIA CLIENTE */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <p className="text-[10px] font-black text-gray-500 uppercase mb-6 tracking-widest italic">Referencia de Vista Cliente</p>
          <div className="w-full max-w-[260px] bg-black border-[8px] border-[#1f2937] rounded-[3rem] aspect-[9/16] p-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-8 border-b border-gray-900 pb-2">
                <div className="w-6 h-6 bg-gradient-to-tr from-orange-500 to-pink-500 rounded-full" />
                <div className="h-2 w-16 bg-gray-800 rounded-full" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white text-[9px] px-3 py-2 rounded-2xl rounded-tr-none max-w-[80%]">
                  ¿Tienen <strong>{formData.name || 'zapatillas'}</strong>?
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">🤖</div>
                <div className="bg-[#1f2937] text-gray-200 text-[9px] px-3 py-2 rounded-2xl rounded-tl-none space-y-2">
                  <p>¡Hola! Sí, lo tenemos disponible por <strong>${formData.price || '0'}</strong>.</p>
                  <div className="w-full aspect-square bg-black rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Chat Preview" />
                    ) : (
                      <span className="text-xl opacity-20">📷</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}