import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../../supabaseClient'
import { sanitizeInstructions, looksMalicious } from '../../../utils/sanitizeInstructions'

const TONE_OPTIONS = [
  { value: 'amigable', label: 'Amigable', emoji: '😊' },
  { value: 'formal', label: 'Formal', emoji: '👔' },
  { value: 'casual', label: 'Casual', emoji: '✌️' },
  { value: 'profesional', label: 'Profesional', emoji: '💼' },
]

interface StepPersonalityProps {
  instance: any
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

export default function StepPersonality({ instance, onNext, onSkip, onBack }: StepPersonalityProps) {
  const [name, setName] = useState('')
  const [tone, setTone] = useState('amigable')
  const [greeting, setGreeting] = useState('')
  const [rules, setRules] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!instance?.id || loaded) return
    ;(async () => {
      const { data } = await supabase
        .from('agent_prompts')
        .select('personality_config')
        .eq('instance_id', instance.id)
        .eq('channel', 'instagram')
        .limit(1)
        .maybeSingle()
      const cfg = data?.personality_config
      if (cfg) {
        if (cfg.ai_name) setName(cfg.ai_name)
        if (cfg.tone) setTone(cfg.tone)
        if (cfg.greeting) setGreeting(cfg.greeting)
        if (cfg.business_rules) setRules(cfg.business_rules)
      }
      setLoaded(true)
    })()
  }, [instance?.id, loaded])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Dale un nombre a tu agente')
      return
    }
    if (looksMalicious(rules) || looksMalicious(greeting)) {
      setError('Se detectaron instrucciones no permitidas.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const config = {
        ai_name: name.trim().slice(0, 50),
        tone,
        greeting: sanitizeInstructions(greeting).slice(0, 300),
        business_rules: sanitizeInstructions(rules).slice(0, 500),
      }

      const toneLabel = TONE_OPTIONS.find(t => t.value === tone)?.label || tone
      const parts: string[] = []
      parts.push(`Te llamas ${config.ai_name}.`)
      parts.push(`Eres un asistente virtual de ventas con tono ${toneLabel.toLowerCase()} para el canal Instagram.`)
      if (config.greeting) parts.push(`Cuando un cliente te escriba por primera vez, salúdalo así: "${config.greeting}"`)
      if (config.business_rules) parts.push(`Reglas de negocio que debes seguir siempre:\n${config.business_rules}`)
      const systemPrompt = parts.join('\n\n')

      const { error: rpcError } = await supabase.rpc('upsert_agent_personality', {
        p_instance_id: instance.id,
        p_channel: 'instagram',
        p_config: config,
        p_system_prompt: systemPrompt,
      })

      if (rpcError) throw rpcError
      onNext()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
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
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
        Personaliza tu agente
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        Dale nombre y personalidad a tu asistente de ventas
      </p>

      <div className="w-full space-y-5">
        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
            Nombre del agente
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Luna, Max, Vendedor IA..."
            maxLength={50}
            className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
            Tono de comunicacion
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTone(opt.value)}
                className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                  tone === opt.value
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-gray-900'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
            Saludo inicial <span className="text-gray-700">(opcional)</span>
          </label>
          <input
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            placeholder="Ej: Hola! Soy Luna, tu asistente de ventas"
            maxLength={300}
            className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
            Reglas de negocio <span className="text-gray-700">(opcional)</span>
          </label>
          <textarea
            value={rules}
            onChange={e => setRules(e.target.value)}
            placeholder="Ej: Solo vendemos en Chile. Envios gratis sobre $30.000."
            maxLength={500}
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-gray-900 text-sm outline-none focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-50 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>

      <div className="flex gap-4 mt-4">
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Volver
        </button>
        <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Omitir por ahora
        </button>
      </div>
    </motion.div>
  )
}
