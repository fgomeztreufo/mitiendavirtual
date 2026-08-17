import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { Session } from '@supabase/supabase-js'

interface InstagramMessagesViewProps {
  session: Session
}

interface IgMessage {
  id: string
  contact_ig_id: string
  contact_name: string | null
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  sender_type?: 'ai' | 'human'
}

interface IgConversation {
  contact_ig_id: string
  contact_name: string | null
  last_message: string
  last_at: string
  unread: number
}

type DateItem = { type: 'date'; label: string }
type MsgItem = { type: 'message'; msg: IgMessage }

type InternalTab = 'inbox' | 'reengage'

interface BulkResult {
  contact_ig_id: string
  ok: boolean
  error?: string
}

const PAGE_SIZE = 50
const IG_PINK = '#E1306C'

function sortByTime(msgs: IgMessage[]): IgMessage[] {
  return msgs.sort((a, b) => {
    if (a.id.startsWith('optimistic-')) return 1
    if (b.id.startsWith('optimistic-')) return -1
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (timeDiff !== 0) return timeDiff
    const idA = Number(a.id)
    const idB = Number(b.id)
    if (!isNaN(idA) && !isNaN(idB)) return idA - idB
    return a.id.localeCompare(b.id)
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function displayName(conv: { contact_ig_id: string; contact_name: string | null }) {
  return conv.contact_name || conv.contact_ig_id
}

export default function InstagramMessagesView({ session }: InstagramMessagesViewProps) {
  const [internalTab, setInternalTab] = useState<InternalTab>('inbox')

  // Inbox state
  const [conversations, setConversations] = useState<IgConversation[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [messages, setMessages] = useState<IgMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [hasActiveConnection, setHasActiveConnection] = useState<boolean | null>(null)
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [togglingBlock, setTogglingBlock] = useState(false)
  const [daysFilter, setDaysFilter] = useState(3)
  const [searchQuery, setSearchQuery] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting')

  // Re-engage state
  const [reengageSelected, setReengageSelected] = useState<Set<string>>(new Set())
  const [reengageMessage, setReengageMessage] = useState('')
  const [reengageSending, setReengageSending] = useState(false)
  const [reengageProgress, setReengageProgress] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [reengageResults, setReengageResults] = useState<BulkResult[] | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldScrollToBottom = useRef(false)
  const selectedContactRef = useRef<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMessageTimeRef = useRef<string | null>(null)
  const realtimeStatusRef = useRef<'connecting' | 'connected' | 'fallback'>('connecting')

  useEffect(() => { selectedContactRef.current = selectedContact }, [selectedContact])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (behavior === 'auto') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = messagesContainerRef.current
          if (c) c.scrollTop = c.scrollHeight
        })
      })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // --- Filters ---
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
        (c.contact_name || '').toLowerCase().includes(q) ||
        c.contact_ig_id.toLowerCase().includes(q) ||
        c.last_message.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [conversations, daysFilter, searchQuery])

  const eligibleForReengage = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return conversations.filter(c => new Date(c.last_at) >= cutoff && !blockedIds.has(c.contact_ig_id))
  }, [conversations, blockedIds])

  // --- Date separators ---
  const messagesWithDates = useMemo(() => {
    const result: Array<DateItem | MsgItem> = []
    let lastDateStr = ''
    for (const msg of messages) {
      const dateStr = new Date(msg.created_at).toDateString()
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr
        result.push({ type: 'date', label: formatDate(msg.created_at) })
      }
      result.push({ type: 'message', msg })
    }
    return result
  }, [messages])

  // --- Fetch conversations ---
  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('get_instagram_conversations', { p_user_id: session.user.id })

      if (error) {
        const { data: fallbackData } = await supabase
          .from('instagram_messages')
          .select('contact_ig_id, contact_name, body, created_at, direction')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(200)

        if (fallbackData) {
          const grouped = new Map<string, IgConversation>()
          for (const msg of fallbackData) {
            if (!grouped.has(msg.contact_ig_id)) {
              grouped.set(msg.contact_ig_id, {
                contact_ig_id: msg.contact_ig_id,
                contact_name: msg.contact_name,
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
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [session.user.id])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // --- Blocked contacts ---
  const fetchBlocked = useCallback(async () => {
    const { data } = await supabase
      .from('blocked_contacts')
      .select('contact_phone')
      .eq('user_id', session.user.id)
      .eq('channel', 'instagram')
    setBlockedIds(new Set((data || []).map(r => r.contact_phone)))
  }, [session.user.id])

  useEffect(() => { fetchBlocked() }, [fetchBlocked])

  const toggleBlock = useCallback(async (igId: string) => {
    setTogglingBlock(true)
    try {
      const isBlocked = blockedIds.has(igId)
      if (isBlocked) {
        await supabase
          .from('blocked_contacts')
          .delete()
          .eq('user_id', session.user.id)
          .eq('contact_phone', igId)
          .eq('channel', 'instagram')
      } else {
        await supabase
          .from('blocked_contacts')
          .insert({ user_id: session.user.id, contact_phone: igId, channel: 'instagram', reason: 'Bloqueado desde bandeja' })
      }
      await fetchBlocked()
    } catch { /* silent */ }
    finally { setTogglingBlock(false) }
  }, [session.user.id, blockedIds, fetchBlocked])

  // --- Check active IG connection ---
  useEffect(() => {
    async function checkConnection() {
      const { data } = await supabase
        .from('instances')
        .select('id, access_token')
        .eq('user_id', session.user.id)
        .not('access_token', 'is', null)
        .limit(1)
      setHasActiveConnection(data != null && data.length > 0)
    }
    checkConnection()
  }, [session.user.id])

  // --- Fetch messages ---
  const fetchMessages = useCallback(async (contact: string, fromOffset = 0) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('instagram_messages')
        .select('id, contact_ig_id, contact_name, direction, body, created_at, sender_type')
        .eq('user_id', session.user.id)
        .eq('contact_ig_id', contact)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(fromOffset, fromOffset + PAGE_SIZE - 1)

      if (!error && data) {
        const sorted = sortByTime([...data].reverse() as IgMessage[])
        if (fromOffset === 0) {
          shouldScrollToBottom.current = true
          setMessages(sorted)
          if (sorted.length > 0) {
            lastMessageTimeRef.current = sorted[sorted.length - 1].created_at
          }
        } else {
          setMessages(prev => [...sorted, ...prev])
        }
        setHasMore(data.length === PAGE_SIZE)
        setOffset(fromOffset + data.length)
      }
    } catch { /* silent */ }
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
    if (shouldScrollToBottom.current && messages.length > 0) {
      shouldScrollToBottom.current = false
      scrollToBottom('auto')
    }
  }, [messages, scrollToBottom])

  // --- Handle new message from realtime/polling ---
  const handleNewMessage = useCallback((newMsg: IgMessage) => {
    lastMessageTimeRef.current = newMsg.created_at

    if (newMsg.contact_ig_id === selectedContactRef.current) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        if (newMsg.direction === 'outbound') {
          let removedOne = false
          const cleaned = prev.filter(m => {
            if (!removedOne && m.id.startsWith('optimistic-') && m.body === newMsg.body && m.contact_ig_id === newMsg.contact_ig_id) {
              removedOne = true
              return false
            }
            return true
          })
          return sortByTime([...cleaned, newMsg])
        }
        return sortByTime([...prev.filter(m => !m.id.startsWith('optimistic-')), newMsg])
      })
      setTimeout(() => scrollToBottom('smooth'), 50)
    }

    setConversations(prev => {
      const exists = prev.some(c => c.contact_ig_id === newMsg.contact_ig_id)
      let updated = prev.map(c => {
        if (c.contact_ig_id === newMsg.contact_ig_id) {
          return {
            ...c,
            last_message: newMsg.body,
            last_at: newMsg.created_at,
            contact_name: newMsg.contact_name || c.contact_name,
            unread: newMsg.contact_ig_id !== selectedContactRef.current && newMsg.direction === 'inbound'
              ? c.unread + 1 : c.unread
          }
        }
        return c
      })
      if (!exists) {
        updated = [{
          contact_ig_id: newMsg.contact_ig_id,
          contact_name: newMsg.contact_name,
          last_message: newMsg.body,
          last_at: newMsg.created_at,
          unread: newMsg.direction === 'inbound' ? 1 : 0
        }, ...updated]
      }
      return updated.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
    })
  }, [scrollToBottom])

  // --- Realtime + Polling fallback ---
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return
      pollingRef.current = setInterval(async () => {
        const since = lastMessageTimeRef.current || new Date(Date.now() - 30000).toISOString()
        try {
          const { data } = await supabase
            .from('instagram_messages')
            .select('id, contact_ig_id, contact_name, direction, body, created_at, sender_type')
            .eq('user_id', session.user.id)
            .gt('created_at', since)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })

          if (data && data.length > 0) {
            for (const msg of data) {
              handleNewMessage(msg as IgMessage)
            }
          }
        } catch { /* silent */ }
      }, 5000)
    }

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    const channel = supabase
      .channel('ig-inbox-' + session.user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instagram_messages',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          handleNewMessage(payload.new as IgMessage)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeStatusRef.current = 'connected'
          setRealtimeStatus('connected')
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeStatusRef.current = 'fallback'
          setRealtimeStatus('fallback')
          startPolling()
        }
      })

    const fallbackTimer = setTimeout(() => {
      if (realtimeStatusRef.current === 'connecting') {
        realtimeStatusRef.current = 'fallback'
        setRealtimeStatus('fallback')
        startPolling()
      }
    }, 8000)

    return () => {
      supabase.removeChannel(channel)
      stopPolling()
      clearTimeout(fallbackTimer)
    }
  }, [session.user.id, handleNewMessage])

  // --- Select contact ---
  const handleSelectContact = useCallback((igId: string) => {
    setSelectedContact(igId)
    setConversations(prev => prev.map(c =>
      c.contact_ig_id === igId ? { ...c, unread: 0 } : c
    ))
  }, [])

  // --- Send single message ---
  const handleSend = useCallback(async () => {
    if (!selectedContact || !newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setSending(true)
    setSendError(null)

    const selectedConv = conversations.find(c => c.contact_ig_id === selectedContact)
    const optimisticId = 'optimistic-' + Date.now()
    const optimisticMsg: IgMessage = {
      id: optimisticId,
      contact_ig_id: selectedContact,
      contact_name: selectedConv?.contact_name || null,
      direction: 'outbound',
      body: messageText,
      created_at: new Date().toISOString(),
      sender_type: 'human'
    }
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    scrollToBottom('smooth')

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        setSendError('Sesion expirada.')
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        return
      }

      const res = await fetch('/api/instagram-dm?action=send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ contact_ig_id: selectedContact, message: messageText })
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
  }, [selectedContact, newMessage, sending, scrollToBottom, conversations])

  // --- Re-engage bulk send ---
  const handleReengageSend = useCallback(async () => {
    if (reengageSelected.size === 0 || !reengageMessage.trim() || reengageSending) return

    setReengageSending(true)
    setReengageResults(null)
    const contactIds = Array.from(reengageSelected)
    setReengageProgress({ sent: 0, failed: 0, total: contactIds.length })

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        setReengageSending(false)
        return
      }

      const res = await fetch('/api/instagram-dm?action=send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({ contacts: contactIds, message: reengageMessage.trim() })
      })

      const data = await res.json().catch(() => ({}))

      if (data.results) {
        setReengageResults(data.results)
        setReengageProgress({
          sent: data.sent || 0,
          failed: data.failed || 0,
          total: contactIds.length
        })
      }
    } catch {
      setReengageProgress(prev => prev ? { ...prev, failed: prev.total } : null)
    } finally {
      setReengageSending(false)
    }
  }, [reengageSelected, reengageMessage, reengageSending])

  const toggleReengageAll = useCallback(() => {
    if (reengageSelected.size === eligibleForReengage.length) {
      setReengageSelected(new Set())
    } else {
      setReengageSelected(new Set(eligibleForReengage.map(c => c.contact_ig_id)))
    }
  }, [reengageSelected.size, eligibleForReengage])

  const toggleReengageContact = useCallback((igId: string) => {
    setReengageSelected(prev => {
      const next = new Set(prev)
      if (next.has(igId)) next.delete(igId)
      else next.add(igId)
      return next
    })
  }, [])

  // --- Render ---
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E1306C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 tracking-widest uppercase">Cargando conversaciones</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bandeja Instagram</h2>
          <p className="text-gray-500 text-sm">Gestiona las conversaciones de tu asistente IA en Instagram.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            realtimeStatus === 'connected' ? 'bg-[#E1306C]' :
            realtimeStatus === 'fallback' ? 'bg-yellow-500' :
            'bg-gray-500 animate-pulse'
          }`} />
          <span className={`text-[10px] uppercase tracking-wider ${
            realtimeStatus === 'connected' ? 'text-[#E1306C]' :
            realtimeStatus === 'fallback' ? 'text-yellow-500' :
            'text-gray-400'
          }`}>
            {realtimeStatus === 'connected' ? 'En vivo' :
             realtimeStatus === 'fallback' ? 'Cada 5s' :
             'Conectando...'}
          </span>
        </div>
      </div>

      {/* Internal tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setInternalTab('inbox')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            internalTab === 'inbox'
              ? 'bg-white text-[#E1306C] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Bandeja
        </button>
        <button
          onClick={() => { setInternalTab('reengage'); setReengageResults(null); setReengageProgress(null) }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            internalTab === 'reengage'
              ? 'bg-white text-[#E1306C] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Re-engage
        </button>
      </div>

      {/* ─── INBOX TAB ─── */}
      {internalTab === 'inbox' && (
        <>
          {conversations.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E1306C]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#E1306C]/50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Aun no hay conversaciones registradas.</p>
              <p className="text-gray-400 text-xs">Los mensajes apareceran aqui cuando tu bot comience a responder en Instagram.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
              {/* Conversation List */}
              <div className="md:col-span-4 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400 uppercase">
                      Conversaciones ({filteredConversations.length})
                    </p>
                    <select
                      value={daysFilter}
                      onChange={(e) => setDaysFilter(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-500 focus:outline-none focus:border-[#E1306C]/50 cursor-pointer"
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
                    placeholder="Buscar por nombre o mensaje..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#E1306C]/50"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-xs text-gray-400">No hay conversaciones en este periodo.</p>
                      <button
                        onClick={() => { setDaysFilter(0); setSearchQuery('') }}
                        className="text-[10px] text-[#E1306C] mt-2 hover:underline"
                      >
                        Ver todas
                      </button>
                    </div>
                  ) : null}
                  {filteredConversations.map(conv => (
                    <button
                      key={conv.contact_ig_id}
                      onClick={() => handleSelectContact(conv.contact_ig_id)}
                      className={`w-full text-left p-4 border-b border-gray-100 transition-all hover:bg-gray-50 ${
                        selectedContact === conv.contact_ig_id ? 'bg-[#E1306C]/10 border-l-2 border-l-[#E1306C]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${blockedIds.has(conv.contact_ig_id) ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                          {displayName(conv)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {blockedIds.has(conv.contact_ig_id) && (
                            <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold">BLOQ</span>
                          )}
                          {conv.unread > 0 && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#E1306C] text-[10px] text-white font-bold px-1">
                              {conv.unread}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{formatDate(conv.last_at)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">{conv.last_message}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Thread */}
              <div className="md:col-span-8 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {!selectedContact ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Selecciona una conversacion</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${blockedIds.has(selectedContact) ? 'bg-red-50' : 'bg-[#E1306C]/20'}`}>
                          <span className={`text-xs font-bold ${blockedIds.has(selectedContact) ? 'text-red-500' : 'text-[#E1306C]'}`}>
                            {(conversations.find(c => c.contact_ig_id === selectedContact)?.contact_name || selectedContact).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            {displayName(conversations.find(c => c.contact_ig_id === selectedContact) || { contact_ig_id: selectedContact, contact_name: null })}
                          </p>
                          <p className={`text-[10px] uppercase tracking-widest ${
                            blockedIds.has(selectedContact) ? 'text-red-500' :
                            hasActiveConnection ? 'text-[#E1306C]' : 'text-gray-400'
                          }`}>
                            {blockedIds.has(selectedContact) ? 'Bloqueado' :
                             hasActiveConnection ? 'Conectado' : 'Sin conexion activa'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleBlock(selectedContact)}
                        disabled={togglingBlock}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                          blockedIds.has(selectedContact)
                            ? 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            : 'bg-red-50 text-red-500 hover:bg-red-100'
                        }`}
                      >
                        {togglingBlock ? '...' : blockedIds.has(selectedContact) ? 'Desbloquear' : 'Bloquear'}
                      </button>
                    </div>

                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                      {hasMore && (
                        <button
                          onClick={() => fetchMessages(selectedContact, offset)}
                          disabled={loadingMessages}
                          className="w-full py-2 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                        >
                          {loadingMessages ? 'Cargando...' : 'Cargar mensajes anteriores'}
                        </button>
                      )}

                      {loadingMessages && messages.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-6 h-6 border-2 border-[#E1306C] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {messagesWithDates.map((item, idx) => {
                        if (item.type === 'date') {
                          return (
                            <div key={`date-${idx}`} className="flex items-center justify-center my-4">
                              <div className="bg-gray-50 border border-gray-200 rounded-full px-4 py-1">
                                <span className="text-[11px] text-gray-400 font-medium">{item.label}</span>
                              </div>
                            </div>
                          )
                        }
                        const msg = item.msg
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                msg.direction === 'outbound'
                                  ? 'bg-[#E1306C]/10 border border-[#E1306C]/20 rounded-br-md'
                                  : 'bg-gray-50 border border-gray-200 rounded-bl-md'
                              } ${msg.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}
                            >
                              <p className={`text-sm ${msg.direction === 'outbound' ? 'text-[#E1306C]' : 'text-gray-700'}`}>
                                {msg.body}
                              </p>
                              <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                                {msg.direction === 'outbound' && (
                                  <span className={`text-[10px] ${msg.sender_type === 'human' ? 'text-blue-500' : 'text-[#E1306C]/60'}`}>
                                    {msg.sender_type === 'human' ? 'Tu' : 'IA'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-gray-100">
                      {blockedIds.has(selectedContact) ? (
                        <p className="text-[10px] text-red-400 italic text-center">
                          Este contacto esta bloqueado. Tu asistente IA no respondera sus mensajes.
                        </p>
                      ) : !hasActiveConnection ? (
                        <p className="text-[10px] text-gray-400 italic text-center">
                          Conecta tu Instagram para enviar mensajes.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sendError && (
                            <p className="text-[10px] text-red-500 px-1">{sendError}</p>
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
                              onInput={(e) => {
                                const t = e.target as HTMLTextAreaElement
                                t.style.height = 'auto'
                                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                              }}
                              placeholder="Escribe un mensaje..."
                              disabled={sending}
                              rows={1}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-[#E1306C]/50 disabled:opacity-40"
                              style={{ maxHeight: '120px' }}
                            />
                            <button
                              onClick={handleSend}
                              disabled={sending || !newMessage.trim()}
                              className="p-2.5 rounded-xl bg-[#E1306C] hover:bg-[#c2185b] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
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
                          <p className="text-[10px] text-gray-400 italic text-center">
                            Al responder, tu asistente IA seguira activo en esta conversacion.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── RE-ENGAGE TAB ─── */}
      {internalTab === 'reengage' && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Re-engage masivo</h3>
            <p className="text-xs text-gray-400 mt-1">
              Envia un mensaje a contactos con conversacion activa en los ultimos 7 dias.
              Solo se mostraran contactos dentro de la ventana de mensajeria de Instagram.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-100">
            {/* Contact selection */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400 uppercase">
                  Contactos elegibles ({eligibleForReengage.length})
                </p>
                {eligibleForReengage.length > 0 && (
                  <button
                    onClick={toggleReengageAll}
                    className="text-[10px] text-[#E1306C] hover:underline font-medium"
                  >
                    {reengageSelected.size === eligibleForReengage.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                )}
              </div>

              {eligibleForReengage.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400">No hay contactos con actividad en los ultimos 7 dias.</p>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto space-y-1">
                  {eligibleForReengage.map(conv => (
                    <label
                      key={conv.contact_ig_id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        reengageSelected.has(conv.contact_ig_id) ? 'bg-[#E1306C]/5 border border-[#E1306C]/20' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={reengageSelected.has(conv.contact_ig_id)}
                        onChange={() => toggleReengageContact(conv.contact_ig_id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#E1306C] focus:ring-[#E1306C]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate">{displayName(conv)}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(conv.last_at)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Message composition */}
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400 uppercase">
                Mensaje ({reengageSelected.size} seleccionados)
              </p>

              <textarea
                value={reengageMessage}
                onChange={(e) => setReengageMessage(e.target.value)}
                placeholder="Escribe el mensaje promocional..."
                rows={5}
                maxLength={1000}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-[#E1306C]/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{reengageMessage.length}/1000</span>
                <button
                  onClick={handleReengageSend}
                  disabled={reengageSending || reengageSelected.size === 0 || !reengageMessage.trim()}
                  className="px-4 py-2 rounded-xl bg-[#E1306C] hover:bg-[#c2185b] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {reengageSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>Enviar a {reengageSelected.size}</>
                  )}
                </button>
              </div>

              {/* Progress / Results */}
              {reengageProgress && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Progreso</span>
                    <span className="text-gray-900 font-medium">
                      {reengageProgress.sent + reengageProgress.failed} / {reengageProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E1306C] rounded-full transition-all duration-300"
                      style={{ width: `${((reengageProgress.sent + reengageProgress.failed) / reengageProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-[10px]">
                    <span className="text-green-600">Enviados: {reengageProgress.sent}</span>
                    {reengageProgress.failed > 0 && (
                      <span className="text-red-500">Fallidos: {reengageProgress.failed}</span>
                    )}
                  </div>
                </div>
              )}

              {reengageResults && reengageResults.some(r => !r.ok) && (
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Errores</p>
                  {reengageResults.filter(r => !r.ok).map((r, i) => {
                    const conv = conversations.find(c => c.contact_ig_id === r.contact_ig_id)
                    return (
                      <p key={i} className="text-[10px] text-red-400">
                        {conv ? displayName(conv) : r.contact_ig_id}: {r.error}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
