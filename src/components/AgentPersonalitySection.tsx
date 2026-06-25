import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { sanitizeInstructions, looksMalicious } from '../utils/sanitizeInstructions'
import Swal from 'sweetalert2'

interface PersonalityConfig {
  ai_name: string
  tone: string
  greeting: string
  business_rules: string
}

interface AgentPersonalitySectionProps {
  instanceId: string
  channel: 'instagram' | 'telegram' | 'whatsapp'
  channelColor: string
}

const TONE_OPTIONS = [
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'profesional', label: 'Profesional' },
]

const CHANNEL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

const DEFAULT_CONFIG: PersonalityConfig = {
  ai_name: '',
  tone: 'amigable',
  greeting: '',
  business_rules: '',
}

function buildSystemPrompt(config: PersonalityConfig, channel: string): string {
  const parts: string[] = []

  if (config.ai_name) {
    parts.push(`Te llamas ${config.ai_name}.`)
  }

  const toneLabel = TONE_OPTIONS.find(t => t.value === config.tone)?.label || config.tone
  parts.push(`Eres un asistente virtual de ventas con tono ${toneLabel.toLowerCase()} para el canal ${CHANNEL_LABELS[channel] || channel}.`)

  if (config.greeting) {
    parts.push(`Cuando un cliente te escriba por primera vez, salúdalo así: "${config.greeting}"`)
  }

  if (config.business_rules) {
    parts.push(`Reglas de negocio que debes seguir siempre:\n${config.business_rules}`)
  }

  return parts.join('\n\n')
}

export default function AgentPersonalitySection({ instanceId, channel, channelColor }: AgentPersonalitySectionProps) {
  const [config, setConfig] = useState<PersonalityConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [savedConfig, setSavedConfig] = useState<PersonalityConfig>(DEFAULT_CONFIG)

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agent_prompts')
        .select('personality_config')
        .eq('instance_id', instanceId)
        .eq('channel', channel)
        .eq('is_active', true)
        .maybeSingle()

      const hasConfig = !error && data?.personality_config &&
        Object.keys(data.personality_config as object).length > 0

      if (hasConfig) {
        const loaded = {
          ...DEFAULT_CONFIG,
          ...(data.personality_config as Partial<PersonalityConfig>),
        }
        setConfig(loaded)
        setSavedConfig(loaded)
      } else {
        const { data: legacy } = await supabase
          .from('instance_personalities')
          .select('ai_name, biz_name')
          .eq('instance_id', instanceId)
          .maybeSingle()

        if (legacy) {
          const preloaded = {
            ...DEFAULT_CONFIG,
            ai_name: legacy.ai_name || legacy.biz_name || '',
          }
          setConfig(preloaded)
          setSavedConfig(preloaded)
        }
      }
    } catch (_) { /* silent */ }
    finally { setLoading(false) }
  }, [instanceId, channel])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(savedConfig))
  }, [config, savedConfig])

  const handleSave = async () => {
    if (looksMalicious(config.business_rules) || looksMalicious(config.greeting)) {
      Swal.fire('Contenido no permitido', 'Se detectaron instrucciones potencialmente peligrosas.', 'error')
      return
    }

    setSaving(true)
    try {
      const sanitizedConfig: PersonalityConfig = {
        ai_name: config.ai_name.trim().slice(0, 50),
        tone: config.tone,
        greeting: sanitizeInstructions(config.greeting).slice(0, 300),
        business_rules: sanitizeInstructions(config.business_rules).slice(0, 500),
      }

      const systemPrompt = buildSystemPrompt(sanitizedConfig, channel)

      const { error } = await supabase.rpc('upsert_agent_personality', {
        p_instance_id: instanceId,
        p_channel: channel,
        p_config: sanitizedConfig,
        p_system_prompt: systemPrompt,
      })

      if (error) throw error

      setConfig(sanitizedConfig)
      setSavedConfig(sanitizedConfig)
      setHasChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Personalidad guardada',
        text: `Tu agente de ${CHANNEL_LABELS[channel]} usará esta configuración en los próximos mensajes.`,
        background: '#111827',
        color: '#fff',
        timer: 2500,
        showConfirmButton: false,
      })
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo guardar la personalidad.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Cargando personalidad...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
      <div className={`px-6 py-4 border-b border-white/5 bg-gradient-to-r ${channelColor} bg-opacity-10`}>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Personalidad del Agente
        </h3>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Configura cómo se comporta tu asistente IA en {CHANNEL_LABELS[channel]}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Nombre del agente
            </label>
            <input
              className="bg-black border border-gray-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all"
              value={config.ai_name}
              onChange={e => setConfig({ ...config, ai_name: e.target.value })}
              placeholder="Ej: Sofía, Carlos, Asistente"
              maxLength={50}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Tono
            </label>
            <select
              className="bg-black border border-gray-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all appearance-none"
              value={config.tone}
              onChange={e => setConfig({ ...config, tone: e.target.value })}
            >
              {TONE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Saludo personalizado
          </label>
          <input
            className="bg-black border border-gray-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all"
            value={config.greeting}
            onChange={e => setConfig({ ...config, greeting: e.target.value })}
            placeholder="Ej: ¡Hola! Bienvenido a nuestra tienda, ¿en qué te puedo ayudar?"
            maxLength={300}
          />
          <span className="text-[9px] text-gray-600 text-right">{config.greeting.length}/300</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Reglas de negocio
          </label>
          <textarea
            className="bg-black border border-gray-800 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all h-24 resize-none"
            value={config.business_rules}
            onChange={e => setConfig({ ...config, business_rules: e.target.value })}
            placeholder={"Ej:\n- No ofrecer descuentos sin autorización\n- Siempre recomendar envío express\n- Responder solo en español"}
            maxLength={500}
          />
          <span className="text-[9px] text-gray-600 text-right">{config.business_rules.length}/500</span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
            hasChanges
              ? 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.01]'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {saving ? 'Guardando...' : hasChanges ? 'Guardar Personalidad' : 'Sin cambios'}
        </button>
      </div>
    </div>
  )
}
