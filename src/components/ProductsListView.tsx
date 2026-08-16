import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { getLabels, OPERATION_TYPES, PROPERTY_TYPES, PROPERTY_STATUSES } from '../utils/businessLabels'

export default function ProductsListView({ session, onUpdate, businessType }: any) {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)

  const labels = getLabels(businessType)
  const isRealEstate = businessType === 'inmobiliaria'

  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [editData, setEditData] = useState({
    name: '', price: '', description: '', brand: '', category: '',
    operation_type: '', property_type: '', area_m2: '', bedrooms: '', bathrooms: '',
    parking_spots: '', comuna: '', address: '', property_status: 'disponible',
  })
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [gallery, setGallery] = useState<any[]>([])
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([])
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([])

  const [filterOp, setFilterOp] = useState('all')
  const [filterPropType, setFilterPropType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    let results = products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.comuna && p.comuna.toLowerCase().includes(term)) ||
      (p.property_type && p.property_type.toLowerCase().includes(term))
    )
    if (isRealEstate) {
      if (filterOp !== 'all') results = results.filter(p => p.operation_type === filterOp)
      if (filterPropType !== 'all') results = results.filter(p => p.property_type === filterPropType)
      if (filterStatus !== 'all') results = results.filter(p => p.property_status === filterStatus)
    }
    setFilteredProducts(results)
    setCurrentPage(1)
  }, [searchTerm, products, filterOp, filterPropType, filterStatus])

  async function fetchProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (error: any) {
      console.error('Error:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = async (product: any) => {
    setEditingProduct(product)
    setEditData({
      name: product.name,
      price: product.price.toString(),
      description: product.description || '',
      brand: product.brand || '',
      category: product.category || '',
      operation_type: product.operation_type || '',
      property_type: product.property_type || '',
      area_m2: product.area_m2 ? product.area_m2.toString() : '',
      bedrooms: product.bedrooms ? product.bedrooms.toString() : '',
      bathrooms: product.bathrooms ? product.bathrooms.toString() : '',
      parking_spots: product.parking_spots ? product.parking_spots.toString() : '',
      comuna: product.comuna || '',
      address: product.address || '',
      property_status: product.property_status || 'disponible',
    })
    setEditPreviewUrl(null)
    setNewGalleryFiles([])
    setNewGalleryPreviews([])

    const { data: imgs } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order')
    setGallery(imgs || [])
  }

  const getFilePathFromUrl = (url: string) => {
    const parts = url.split('/products/')
    return parts.length > 1 ? parts[1] : null
  }

  const deleteStorageFile = async (imageUrl: string) => {
    try {
      const bucketName = 'catalog'
      const parts = imageUrl.split(`/${bucketName}/`)
      if (parts.length < 2) return
      const cleanPath = parts[1].replace(/[\n\r]/g, '').replace(/[^a-zA-Z0-9.\-\/]/g, '').trim()
      await supabase.storage.from(bucketName).remove([cleanPath])
    } catch (err) {
      console.error('Error eliminando archivo:', err)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploading(true)
      let finalImageUrl = editingProduct.image_url
      const file = fileInputRef.current?.files?.[0]

      if (file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) throw new Error(`Tipo de imagen no permitido: ${file.type}`)
        await deleteStorageFile(editingProduct.image_url)
        const fileExt = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
        const fileName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('catalog').upload(fileName, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(fileName)
        finalImageUrl = urlData.publicUrl
      }

      const updatePayload: any = {
        name: editData.name,
        price: Number(editData.price),
        description: editData.description,
        brand: editData.brand,
        category: editData.category,
        image_url: finalImageUrl,
      }

      if (isRealEstate) {
        updatePayload.operation_type = editData.operation_type || null
        updatePayload.property_type = editData.property_type || null
        updatePayload.area_m2 = editData.area_m2 ? Number(editData.area_m2) : null
        updatePayload.bedrooms = editData.bedrooms ? Number(editData.bedrooms) : null
        updatePayload.bathrooms = editData.bathrooms ? Number(editData.bathrooms) : null
        updatePayload.parking_spots = editData.parking_spots ? Number(editData.parking_spots) : null
        updatePayload.comuna = editData.comuna || null
        updatePayload.address = editData.address || null
        updatePayload.property_status = editData.property_status || 'disponible'
      }

      const { error: prodError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', editingProduct.id)
        .eq('user_id', session.user.id)
      if (prodError) throw prodError

      if (newGalleryFiles.length > 0) {
        for (let i = 0; i < newGalleryFiles.length; i++) {
          const ef = newGalleryFiles[i]
          const ext = ef.type === 'image/jpeg' ? 'jpg' : ef.type === 'image/png' ? 'png' : 'webp'
          const fileName = `${session.user.id}/${Date.now()}_gallery_${i}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('catalog').upload(fileName, ef, { contentType: ef.type })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(fileName)
            await supabase.from('product_images').insert({
              product_id: editingProduct.id,
              user_id: session.user.id,
              image_url: urlData.publicUrl,
              sort_order: gallery.length + i,
            })
          }
        }
      }

      const { error: ragError } = await supabase
        .from('documents')
        .delete()
        .eq('original_id_saas', editingProduct.id.toString())
        .eq('user_id', session.user.id)
      if (ragError) console.error('No se pudo limpiar RAG:', ragError.message)

      Swal.fire({
        icon: 'success',
        title: `¡${labels.product} actualizado!`,
        text: 'Tu bot conocerá los cambios en los próximos 30 minutos.',
        timer: 3000, showConfirmButton: false,
      })

      setEditingProduct(null)
      setEditPreviewUrl(null)
      newGalleryPreviews.forEach(u => URL.revokeObjectURL(u))
      setNewGalleryFiles([])
      setNewGalleryPreviews([])
      fetchProducts()
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Error en handleUpdate:', error.message)
      Swal.fire('Error', error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const deleteGalleryImage = async (img: any) => {
    await deleteStorageFile(img.image_url)
    await supabase.from('product_images').delete().eq('id', img.id)
    setGallery(prev => prev.filter(g => g.id !== img.id))
  }

  const handleGalleryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files: File[] = []
    const previews: string[] = []
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    for (let i = 0; i < Math.min(e.target.files.length, 10 - gallery.length - newGalleryFiles.length); i++) {
      const f = e.target.files[i]
      if (ALLOWED.includes(f.type) && f.size <= 10 * 1024 * 1024) {
        files.push(f)
        previews.push(URL.createObjectURL(f))
      }
    }
    setNewGalleryFiles(prev => [...prev, ...files])
    setNewGalleryPreviews(prev => [...prev, ...previews])
    e.target.value = ''
  }

  const removeNewGallery = (idx: number) => {
    URL.revokeObjectURL(newGalleryPreviews[idx])
    setNewGalleryFiles(prev => prev.filter((_, i) => i !== idx))
    setNewGalleryPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDelete = async (product: any) => {
    const result = await Swal.fire({
      title: `¿Eliminar ${labels.product.toLowerCase()}?`,
      text: 'Se recuperará 1 cupo de tu capacidad de almacenamiento.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar todo',
    })

    if (result.isConfirmed) {
      try {
        setLoading(true)
        if (product.image_url) await deleteStorageFile(product.image_url)

        const { data: imgs } = await supabase.from('product_images').select('image_url').eq('product_id', product.id)
        if (imgs) {
          for (const img of imgs) await deleteStorageFile(img.image_url)
        }
        await supabase.from('product_images').delete().eq('product_id', product.id)

        await supabase.from('documents').delete()
          .eq('original_id_saas', product.id.toString())
          .eq('user_id', session.user.id)

        const { error: dbError } = await supabase.from('products').delete()
          .eq('id', product.id)
          .eq('user_id', session.user.id)
        if (dbError) throw dbError

        const { error: rpcError } = await supabase.rpc('decrement_product_count', { user_id_to_update: session.user.id })
        if (rpcError) console.error('Error al actualizar capacidad:', rpcError.message)

        Swal.fire({
          icon: 'success', title: 'Eliminado', text: 'Capacidad actualizada.',
          timer: 1500, showConfirmButton: false,
        })

        fetchProducts()
        if (onUpdate) onUpdate()
      } catch (error: any) {
        Swal.fire('Error', 'No se pudo eliminar completamente', 'error')
      } finally {
        setLoading(false)
      }
    }
  }

  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const inputClass = 'w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 text-sm outline-none focus:border-indigo-500'
  const selectClass = 'w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 text-sm outline-none focus:border-indigo-500 appearance-none'

  const opLabel = (v: string) => OPERATION_TYPES.find(o => o.value === v)?.label || v
  const propLabel = (v: string) => PROPERTY_TYPES.find(p => p.value === v)?.label || v
  const statusLabel = (v: string) => PROPERTY_STATUSES.find(s => s.value === v)?.label || v

  return (
    <div className="animate-fade-in space-y-6 pb-10 text-left">
      {/* MODAL EDICIÓN */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 shadow-xl w-full max-w-xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black italic uppercase text-gray-900 mb-6">Editar {labels.product}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="flex flex-col items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-200 text-center">
                <img
                  src={editPreviewUrl ?? editingProduct.image_url}
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                />
                {editPreviewUrl && (
                  <span className="text-[9px] text-green-600 font-bold uppercase">Nueva imagen seleccionada</span>
                )}
                <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp"
                  className="text-[10px] text-gray-500"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setEditPreviewUrl(URL.createObjectURL(f)) }}
                />
              </div>

              <input placeholder={labels.nameLabel} className={inputClass}
                value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} required />
              <input type="number" placeholder={labels.priceLabel} className={inputClass}
                value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} required />

              {/* E-commerce fields */}
              {!isRealEstate && (
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Marca" className={inputClass.replace('w-full ', '')}
                    value={editData.brand} onChange={e => setEditData({ ...editData, brand: e.target.value })} />
                  <input placeholder="Categoría" className={inputClass.replace('w-full ', '')}
                    value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} />
                </div>
              )}

              {/* Real estate fields */}
              {isRealEstate && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <select className={selectClass.replace('w-full ', '')}
                      value={editData.operation_type} onChange={e => setEditData({ ...editData, operation_type: e.target.value })}>
                      <option value="">Tipo Operación</option>
                      {OPERATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className={selectClass.replace('w-full ', '')}
                      value={editData.property_type} onChange={e => setEditData({ ...editData, property_type: e.target.value })}>
                      <option value="">Tipo Propiedad</option>
                      {PROPERTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <input type="number" placeholder="m²" className={inputClass.replace('w-full ', '')}
                      value={editData.area_m2} onChange={e => setEditData({ ...editData, area_m2: e.target.value })} />
                    <input type="number" placeholder="Dorm." className={inputClass.replace('w-full ', '')}
                      value={editData.bedrooms} onChange={e => setEditData({ ...editData, bedrooms: e.target.value })} />
                    <input type="number" placeholder="Baños" className={inputClass.replace('w-full ', '')}
                      value={editData.bathrooms} onChange={e => setEditData({ ...editData, bathrooms: e.target.value })} />
                    <input type="number" placeholder="Est." className={inputClass.replace('w-full ', '')}
                      value={editData.parking_spots} onChange={e => setEditData({ ...editData, parking_spots: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Comuna" className={inputClass.replace('w-full ', '')}
                      value={editData.comuna} onChange={e => setEditData({ ...editData, comuna: e.target.value })} />
                    <input placeholder="Dirección" className={inputClass.replace('w-full ', '')}
                      value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                  </div>
                  <select className={selectClass}
                    value={editData.property_status} onChange={e => setEditData({ ...editData, property_status: e.target.value })}>
                    {PROPERTY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>

                  {/* Galería */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Galería de Fotos</p>
                    <div className="flex flex-wrap gap-2">
                      {gallery.map(img => (
                        <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <img src={img.image_url} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => deleteGalleryImage(img)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center hover:bg-red-400"
                          >✕</button>
                        </div>
                      ))}
                      {newGalleryPreviews.map((url, i) => (
                        <div key={`new-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-green-300">
                          <img src={url} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeNewGallery(i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center"
                          >✕</button>
                        </div>
                      ))}
                      {gallery.length + newGalleryFiles.length < 10 && (
                        <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400">
                          <span className="text-gray-600 text-lg">+</span>
                          <input type="file" className="hidden" onChange={handleGalleryFiles} accept="image/*" multiple />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}

              <textarea placeholder="Descripción" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 text-sm h-24 outline-none focus:border-indigo-500"
                value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setEditingProduct(null); newGalleryPreviews.forEach(u => URL.revokeObjectURL(u)); setNewGalleryFiles([]); setNewGalleryPreviews([]) }}
                  className="flex-1 text-gray-500 font-bold uppercase text-[10px]">Cancelar</button>
                <button type="submit" disabled={uploading}
                  className="flex-1 bg-indigo-600 py-4 rounded-2xl font-black text-[10px] text-white uppercase">{uploading ? 'Guardando...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-[2rem] border border-gray-200 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 italic uppercase tracking-tighter">{labels.inventory}</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {isRealEstate && (
            <>
              <select value={filterOp} onChange={e => setFilterOp(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-[10px] font-black uppercase text-gray-700 outline-none">
                <option value="all">Operación</option>
                {OPERATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={filterPropType} onChange={e => setFilterPropType(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-[10px] font-black uppercase text-gray-700 outline-none">
                <option value="all">Tipo</option>
                {PROPERTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-[10px] font-black uppercase text-gray-700 outline-none">
                <option value="all">Estado</option>
                {PROPERTY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </>
          )}
          <input placeholder={`FILTRAR ${labels.products.toUpperCase()}...`}
            className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl py-2 px-4 text-[10px] font-black uppercase text-gray-700 outline-none focus:border-indigo-500"
            onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-[2rem] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-left">
            <tr>
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase">{labels.product}</th>
              {isRealEstate && <th className="p-5 text-[10px] font-black text-gray-500 uppercase hidden sm:table-cell">Detalles</th>}
              <th className="p-5 text-[10px] font-black text-gray-500 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentItems.map((product) => (
              <tr key={product.id} className="hover:bg-indigo-50 transition-all group">
                <td className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <img src={product.image_url} className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg object-cover" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-gray-900 uppercase">{product.name}</span>
                      {product.activo === false && (
                        <span className="text-[8px] font-black uppercase bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-full px-2 py-0.5">
                          Suspendido
                        </span>
                      )}
                      {isRealEstate && product.operation_type && (
                        <span className={`text-[8px] font-black uppercase rounded-full px-2 py-0.5 ${product.operation_type === 'venta' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
                          {opLabel(product.operation_type)}
                        </span>
                      )}
                      {isRealEstate && product.property_status && product.property_status !== 'disponible' && (
                        <span className="text-[8px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2 py-0.5">
                          {statusLabel(product.property_status)}
                        </span>
                      )}
                    </div>
                    <span className="text-green-500 text-[10px] font-black">${Number(product.price).toLocaleString('es-CL')}</span>
                    {isRealEstate ? (
                      <span className="text-[9px] text-gray-500">
                        {[
                          product.property_type && propLabel(product.property_type),
                          product.area_m2 && `${product.area_m2} m²`,
                          product.comuna,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    ) : (
                      (product.brand || product.category) && (
                        <span className="text-[9px] text-gray-500">
                          {[product.brand, product.category].filter(Boolean).join(' · ')}
                        </span>
                      )
                    )}
                  </div>
                </td>
                {isRealEstate && (
                  <td className="p-4 hidden sm:table-cell">
                    <div className="text-[10px] text-gray-500 space-x-2">
                      {product.bedrooms != null && <span>{product.bedrooms}D</span>}
                      {product.bathrooms != null && <span>{product.bathrooms}B</span>}
                      {product.parking_spots != null && <span>{product.parking_spots}E</span>}
                    </div>
                  </td>
                )}
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => startEdit(product)}
                      disabled={product.activo === false}
                      className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase px-4 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-indigo-50 disabled:hover:text-indigo-600"
                    >Edit</button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase px-4"
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between bg-gray-50">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="text-[10px] font-black text-indigo-600 disabled:opacity-20 uppercase">Anterior</button>
            <span className="text-[10px] text-gray-500 font-black">Pág {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-[10px] font-black text-indigo-600 disabled:opacity-20 uppercase">Siguiente</button>
          </div>
        )}
      </div>
    </div>
  )
}
