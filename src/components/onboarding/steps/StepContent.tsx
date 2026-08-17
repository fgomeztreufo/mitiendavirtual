import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaInstagram } from 'react-icons/fa'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

interface StepContentProps {
  session: any
  instance?: any
  profile?: any
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

export default function StepContent({ session, instance, profile, onNext, onSkip, onBack }: StepContentProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'scan'>('choose')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')
  const [scanDone, setScanDone] = useState(false)

  const igConnected = !!instance?.provider_id
  const scanEnabled = igConnected

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0]
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError('Solo se permiten imagenes JPG, PNG o WebP.')
        e.target.value = ''
        return
      }
      if (f.size > MAX_FILE_SIZE) {
        setError('La imagen no puede superar los 10 MB.')
        e.target.value = ''
        return
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!name.trim() || !price.trim() || !file) {
      setError('Completa nombre, precio y foto del producto.')
      return
    }

    setUploading(true)
    setError('')

    try {
      const data = new FormData()
      data.append('user_id', session.user.id)
      data.append('name', name.trim())
      data.append('price', price)
      data.append('description', `${name.trim()}${description ? `. ${description.trim()}` : ''} - $${Number(price).toLocaleString('es-CL')} CLP`)
      data.append('brand', '')
      data.append('category', '')
      data.append('foto', file)

      const res = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://webhook.mitiendavirtual.cl'}/webhook/subir-productos`, {
        method: 'POST',
        body: data,
      })

      if (!res.ok) throw new Error('Error al subir el producto')
      setUploaded(true)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center min-h-[70vh] px-6 max-w-lg mx-auto py-8"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
        Carga tus productos o servicios
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Tu bot necesita conocer lo que ofreces para poder venderlo. Puedes agregar mas despues.
      </p>

      {(uploaded || scanDone) ? (
        <div className="w-full max-w-xs space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold text-emerald-600">
              {scanDone ? 'Productos cargados desde Instagram' : 'Producto subido'}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Tu bot los aprendera en los proximos minutos.</p>
          </div>
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar
          </button>
        </div>
      ) : mode === 'choose' ? (
        <div className="w-full space-y-4">
          {/* Opción 1: Manual */}
          <button
            onClick={() => setMode('manual')}
            className="w-full p-5 rounded-2xl border border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50 shadow-sm transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm group-hover:text-amber-600 transition-colors">1 producto de prueba</p>
                <p className="text-gray-500 text-xs mt-0.5">Sube un producto manualmente con foto</p>
              </div>
            </div>
          </button>

          {/* Opción 2: Scan Instagram */}
          <button
            onClick={() => scanEnabled ? setMode('scan') : undefined}
            disabled={!scanEnabled}
            className={`w-full p-5 rounded-2xl border transition-all text-left group ${
              scanEnabled
                ? 'border-gray-200 bg-white hover:border-pink-400 hover:bg-pink-50 shadow-sm'
                : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500">
                <FaInstagram className="text-white text-xl" />
              </div>
              <div>
                <p className="font-bold text-sm transition-colors text-gray-900 group-hover:text-pink-600">
                  Escanear tu Instagram
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {scanEnabled
                    ? 'Carga productos y servicios desde tus publicaciones'
                    : 'Conecta tu Instagram primero para escanear'}
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : mode === 'scan' ? (
        <div className="w-full text-center space-y-4">
          <div className="p-6 rounded-2xl bg-pink-50 border border-pink-200">
            <FaInstagram className="text-pink-500 text-3xl mx-auto mb-3" />
            <p className="text-gray-900 text-sm font-bold mb-2">Escaneo de Instagram</p>
            <p className="text-gray-500 text-xs mb-4">
              Podrás escanear y seleccionar productos desde tu Instagram en el Dashboard.
            </p>
            <button
              onClick={() => { setScanDone(true) }}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Continuar al Dashboard para escanear
            </button>
          </div>
          <button onClick={() => setMode('choose')} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Volver a elegir
          </button>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
              Nombre del producto
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Polera negra premium"
              className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
              Precio (CLP)
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Ej: 15990"
              className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
              Descripcion <span className="text-gray-700">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Algodon 100%, tallas S a XL"
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
              Foto del producto
            </label>
            {previewUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100/90 text-gray-600 text-xs flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                >
                  X
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors">
                <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="text-xs text-gray-500">Toca para subir foto</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-50 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {uploading ? 'Subiendo...' : 'Subir producto'}
          </button>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        {mode !== 'choose' && !uploaded && !scanDone && (
          <button onClick={() => setMode('choose')} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Volver
          </button>
        )}
        {mode === 'choose' && (
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Volver
          </button>
        )}
        {!uploaded && !scanDone && (
          <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Omitir por ahora
          </button>
        )}
      </div>
    </motion.div>
  )
}
