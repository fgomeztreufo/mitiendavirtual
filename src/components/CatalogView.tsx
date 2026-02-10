// src/components/CatalogView.tsx
import { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'

interface CatalogViewProps {
  session: Session
}

export default function CatalogView({ session }: CatalogViewProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    keywords: ''
  })
  const [file, setFile] = useState<File | null>(null)

  // Manejar cambios en inputs de texto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  // Enviar al Webhook de n8n
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      Swal.fire('Falta la foto', 'Por favor selecciona una imagen del producto.', 'warning')
      return
    }

    try {
      setLoading(true)
      
      // 1. Crear el paquete de datos (FormData)
      const dataToSend = new FormData()
      dataToSend.append('user_id', session.user.id) // ID vital para la carpeta
      dataToSend.append('name', formData.name)
      dataToSend.append('price', formData.price)
      dataToSend.append('description', formData.description)
      // Si no hay keywords, usa el nombre como comodín
      dataToSend.append('keywords', formData.keywords || formData.name) 
      dataToSend.append('foto', file) // El archivo binario

      // 2. URL DEL WEBHOOK (Actualizada ✅)
      // Nota: Si pasas a producción en n8n, recuerda quitar el "-test" de la URL
      const WEBHOOK_URL = 'https://webhook.mitiendavirtual.cl/webhook/subir-productos'
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: dataToSend
        // No agregamos Content-Type header porque FormData lo hace automático
      })

      if (response.ok) {
        Swal.fire({
            title: '¡Producto Subido! 🚀',
            text: 'Tu Inteligencia Artificial ya puede vender este producto.',
            icon: 'success',
            confirmButtonColor: '#10B981'
        })
        // Limpiar formulario para subir otro
        setFormData({ name: '', price: '', description: '', keywords: '' })
        setFile(null)
        // Resetear el input file visualmente
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } else {
        throw new Error('Error en n8n')
      }

    } catch (error) {
      console.error(error)
      Swal.fire({
        icon: 'error',
        title: 'Error al subir',
        text: 'Asegúrate de que el flujo en n8n esté activo o en modo "Listen".'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestión de Catálogo 📦</h1>
        <p className="text-gray-400">Sube productos para que tu Inteligencia Artificial pueda venderlos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* FORMULARIO DE CARGA */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
            <span>➕</span> Agregar Nuevo Producto
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">NOMBRE DEL PRODUCTO *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Zapatillas Nike Air"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">PRECIO *</label>
                    <input 
                        type="number" 
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="Ej: 50000"
                        className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                        required
                    />
                </div>
                <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">FOTO *</label>
                     <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30"
                        required
                    />
                </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">DESCRIPCIÓN (Para convencer) *</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Ej: Ideales para correr maratones, suela de gel, disponibles en talla 40-44..."
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">PALABRAS CLAVE (Búsqueda)</label>
              <input 
                type="text" 
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="Ej: zapatillas, nike, deporte, running (separadas por coma)"
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-600 mt-1">Si lo dejas vacío, usaremos el nombre del producto.</p>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold shadow-lg text-lg transition-all transform hover:-translate-y-1 mt-4 ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}`}
            >
                {loading ? 'Subiendo...' : '🚀 Guardar en Catálogo'}
            </button>

          </form>
        </div>

        {/* VISTA PREVIA EDUCATIVA */}
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-gray-300 font-bold mb-4">¿Cómo se verá en Instagram? 📸</h3>
                
                {/* Simulación Chat */}
                <div className="bg-black border border-gray-800 rounded-lg p-4 max-w-sm mx-auto">
                    <div className="flex justify-end mb-4">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm">
                            ¿Tienes {formData.name || 'este producto'}?
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex-shrink-0"></div>
                        <div className="space-y-2">
                            <div className="bg-gray-800 text-gray-200 px-4 py-2 rounded-2xl rounded-tl-none text-sm">
                                ¡Sí! Tenemos <strong>{formData.name || 'Producto'}</strong> a ${formData.price || '0'}. Mira:
                            </div>
                            {file ? (
                                <div className="rounded-xl overflow-hidden border border-gray-700 h-32 w-48 bg-gray-800 relative">
                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden border border-gray-700 border-dashed h-32 w-48 bg-gray-900 flex items-center justify-center text-gray-600 text-xs">
                                    Foto del producto
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-lg">
                <p className="text-sm text-yellow-500">
                    <strong>💡 Tip Pro:</strong> Agrega palabras clave como "oferta", "barato" o sinónimos para que el bot encuentre el producto aunque el cliente lo pida de otra forma.
                </p>
            </div>
        </div>

      </div>
    </div>
  )
}