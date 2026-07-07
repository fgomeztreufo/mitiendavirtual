import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'

interface WhatsAppMessagesViewProps {
  session: Session
}

interface WppMessage {
  id: string
  contact_phone: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  sender_type?: 'ai' | 'human'
}

interface Conversation {
  contact_phone: string
  last_message: string
  last_at: string
  unread: number
}

const PAGE_SIZE = 50

export default function WhatsAppMessagesView({ session }: WhatsAppMessagesViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [messages, setMessages] = useState<WppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [hasActiveConnection, setHasActiveConnection] = useState<boolean | null>(null)
  const [blockedPhones, setBlockedPhones] = useState<Set<string>>(new Set())
  const [togglingBlock, setTogglingBlock] = useState(false)
  const [daysFilter, setDaysFilter] = useState(3)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = useMemo(() => {
    let filtered = conversations
    if (daysFilter > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - daysFilter)
      cutoff.setHours(0, 0, 0, 0)
      filtered = filtered.filter(c => new Date(c.last_at) >= cutoff)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(c =>
        c.contact_phone.includes(q) || c.last_message.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [conversations, daysFilter, searchQuery])

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('get_whatsapp_conversations', { p_user_id: session.user.id })

      if (error) {
        const { data: fallbackData } = await supabase
          .from('whatsapp_messages')
          .select('contact_phone, body, created_at, direction')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (fallbackData) {
          const grouped = new Map<string, Conversation>()
          for (const msg of fallbackData) {
            if (!grouped.has(msg.contact_phone)) {
              grouped.set(msg.contact_phone, {
                contact_phone: msg.contact_phone,
                last_message: msg.body || '',
                last_at: msg.created_at,
                unread: 0
              })
            }
          }
          setConversations(Array.from(grouped.values()))
        }
      } else if (data) {
        setConversations(data)
      }
    } catch (_) { /* silent */ }
    finally { setLoading(false) }
  }, [session.user.id])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const fetchBlocked = useCallback(async () => {
    const { data } = await supabase
      .from('blocked_contacts')
      .select('contact_phone')
      .eq('user_id', session.user.id)
      .eq('channel', 'whatsapp')
    setBlockedPhones(new Set((data || []).map(r => r.contact_phone)))
  }, [session.user.id])

  useEffect(() => { fetchBlocked() }, [fetchBlocked])

  const toggleBlock = useCallback(async (phone: string) => {
    setTogglingBlock(true)
    try {
      const isBlocked = blockedPhones.has(phone)
      if (isBlocked) {
        await supabase
          .from('blocked_contacts')
          .delete()
          .eq('user_id', session.user.id)
          .eq('contact_phone', phone)
          .eq('channel', 'whatsapp')
      } else {
        await supabase
          .from('blocked_contacts')
          .insert({ user_id: session.user.id, contact_phone: phone, channel: 'whatsapp', reason: 'Bloqueado desde bandeja' })
      }
      await fetchBlocked()
    } catch (_) { /* silent */ }
    finally { setTogglingBlock(false) }
  }, [session.user.id, blockedPhones, fetchBlocked])

  useEffect(() => {
    async function checkConnection() {
      const { data } = await supabase
        .from('whatsapp_connections')
        .select('id, active')
        .eq('user_id', session.user.id)
        .eq('active', true)
        .limit(1)
      setHasActiveConnection(data != null && data.length > 0)
    }
    checkConnection()
  }, [session.user.id])

  const fetchMessages = useCallback(async (contact: string, fromOffset = 0) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, contact_phone, direction, body, created_at, sender_type')
        .eq('user_id', session.user.id)
        .eq('contact_phone', contact)
        .order('created_at', { ascending: false })
        .range(fromOffset, fromOffset + PAGE_SIZE - 1)

      if (!error && data) {
        const sorted = [...data].reverse()
        if (fromOffset === 0) {
          setMessages(sorted)
        } else {
          setMessages(prev => [...sorted, ...prev])
        }
        setHasMore(data.length === PAGE_SIZE)
        setOffset(fromOffset + data.length)
      }
    } catch (_) { /* silent */ }
    finally { setLoadingMessages(false) }
  }, [session.user.id])

  useEffect(() => {
    if (selectedContact) {
      setOffset(0)
      setMessages([])
      fetchMessages(selectedContact, 0)
    }
  }, [selectedContact, fetchMessages])

  useEffect(() => {
    if (messages.length > 0 && offset <= PAGE_SIZE) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, offset])

  const selectedContactRef = useRef<string | null>(null)
  useEffect(() => { selectedContactRef.current = selectedContact }, [selectedContact])

  // Realtime subscription — always active, not dependent on selected contact
  useEffect(() => {
    const channel = supabase
      .channel('wpp-inbox-' + session.user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          const newMsg = payload.new as WppMessage
          if (newMsg.contact_phone === selectedContactRef.current) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev.filter(m => !m.id.startsWith('optimistic-')), newMsg]
            })
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
          fetchConversations()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.user.id, fetchConversations])

  const handleSend = useCallback(async () => {
    if (!selectedContact || !newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setSending(true)
    setSendError(null)

    const optimisticId = 'optimistic-' + Date.now()
    const optimisticMsg: WppMessage = {
      id: optimisticId,
      contact_phone: selectedContact,
      direction: 'outbound',
      body: messageText,
      created_at: new Date().toISOString(),
      sender_type: 'human'
    }
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        setSendError('Sesión expirada.')
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        return
      }

      const res = await fetch('/api/whatsapp-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ contact_phone: selectedContact, message: messageText })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Error al enviar mensaje.')
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo enviar el mensaje.'
      setSendError(errorMsg)
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setNewMessage(messageText)
    } finally {
      setSending(false)
    }
  }, [selectedContact, newMessage, sending])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-widest uppercase">Cargando conversaciones</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Bandeja WhatsApp</h2>
        <p className="text-gray-400 text-sm">Gestiona las conversaciones de tu asistente IA en tiempo real.</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#25D366]/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aun no hay conversaciones registradas.</p>
          <p className="text-gray-600 text-xs">Los mensajes apareceran aqui cuando tu bot comience a responder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
          {/* Conversation List */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase">
                  Conversaciones ({filteredConversations.length})
                </p>
                <select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(Number(e.target.value))}
                  className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-gray-400 focus:outline-none focus:border-[#25D366]/50 cursor-pointer"
                >
                  <option value={1}>Hoy</option>
                  <option value={3}>3 dias</option>
                  <option value={7}>7 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={0}>Todos</option>
                </select>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por telefono o mensaje..."
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-gray-600">No hay conversaciones en este periodo.</p>
                  <button
                    onClick={() => { setDaysFilter(0); setSearchQuery('') }}
                    className="text-[10px] text-[#25D366] mt-2 hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
              ) : null}
              {filteredConversations.map(conv => (
                <button
                  key={conv.contact_phone}
                  onClick={() => setSelectedContact(conv.contact_phone)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/[0.03] ${
                    selectedContact === conv.contact_phone ? 'bg-[#25D366]/10 border-l-2 border-l-[#25D366]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-mono ${blockedPhones.has(conv.contact_phone) ? 'text-red-400/60 line-through' : 'text-white'}`}>
                      {conv.contact_phone}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {blockedPhones.has(conv.contact_phone) && (
                        <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">BLOQ</span>
                      )}
                      <span className="text-[10px] text-gray-600">{formatDate(conv.last_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{conv.last_message}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Message Thread */}
          <div className="md:col-span-8 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col">
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600 text-sm">Selecciona una conversación</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${blockedPhones.has(selectedContact) ? 'bg-red-500/20' : 'bg-[#25D366]/20'}`}>
                      <span className={`text-xs font-bold ${blockedPhones.has(selectedContact) ? 'text-red-400' : 'text-[#25D366]'}`}>
                        {selectedContact.slice(-2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-mono">{selectedContact}</p>
                      <p className={`text-[10px] uppercase tracking-widest ${
                        blockedPhones.has(selectedContact) ? 'text-red-400' :
                        hasActiveConnection ? 'text-[#25D366]' : 'text-gray-500'
                      }`}>
                        {blockedPhones.has(selectedContact) ? 'Bloqueado' :
                         hasActiveConnection ? 'Conectado' : 'Sin conexión activa'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBlock(selectedContact)}
                    disabled={togglingBlock}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                      blockedPhones.has(selectedContact)
                        ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    {togglingBlock ? '...' : blockedPhones.has(selectedContact) ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {hasMore && (
                    <button
                      onClick={() => fetchMessages(selectedContact, offset)}
                      disabled={loadingMessages}
                      className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      {loadingMessages ? 'Cargando...' : 'Cargar mensajes anteriores'}
                    </button>
                  )}

                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.direction === 'outbound'
                            ? 'bg-[#25D366]/20 border border-[#25D366]/30 rounded-br-md'
                            : 'bg-white/[0.06] border border-white/10 rounded-bl-md'
                        }`}
                      >
                        <p className={`text-sm ${msg.direction === 'outbound' ? 'text-[#25D366]' : 'text-gray-300'}`}>
                          {msg.body}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                          <span className="text-[10px] text-gray-600">{formatTime(msg.created_at)}</span>
                          {msg.direction === 'outbound' && (
                            <span className={`text-[10px] ${msg.sender_type === 'human' ? 'text-blue-400/60' : 'text-[#25D366]/60'}`}>
                              {msg.sender_type === 'human' ? 'Tú' : 'IA'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-white/5">
                  {blockedPhones.has(selectedContact) ? (
                    <p className="text-[10px] text-red-400/60 italic text-center">
                      Este contacto está bloqueado. Tu asistente IA no responderá sus mensajes.
                    </p>
                  ) : !hasActiveConnection ? (
                    <p className="text-[10px] text-gray-600 italic text-center">
                      Conecta tu WhatsApp Business para enviar mensajes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sendError && (
                        <p className="text-[10px] text-red-400 px-1">{sendError}</p>
                      )}
                      <div className="flex items-end gap-2">
                        <textarea
                          value={newMessage}
                          onChange={(e) => { setNewMessage(e.target.value); setSendError(null) }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSend()
                            }
                          }}
                          placeholder="Escribe un mensaje..."
                          disabled={sending}
                          rows={1}
                          className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#25D366]/50 disabled:opacity-40"
                          style={{ maxHeight: '120px' }}
                        />
                        <button
                          onClick={handleSend}
                          disabled={sending || !newMessage.trim()}
                          className="p-2.5 rounded-xl bg-[#25D366] hover:bg-[#1da851] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                        >
                          {sending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-700 italic text-center">
                        Al responder, tu asistente IA seguirá activo en esta conversación.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
