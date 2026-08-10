import { useState, useEffect, useCallback } from 'react'
import { Session } from '@supabase/supabase-js'
import Swal from 'sweetalert2'
import { FaInstagram } from 'react-icons/fa'
import { effectivePlan, planCodeToDisplay } from '../utils/planUtils'
import { supabase } from '../supabaseClient'

interface IgPost {
  id: string
  caption?: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  like_count?: number
  permalink?: string
}

interface ClassifiedPost extends IgPost {
  classification: 'product' | 'ad' | 'personal' | 'catalog' | 'other'
  name?: string
  price?: number | null
  description?: string
  brand?: string
  category?: string
}

type Phase = 'idle' | 'scanning' | 'classifying' | 'results' | 'importing' | 'done'

interface Props {
  session: Session
  profile: any
  instance: any
  onProductsImported: () => void
  goToPlans: () => void
}

export default function InstagramScannerView({ session, profile, instance, onProductsImported, goToPlans }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [posts, setPosts] = useState<IgPost[]>([])
  const [classified, setClassified] = useState<ClassifiedPost[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const [pagingCursor, setPagingCursor] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isConnected = !!instance?.provider_id
  const planCode = effectivePlan(profile)
  const currentCount = Number(profile?.current_products) || 0

  const [planLimit, setPlanLimit] = useState<number>(10)

  useEffect(() => {
    if (!planCode) return
    supabase
      .from('plans')
      .select('products_limit')
      .eq('code', planCode)
      .single()
      .then(({ data }) => {
        if (data?.products_limit) setPlanLimit(Number(data.products_limit))
      })
  }, [planCode])

  const remaining = Math.max(planLimit - currentCount, 0)
  const percentage = Math.min((currentCount / planLimit) * 100, 100)
  const isFull = remaining <= 0

  const importedPostIds = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('ig_post_id')
      .eq('user_id', session.user.id)
      .not('ig_post_id', 'is', null)
    return new Set((data || []).map(p => p.ig_post_id))
  }, [session.user.id])

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }), [session.access_token])

  const checkConsent = () => {
    const key = `ig_scan_consent_${session.user.id}`
    if (localStorage.getItem(key)) return true
    return false
  }

  const askConsent = async (): Promise<boolean> => {
    const { isConfirmed } = await Swal.fire({
      title: 'Escanear Instagram',
      html: `
        <p style="color:#9ca3af;font-size:13px;margin-bottom:12px">
          Analizaremos tus publicaciones de Instagram con IA para identificar productos y cargarlos a tu catálogo.
        </p>
        <p style="color:#6b7280;font-size:11px">
          Al continuar, aceptas nuestros <a href="/terms" target="_blank" style="color:#818cf8;text-decoration:underline">Términos de Servicio</a>
          respecto al procesamiento de tus publicaciones.
        </p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Escanear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E1306C',
      background: '#111827',
      color: '#fff',
    })
    if (isConfirmed) {
      localStorage.setItem(`ig_scan_consent_${session.user.id}`, '1')
    }
    return isConfirmed
  }

  const handleScan = async (cursor?: string) => {
    if (!checkConsent()) {
      const ok = await askConsent()
      if (!ok) return
    }

    setError(null)
    setPhase('scanning')

    try {
      let url = `/api/instagram-scanner?action=scan&limit=30`
      if (cursor) url += `&after=${encodeURIComponent(cursor)}`

      const res = await fetch(url, { headers: authHeaders() })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'TOKEN_EXPIRED') {
          setError('Tu conexión de Instagram expiró. Reconecta tu cuenta desde la configuración de Instagram.')
        } else if (res.status === 429) {
          setError(data.message || 'Espera unos minutos antes de escanear de nuevo.')
        } else {
          setError(data.message || 'Error al escanear Instagram')
        }
        setPhase('idle')
        return
      }

      const newPosts: IgPost[] = data.data || []
      const allPosts = cursor ? [...posts, ...newPosts] : newPosts
      setPosts(allPosts)
      setPagingCursor(data.paging?.cursors?.after || null)

      if (newPosts.length === 0 && !cursor) {
        setError('No encontramos publicaciones en tu Instagram.')
        setPhase('idle')
        return
      }

      setPhase('classifying')

      const classifyRes = await fetch('/api/instagram-scanner?action=classify', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ posts: allPosts.map(p => ({ id: p.id, caption: p.caption, media_type: p.media_type, timestamp: p.timestamp, permalink: p.permalink, media_url: p.media_url })) })
      })

      if (!classifyRes.ok) {
        const errData = await classifyRes.json()
        if (classifyRes.status === 429) {
          setError(errData.message || 'Espera unos minutos antes de escanear de nuevo.')
          setPhase('idle')
          return
        }
        throw new Error(errData.message || 'Error al clasificar')
      }

      const classRaw = await classifyRes.json()
      const classResult: any[] = Array.isArray(classRaw) ? classRaw : (classRaw.classified || [])

      const alreadyImported = await importedPostIds()
      const merged = allPosts.map(p => {
        const cl = classResult.find((c: any) => c.ig_post_id === p.id || c.id === p.id)
        const pd = cl?.product_data || cl || {}
        return {
          ...p,
          classification: cl?.classification || 'other' as const,
          name: pd?.name || '',
          price: pd?.price || null,
          description: pd?.description || '',
          brand: pd?.brand || '',
          category: pd?.category || '',
          _imported: alreadyImported.has(p.id)
        }
      }) as (ClassifiedPost & { _imported?: boolean })[]

      setClassified(merged)
      setPhase('results')

    } catch (err: any) {
      console.error('Scan error:', err)
      setError(err.message || 'Error inesperado al escanear')
      setPhase('idle')
    }
  }

  const handleLoadMore = () => {
    if (pagingCursor) handleScan(pagingCursor)
  }

  const toggleSelect = (postId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else if (next.size < remaining) {
        next.add(postId)
      } else {
        Swal.fire({
          title: 'Límite alcanzado',
          text: `Tu plan ${planCodeToDisplay(planCode)} permite ${planLimit} productos. Tienes ${remaining} cupos disponibles.`,
          icon: 'warning',
          confirmButtonText: 'Mejorar Plan',
          showCancelButton: true,
          cancelButtonText: 'Entendido',
          background: '#111827',
          color: '#fff',
          confirmButtonColor: '#D4AF37',
        }).then(r => { if (r.isConfirmed) goToPlans() })
      }
      return next
    })
  }

  const startEdit = (post: ClassifiedPost) => {
    setEditingId(post.id)
    setEditData({
      name: post.name || '',
      price: post.price || '',
      description: post.description || '',
      brand: post.brand || '',
      category: post.category || '',
    })
  }

  const saveEdit = (postId: string) => {
    setClassified(prev => prev.map(p => p.id === postId ? { ...p, ...editData } : p))
    setEditingId(null)
  }

  const handleImport = async () => {
    const toImport = classified
      .filter(p => selected.has(p.id) && !(p as any)._imported)
      .map(p => ({
        igPostId: p.id,
        name: p.name || 'Producto de Instagram',
        price: p.price || 0,
        description: p.description || p.caption || '',
        brand: p.brand || '',
        category: p.category || '',
        media_url: p.media_url || p.thumbnail_url || '',
        permalink: p.permalink || ''
      }))

    if (toImport.length === 0) return

    setPhase('importing')
    setImportProgress(10)

    try {
      const res = await fetch('/api/instagram-scanner?action=import', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ products: toImport })
      })

      setImportProgress(80)

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'LIMIT_EXCEEDED') {
          setError(`Solo tienes ${data.remaining} cupos disponibles.`)
          setPhase('results')
          return
        }
        throw new Error(data.message || 'Error al importar')
      }

      setImportProgress(100)
      setImportResult({ imported: data.imported, skipped: data.skipped || 0 })
      setPhase('done')
      onProductsImported()

    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Error al importar productos')
      setPhase('results')
    }
  }

  const getThumb = (post: IgPost) => post.thumbnail_url || post.media_url || ''

  const productCount = classified.filter(p => p.classification === 'product' && !(p as any)._imported).length

  if (!isConnected) {
    return (
      <div className="animate-fade-in p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(236,72,153,0.3)]">
          <FaInstagram className="text-white text-3xl" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Conecta tu Instagram</h2>
        <p className="text-gray-500 text-sm mb-8 max-w-md">
          Para escanear y cargar productos desde tus publicaciones, primero conecta tu cuenta de Instagram Business.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <FaInstagram className="text-pink-500 text-2xl" />
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase">
            Cargar desde Instagram
          </h1>
        </div>

        <div className="p-4 rounded-2xl w-full md:w-64 border transition-all bg-gray-900 border-gray-800">
          <div className="flex justify-between text-[10px] font-black mb-2 tracking-widest uppercase">
            <span className="text-gray-500">Capacidad</span>
            <span className="text-white">{`${currentCount} / ${planLimit.toLocaleString('es-CL')}`}</span>
          </div>
          <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p>{error}</p>
            {error.includes('expiró') && (
              <button className="mt-2 text-xs text-pink-400 underline hover:text-pink-300">
                Ir a configuración de Instagram
              </button>
            )}
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-gray-500 hover:text-white">✕</button>
        </div>
      )}

      {/* IDLE */}
      {phase === 'idle' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
            <FaInstagram className="text-white text-4xl" />
          </div>
          <h2 className="text-xl font-black text-white mb-3 uppercase">Escanea tu Instagram</h2>
          <p className="text-gray-500 text-sm mb-2 max-w-md">
            Analizaremos tus publicaciones con IA para encontrar productos y cargarlos a tu catálogo automáticamente.
          </p>
          <p className="text-gray-600 text-xs mb-8">
            @{instance?.ig_username || 'tu cuenta'} — {remaining} cupos disponibles
          </p>

          {isFull ? (
            <div className="text-center">
              <p className="text-amber-400 text-sm font-bold mb-4">Tu plan está al máximo de productos.</p>
              <button onClick={goToPlans}
                className="bg-white text-black px-10 py-3 rounded-2xl font-black text-xs uppercase hover:scale-105 transition-all">
                Mejorar mi Plan
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleScan()}
              className="px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Escanear Instagram
            </button>
          )}
        </div>
      )}

      {/* SCANNING */}
      {phase === 'scanning' && (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center animate-pulse">
            <FaInstagram className="text-white text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Escaneando publicaciones...</h3>
          <p className="text-gray-500 text-sm">Leyendo tus publicaciones de Instagram</p>
          <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* CLASSIFYING */}
      {phase === 'classifying' && (
        <div className="py-8">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-white mb-2">Clasificando con IA...</h3>
            <p className="text-gray-500 text-sm">Identificando productos en {posts.length} publicaciones</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
            {posts.map(p => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800">
                <img src={getThumb(p)} alt="" className="w-full h-full object-cover opacity-50" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="px-2 py-1 rounded-lg bg-purple-500/80 text-white text-[10px] font-bold animate-pulse">
                    IA...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && (
        <div className="pb-32">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              {productCount} productos encontrados
            </span>
            <span className="px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-xs font-bold">
              {classified.filter(p => p.classification !== 'product').length} no son productos
            </span>
            {pagingCursor && (
              <button
                onClick={handleLoadMore}
                className="px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold border border-pink-500/30 hover:bg-pink-500/20 transition-colors"
              >
                Cargar más publicaciones
              </button>
            )}
          </div>

          {productCount === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm mb-4">
                No encontramos publicaciones de productos en tus últimas publicaciones.
              </p>
              {pagingCursor && (
                <button onClick={handleLoadMore}
                  className="text-pink-400 text-sm underline hover:text-pink-300">
                  Cargar más publicaciones
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {classified.map(post => {
              const isProduct = post.classification === 'product'
              const isImported = (post as any)._imported
              const isSelected = selected.has(post.id)
              const isEditing = editingId === post.id

              return (
                <div
                  key={post.id}
                  className={`rounded-2xl overflow-hidden border-2 transition-all ${
                    isImported ? 'border-blue-500/50 opacity-60' :
                    isSelected ? 'border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-[1.02]' :
                    isProduct ? 'border-emerald-500/40 hover:border-emerald-400' :
                    'border-gray-800 opacity-40'
                  } bg-gray-900`}
                >
                  {/* Imagen */}
                  <div className="relative aspect-square">
                    <img src={getThumb(post)} alt="" className="w-full h-full object-cover" loading="lazy" />

                    {/* Badge */}
                    {isImported && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-blue-500/90 text-white text-[9px] font-bold">
                        Ya importado
                      </div>
                    )}
                    {!isProduct && !isImported && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="px-2 py-1 rounded-lg bg-gray-700/90 text-gray-300 text-[10px] font-bold capitalize">
                          {post.classification === 'ad' ? 'Publicidad' :
                           post.classification === 'personal' ? 'Personal' :
                           post.classification === 'catalog' ? 'Catálogo' : 'Otro'}
                        </span>
                      </div>
                    )}

                    {/* Checkbox */}
                    {isProduct && !isImported && (
                      <button
                        onClick={() => toggleSelect(post.id)}
                        className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-lg'
                            : 'bg-black/60 text-white hover:bg-black/80 border border-white/20'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  {isProduct && (
                    <div className="p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="Nombre" />
                          <input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="Precio CLP" />
                          <input value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white" placeholder="Categoría" />
                          <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white resize-none" rows={2} placeholder="Descripción" />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(post.id)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30">
                              Guardar
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-bold hover:bg-gray-700">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => !isImported && startEdit(post)} className={!isImported ? 'cursor-pointer' : ''}>
                          <p className="text-white text-xs font-bold truncate">{post.name || 'Sin nombre'}</p>
                          {post.price ? (
                            <p className="text-amber-400 text-xs font-black">${Number(post.price).toLocaleString('es-CL')}</p>
                          ) : (
                            <p className="text-gray-600 text-[10px] italic">Sin precio detectado</p>
                          )}
                          {post.category && (
                            <p className="text-gray-500 text-[10px] mt-0.5 truncate">{post.category}</p>
                          )}
                          {!isImported && (
                            <p className="text-gray-700 text-[9px] mt-1">Toca para editar</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Barra fija inferior */}
          {selected.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-amber-500/30 p-4 z-50">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-bold">
                    {selected.size} producto{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
                  </p>
                  <p className="text-gray-500 text-xs">{remaining - selected.size} cupos restantes después de importar</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelected(new Set())}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors">
                    Limpiar
                  </button>
                  <button onClick={handleImport}
                    className="px-8 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Importar desde Instagram
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMPORTING */}
      {phase === 'importing' && (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <span className="text-2xl animate-bounce">📦</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Importando productos...</h3>
          <p className="text-gray-500 text-sm mb-6">Descargando imágenes y creando productos en tu catálogo</p>
          <div className="max-w-sm mx-auto h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 rounded-full"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && importResult && (
        <div className="py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-2xl font-black text-white mb-3 uppercase">Productos importados</h3>
          <p className="text-gray-400 text-sm mb-2">
            Se importaron <span className="text-emerald-400 font-bold">{importResult.imported}</span> producto{importResult.imported > 1 ? 's' : ''} desde Instagram.
          </p>
          {importResult.skipped > 0 && (
            <p className="text-gray-600 text-xs mb-6">
              {importResult.skipped} ya estaban importados anteriormente.
            </p>
          )}
          <p className="text-gray-500 text-xs mb-8">
            Tu bot aprenderá los nuevos productos en los próximos 30 minutos.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { setPhase('idle'); setClassified([]); setSelected(new Set()); setImportResult(null) }}
              className="px-8 py-3 rounded-2xl font-bold text-sm text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-all"
            >
              Escanear de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
