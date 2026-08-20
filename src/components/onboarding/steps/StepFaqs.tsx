import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../../supabaseClient'
import { sanitizeInstructions, looksMalicious } from '../../../utils/sanitizeInstructions'

interface StepFaqsProps {
  session: any
  profile?: any
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

interface FaqItem {
  id: string
  question: string
  answer: string
  enabled: boolean
}

// Sugerencias precargadas por tipo de negocio. La respuesta viene vacía para
// forzar que el dueño la complete con su información real.
const SUGGESTIONS_BY_TYPE: Record<string, { q: string; a: string }[]> = {
  ecommerce: [
    { q: '¿Cuáles son los horarios de atención?', a: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs.' },
    { q: '¿Hacen envíos a regiones?', a: 'Sí, enviamos a todo Chile vía Starken y Chilexpress.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos tarjetas de crédito, débito y transferencia.' },
    { q: '¿Tienen tienda física?', a: '' },
    { q: '¿Cómo gestiono un cambio o devolución?', a: '' },
  ],
  inmobiliaria: [
    { q: '¿En qué comunas tienen propiedades?', a: '' },
    { q: '¿Cómo agendo una visita?', a: 'Coordinamos la visita por este mismo chat según disponibilidad.' },
    { q: '¿Trabajan arriendo, venta o ambos?', a: '' },
    { q: '¿Qué documentos necesito para arrendar?', a: '' },
    { q: '¿Cobran comisión de corretaje?', a: '' },
  ],
  clinica: [
    { q: '¿Cuáles son los horarios de atención?', a: 'Atendemos de lunes a viernes de 9:00 a 18:00 hrs.' },
    { q: '¿Cómo agendo una hora?', a: 'Puedes agendar directamente por este chat.' },
    { q: '¿Atienden por convenio o isapre/fonasa?', a: '' },
    { q: '¿Dónde están ubicados?', a: '' },
    { q: '¿Qué debo llevar a mi primera consulta?', a: '' },
  ],
  servicios: [
    { q: '¿Cuáles son los horarios de atención?', a: 'Atendemos de lunes a sábado de 10:00 a 20:00 hrs.' },
    { q: '¿Cómo reservo una hora?', a: 'Puedes reservar directamente por este chat.' },
    { q: '¿Dónde están ubicados?', a: '' },
    { q: '¿Qué servicios ofrecen y a qué precio?', a: '' },
    { q: '¿Aceptan pago con tarjeta?', a: '' },
  ],
  restaurant: [
    { q: '¿Cuál es el horario de atención?', a: 'Atendemos todos los días de 12:00 a 23:00 hrs.' },
    { q: '¿Hacen delivery?', a: '' },
    { q: '¿Se puede reservar mesa?', a: '' },
    { q: '¿Tienen opciones vegetarianas / sin gluten?', a: '' },
    { q: '¿Qué métodos de pago aceptan?', a: '' },
  ],
}

function suggestionsFor(businessType?: string) {
  return SUGGESTIONS_BY_TYPE[businessType || 'ecommerce'] || SUGGESTIONS_BY_TYPE.ecommerce
}

let idCounter = 0
const nextId = () => `faq_${++idCounter}`

export default function StepFaqs({ session, profile, onNext, onSkip, onBack }: StepFaqsProps) {
  const [items, setItems] = useState<FaqItem[]>(() =>
    suggestionsFor(profile?.business_type).map(s => ({
      id: nextId(),
      question: s.q,
      answer: s.a,
      enabled: true,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const updateItem = (id: string, patch: Partial<FaqItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  const addItem = () => {
    setItems(prev => [...prev, { id: nextId(), question: '', answer: '', enabled: true }])
  }

  const handleSave = async () => {
    setError('')

    // Solo se cargan las preguntas activas con pregunta + respuesta completas.
    const ready = items.filter(it => it.enabled && it.question.trim() && it.answer.trim())

    if (ready.length === 0) {
      setError('Completa al menos una pregunta con su respuesta, o toca "Omitir por ahora".')
      return
    }

    // Bloqueo de inyección de instrucciones (mismo criterio que personalidad).
    if (ready.some(it => looksMalicious(it.question) || looksMalicious(it.answer))) {
      setError('Se detectaron instrucciones no permitidas en alguna respuesta.')
      return
    }

    setSaving(true)
    try {
      // Inserción directa en la tabla `faqs` (RLS: auth.uid() = user_id).
      const rows = ready.map(it => ({
        user_id: session.user.id,
        question: sanitizeInstructions(it.question).trim().slice(0, 300),
        answer: sanitizeInstructions(it.answer).trim().slice(0, 800),
        category: 'general',
        is_active: true,
      }))

      const { error: insertError } = await supabase.from('faqs').insert(rows)
      if (insertError) throw insertError

      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Error al cargar las preguntas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center min-h-[70vh] px-6 max-w-lg mx-auto py-8"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(14,165,233,0.3)]">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
        Preguntas frecuentes
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Enséñale a tu bot a responder lo que más te preguntan. Editamos algunas por ti según tu rubro.
      </p>

      {saved ? (
        <div className="w-full max-w-xs space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <svg className="w-8 h-8 text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold text-emerald-600">Preguntas cargadas</p>
            <p className="text-xs text-emerald-600 mt-1">Tu bot las aprenderá en los próximos minutos.</p>
          </div>
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar
          </button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {items.map((it, idx) => (
            <div
              key={it.id}
              className={`rounded-2xl border p-4 transition-all ${
                it.enabled ? 'border-gray-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateItem(it.id, { enabled: !it.enabled })}
                  title={it.enabled ? 'Desactivar' : 'Activar'}
                  className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
                    it.enabled ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'
                  }`}
                >
                  {it.enabled && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 space-y-2">
                  <input
                    value={it.question}
                    onChange={e => updateItem(it.id, { question: e.target.value })}
                    placeholder="Escribe una pregunta"
                    maxLength={300}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-gray-900 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                  />
                  <textarea
                    value={it.answer}
                    onChange={e => updateItem(it.id, { answer: e.target.value })}
                    placeholder="Escribe la respuesta que dará tu bot"
                    maxLength={800}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-gray-700 text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={() => removeItem(it.id)}
                  title="Eliminar"
                  className="mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-semibold hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar pregunta
          </button>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-50 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {saving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Volver
        </button>
        {!saved && (
          <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Omitir por ahora
          </button>
        )}
      </div>
    </motion.div>
  )
}
