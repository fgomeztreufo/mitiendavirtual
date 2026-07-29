import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { effectivePlan, planCodeToDisplay } from '../utils/planUtils'
import { getLabels, OPERATION_TYPES, PROPERTY_TYPES } from '../utils/businessLabels'
import { supabase } from '../supabaseClient'

export default function CatalogView({ session, profile, onProductAdded, goToPlans, businessType }: any) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '', price: '', description: '', brand: '', category: '',
    operation_type: '', property_type: '', area_m2: '', bedrooms: '', bathrooms: '',
    parking_spots: '', comuna: '', address: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [extraPreviews, setExtraPreviews] = useState<string[]>([])

  const labels = getLabels(businessType)
  const isRealEstate = businessType === 'inmobiliaria'

  const planCode = effectivePlan(profile)
  const currentCount = Number(profile?.current_products) || 0

  const [planLimit, setPlanLimit] = useState<number | null>(null)

  const capacityMap: Record<string, number> = { basic: 50, pro: 500, full: 2000 }

  useEffect(() => {
    let mounted = true
    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('products_limit')
          .eq('code', planCode)
          .single()
        if (!error && data && mounted) setPlanLimit(Number(data.products_limit) || null)
      } catch (_) { /* fallback silently */ }
    }
    if (planCode) loadPlan()
    return () => { mounted = false }
  }, [planCode])

  const limit = planLimit ?? capacityMap[planCode] ?? 10
  const isFull = currentCount >= limit
  const percentage = Math.min((currentCount / limit) * 100, 100)

  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        Swal.fire('Formato no soportado', 'Solo se permiten imágenes JPG, PNG o WebP.', 'warning')
        e.target.value = ''
        return
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        Swal.fire('Imagen muy pesada', 'El archivo no puede superar los 10 MB.', 'warning')
        e.target.value = ''
        return
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles: File[] = []
    const newPreviews: string[] = []
    for (let i = 0; i < Math.min(e.target.files.length, 10 - extraFiles.length); i++) {
      const f = e.target.files[i]
      if (ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE) {
        newFiles.push(f)
        newPreviews.push(URL.createObjectURL(f))
      }
    }
    setExtraFiles(prev => [...prev, ...newFiles])
    setExtraPreviews(prev => [...prev, ...newPreviews])
    e.target.value = ''
  }

  const removeExtraFile = (idx: number) => {
    URL.revokeObjectURL(extraPreviews[idx])
    setExtraFiles(prev => prev.filter((_, i) => i !== idx))
    setExtraPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const buildRagDescription = () => {
    const parts: string[] = []

    if (isRealEstate) {
      if (formData.property_type) parts.push(formData.property_type)
      if (formData.operation_type) parts.push(`en ${formData.operation_type}`)
      const location = [formData.comuna, formData.address].filter(Boolean).join(', ')
      if (location) parts.push(`- ${location}`)
      const specs: string[] = []
      if (formData.area_m2) specs.push(`${formData.area_m2}m²`)
      if (formData.bedrooms) specs.push(`${formData.bedrooms} dormitorios`)
      if (formData.bathrooms) specs.push(`${formData.bathrooms} baños`)
      if (formData.parking_spots) specs.push(`${formData.parking_spots} estacionamientos`)
      if (specs.length) parts.push(`- ${specs.join(', ')}`)
    } else {
      parts.push(formData.name)
      if (formData.brand) parts.push(`- ${formData.brand}`)
      if (formData.category) parts.push(`- Categoría: ${formData.category}`)
    }

    if (formData.price) parts.push(`- $${Number(formData.price).toLocaleString('es-CL')} CLP`)
    if (formData.description.trim()) parts.push(`. ${formData.description.trim()}`)

    return parts.join(' ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isFull) {
      Swal.fire({
        icon: 'error',
        title: 'Límite alcanzado',
        text: `Tu plan ${planCodeToDisplay(planCode)} ha llegado al límite de ${labels.products.toLowerCase()} (${limit}).`,
        confirmButtonColor: '#2563eb',
      })
      return
    }

    if (!file) {
      Swal.fire('Falta la foto', `Por favor selecciona una imagen ${isRealEstate ? 'de la propiedad' : 'del producto'}.`, 'warning')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      data.append('user_id', session.user.id)
      data.append('name', formData.name)
      data.append('price', formData.price)
      data.append('description', buildRagDescription())
      data.append('brand', formData.brand)
      data.append('category', isRealEstate ? formData.property_type : formData.category)
      data.append('foto', file)

      if (isRealEstate) {
        data.append('operation_type', formData.operation_type)
        data.append('property_type', formData.property_type)
        data.append('area_m2', formData.area_m2)
        data.append('bedrooms', formData.bedrooms)
        data.append('bathrooms', formData.bathrooms)
        data.append('parking_spots', formData.parking_spots)
        data.append('comuna', formData.comuna)
        data.append('address', formData.address)
      }

      const res = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/subir-productos`, {
        method: 'POST',
        body: data,
      })

      if (res.status === 409) throw new Error('LIMITE_N8N')
      if (!res.ok) throw new Error('SERVER_ERROR')

      const responseData = await res.json()

      if (isRealEstate) {
        const { data: latest } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (latest) {
          await supabase.from('products').update({
            operation_type: formData.operation_type || null,
            property_type: formData.property_type || null,
            area_m2: formData.area_m2 ? Number(formData.area_m2) : null,
            bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
            bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
            parking_spots: formData.parking_spots ? Number(formData.parking_spots) : null,
            comuna: formData.comuna || null,
            address: formData.address || null,
            property_status: 'disponible',
          }).eq('id', latest.id)

          if (extraFiles.length > 0) {
            for (let i = 0; i < extraFiles.length; i++) {
              const ef = extraFiles[i]
              const ext = ef.type === 'image/jpeg' ? 'jpg' : ef.type === 'image/png' ? 'png' : 'webp'
              const fileName = `${session.user.id}/${Date.now()}_extra_${i}_${Math.random().toString(36).slice(2)}.${ext}`
              const { error: upErr } = await supabase.storage.from('catalog').upload(fileName, ef, { contentType: ef.type })
              if (!upErr) {
                const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(fileName)
                await supabase.from('product_images').insert({
                  product_id: latest.id,
                  user_id: session.user.id,
                  image_url: urlData.publicUrl,
                  sort_order: i,
                })
              }
            }
          }
        }
      }

      Swal.fire({
        title: '¡Guardado con éxito!',
        text: labels.uploadSuccess,
        icon: 'success',
        confirmButtonColor: '#10B981',
      })

      setFormData({
        name: '', price: '', description: '', brand: '', category: '',
        operation_type: '', property_type: '', area_m2: '', bedrooms: '', bathrooms: '',
        parking_spots: '', comuna: '', address: '',
      })
      setFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      extraPreviews.forEach(u => URL.revokeObjectURL(u))
      setExtraFiles([])
      setExtraPreviews([])

      const fileInput = document.getElementById('product-image') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      if (onProductAdded) onProductAdded(responseData.newCount)
    } catch (err: any) {
      if (err.message === 'LIMITE_N8N') {
        Swal.fire('Límite en Servidor', 'Has superado tu cuota en n8n.', 'error')
      } else {
        Swal.fire('Error', 'Hubo un problema al conectar con n8n.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm'
  const selectClass = 'bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm appearance-none'

  return (
    <div className="animate-fade-in p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase">{labels.catalog}</h1>
          {planCode === 'full' && (
            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
              VIP FULL
            </span>
          )}
        </div>

        <div className="p-4 rounded-2xl w-full md:w-64 border transition-all bg-gray-900 border-gray-800">
          <div className="flex justify-between text-[10px] font-black mb-2 tracking-widest uppercase">
            <span className="text-gray-500">Capacidad</span>
            <span className="text-white">{`${currentCount} / ${limit.toLocaleString('es-CL')}`}</span>
          </div>
          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-[#111827] border border-gray-800 rounded-[2rem] p-8 relative overflow-hidden">
          {isFull && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl mb-4">🔒</span>
              <h3 className="text-xl font-bold text-white mb-2 uppercase">Plan {planCodeToDisplay(planCode)} al máximo</h3>
              <p className="text-gray-400 text-xs mb-8">Has alcanzado el límite de {limit} {labels.products.toLowerCase()}.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{labels.nameLabel}</label>
                <input required className={inputClass}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={labels.namePlaceholder}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{labels.priceLabel}</label>
                <input required type="number" className={inputClass}
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder={labels.pricePlaceholder}
                />
              </div>
            </div>

            {/* E-commerce: brand + category */}
            {labels.showBrand && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Marca</label>
                  <input className={inputClass}
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ej: Nike, Samsung, Artesanal"
                  />
                </div>
                {labels.showCategory && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{labels.categoryLabel}</label>
                    <input className={inputClass}
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      placeholder={labels.categoryPlaceholder}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Clinica/Servicios: solo category */}
            {!labels.showBrand && labels.showCategory && (
              <div className="text-left">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{labels.categoryLabel}</label>
                  <input className={inputClass}
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder={labels.categoryPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* Inmobiliaria: campos específicos */}
            {isRealEstate && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo Operación</label>
                    <select required className={selectClass}
                      value={formData.operation_type}
                      onChange={e => setFormData({ ...formData, operation_type: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      {OPERATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo Propiedad</label>
                    <select required className={selectClass}
                      value={formData.property_type}
                      onChange={e => setFormData({ ...formData, property_type: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      {PROPERTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Superficie m²</label>
                    <input type="number" className={inputClass}
                      value={formData.area_m2}
                      onChange={e => setFormData({ ...formData, area_m2: e.target.value })}
                      placeholder="85"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dormitorios</label>
                    <input type="number" className={inputClass}
                      value={formData.bedrooms}
                      onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                      placeholder="3"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Baños</label>
                    <input type="number" className={inputClass}
                      value={formData.bathrooms}
                      onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estacionamientos</label>
                    <input type="number" className={inputClass}
                      value={formData.parking_spots}
                      onChange={e => setFormData({ ...formData, parking_spots: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Comuna</label>
                    <input className={inputClass}
                      value={formData.comuna}
                      onChange={e => setFormData({ ...formData, comuna: e.target.value })}
                      placeholder="Ej: Providencia, Las Condes"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dirección</label>
                    <input className={inputClass}
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ej: Av. Providencia 1234"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2 text-left">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Foto Principal</label>
              <label className="h-40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/5 transition-all overflow-hidden relative group">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-2">📸</span>
                    <span className="text-gray-600 font-bold text-[10px] uppercase tracking-tighter">Click para seleccionar imagen</span>
                  </div>
                )}
                <input id="product-image" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>

            {/* Galería extra (inmobiliaria) */}
            {isRealEstate && (
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fotos Adicionales (máx. 10)</label>
                <div className="flex flex-wrap gap-3">
                  {extraPreviews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-700">
                      <img src={url} className="w-full h-full object-cover" alt={`Extra ${i + 1}`} />
                      <button type="button" onClick={() => removeExtraFile(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-400"
                      >✕</button>
                    </div>
                  ))}
                  {extraFiles.length < 10 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors">
                      <span className="text-gray-600 text-xl">+</span>
                      <input type="file" className="hidden" onChange={handleExtraFiles} accept="image/*" multiple />
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 text-left">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{labels.descLabel}</label>
              <textarea required className="bg-black border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm h-24"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={labels.descPlaceholder}
              />
            </div>

            <button type="submit" disabled={loading || isFull}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${loading ? 'bg-gray-800 text-gray-600' : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.01] shadow-blue-900/20'}`}
            >
              {loading ? 'Subiendo...' : labels.addProduct}
            </button>
          </form>
        </div>

        {/* VISTA PREVIA */}
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
                  {isRealEstate
                    ? <>¿Tienen <strong>{formData.property_type || 'departamentos'}</strong> en <strong>{formData.comuna || 'Providencia'}</strong>?</>
                    : <>¿Tienen <strong>{formData.name || 'zapatillas'}</strong>?</>
                  }
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">🤖</div>
                <div className="bg-[#1f2937] text-gray-200 text-[9px] px-3 py-2 rounded-2xl rounded-tl-none space-y-2">
                  {isRealEstate ? (
                    <>
                      <p>¡Hola! Sí, tenemos {formData.name || 'una propiedad'} en {formData.operation_type || 'venta'}.</p>
                      <p><strong>${formData.price || '0'}</strong> · {formData.area_m2 || '?'} m² · {formData.bedrooms || '?'}D {formData.bathrooms || '?'}B</p>
                    </>
                  ) : (
                    <p>¡Hola! Sí, lo tenemos disponible por <strong>${formData.price || '0'}</strong>.</p>
                  )}
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
