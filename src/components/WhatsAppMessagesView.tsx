import { useState, useEffect, useCallback, useRef } from 'react'
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

  const fetchMessages = useCallback(async (contact: string, fromOffset = 0) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, contact_phone, direction, body, created_at')
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

  // Realtime subscription
  useEffect(() => {
    if (!selectedContact) return

    const channel = supabase
      .channel('wpp-messages-' + selectedContact)
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
          if (newMsg.contact_phone === selectedContact) {
            setMessages(prev => [...prev, newMsg])
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
          fetchConversations()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedContact, session.user.id, fetchConversations])

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
        <h2 className="text-2xl font-bold text-white">Visor WhatsApp</h2>
        <p className="text-gray-400 text-sm">Audita las conversaciones de tu asistente IA en tiempo real (solo lectura).</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#25D366]/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aún no hay conversaciones registradas.</p>
          <p className="text-gray-600 text-xs">Los mensajes aparecerán aquí cuando tu bot comience a responder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
          {/* Conversation List */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase text-center">
                Conversaciones ({conversations.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => (
                <button
                  key={conv.contact_phone}
                  onClick={() => setSelectedContact(conv.contact_phone)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-all hover:bg-white/[0.03] ${
                    selectedContact === conv.contact_phone ? 'bg-[#25D366]/10 border-l-2 border-l-[#25D366]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-mono">{conv.contact_phone}</span>
                    <span className="text-[10px] text-gray-600">{formatDate(conv.last_at)}</span>
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
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                    <span className="text-xs text-[#25D366] font-bold">
                      {selectedContact.slice(-2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">{selectedContact}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Solo lectura</p>
                  </div>
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
                            <span className="text-[10px] text-[#25D366]/60">IA</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-white/5 text-center">
                  <p className="text-[10px] text-gray-600 italic">
                    Este visor es de solo lectura. No puedes enviar mensajes desde aquí.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
