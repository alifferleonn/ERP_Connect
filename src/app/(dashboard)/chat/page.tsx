'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageSquare, 
  Send, 
  Globe, 
  Search, 
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  sender_email: string
  sender_name: string
  sender_branch: string
  recipient_email: string
  content: string
  created_at: string
}

interface ChatContact {
  id: string
  name: string
  email: string
  branch: string
  color: string
}

const PRESET_CONTACTS: ChatContact[] = [
  { id: 'acesso1', name: 'Pharmix Matriz (Acesso 1)', email: 'acesso1@gmail.com', branch: 'pharmix', color: 'bg-indigo-500' },
  { id: 'acesso2', name: 'Pharmix Matriz (Acesso 2)', email: 'acesso2@gmail.com', branch: 'pharmix', color: 'bg-indigo-600' },
  { id: 'acesso3', name: 'Filial Trade (Acesso 3)', email: 'acesso3@trade.com', branch: 'trade', color: 'bg-emerald-500' },
  { id: 'trade', name: 'Filial Trade (Oficial)', email: 'trade@trade.com', branch: 'trade', color: 'bg-emerald-600' },
  { id: 'connecthealth', name: 'Filial ConnectHealth', email: 'connect@connecthealth.com', branch: 'connecthealth', color: 'bg-amber-500' },
  { id: 'connecthealth_br', name: 'Filial ConnectHealth BR', email: 'connect@connecthealth.com.br', branch: 'connecthealth', color: 'bg-amber-600' },
]

const EMOJI_PRESETS = ['👍', '💊', '✅', '📦', '🚚', '🎉', '🤝', '💵', '🚀']

export default function ChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeTarget, setActiveTarget] = useState<string>('GERAL') // 'GERAL' or contact email
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchContact, setSearchContact] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email?.toLowerCase() || ''
  const userName = user?.name || (user?.email?.split('@')[0] || 'Usuário')
  const userBranch = user?.isFilial ? (user.filialName || 'filial') : 'pharmix'

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activeTarget])

  // Load initial messages and setup Supabase Realtime subscription
  useEffect(() => {
    let channel: any

    async function setupRealtimeChat() {
      setIsLoading(true)
      try {
        const supabase = createClient()

        // 1. Load historical messages
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages(data || [])

        // 2. Subscribe to REALTIME postgres_changes for chat_messages
        channel = supabase
          .channel('realtime_chat_room')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
              const newMsg = payload.new as ChatMessage
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev
                return [...prev, newMsg]
              })
            }
          )
          .subscribe()
      } catch (err: any) {
        console.error('Error loading chat:', err)
        toast.error('Erro ao conectar ao Realtime do Chat')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      setupRealtimeChat()
    }

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isSending) return

    const text = inputText.trim()
    setInputText('')
    setIsSending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            sender_email: userEmail,
            sender_name: userName,
            sender_branch: userBranch,
            recipient_email: activeTarget,
            content: text,
            created_at: new Date().toISOString()
          }
        ])

      if (error) throw error
    } catch (err: any) {
      toast.error(`Erro ao enviar mensagem: ${err.message || 'Verifique se a tabela chat_messages existe'}`)
    } finally {
      setIsSending(false)
    }
  }

  // Add emoji to input
  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji)
  }

  // Filter contacts list
  const filteredContacts = PRESET_CONTACTS.filter((c) => {
    if (c.email.toLowerCase() === userEmail) return false // Don't list self
    if (!searchContact) return true
    return c.name.toLowerCase().includes(searchContact.toLowerCase()) || c.branch.toLowerCase().includes(searchContact.toLowerCase())
  })

  // Filter messages for active chat conversation
  const visibleMessages = messages.filter((m) => {
    if (activeTarget === 'GERAL') {
      return !m.recipient_email || m.recipient_email === 'GERAL'
    } else {
      // 1-on-1 private chat
      const isSentByMeToTarget = m.sender_email.toLowerCase() === userEmail && m.recipient_email.toLowerCase() === activeTarget.toLowerCase()
      const isSentByTargetToMe = m.sender_email.toLowerCase() === activeTarget.toLowerCase() && m.recipient_email.toLowerCase() === userEmail
      return isSentByMeToTarget || isSentByTargetToMe
    }
  })

  // Active conversation header info
  const activeContactInfo = PRESET_CONTACTS.find((c) => c.email.toLowerCase() === activeTarget.toLowerCase())

  // Count unread or active count per contact
  const getUnreadCount = (targetEmail: string) => {
    if (targetEmail === activeTarget) return 0
    return messages.filter((m) => {
      if (targetEmail === 'GERAL') {
        return (!m.recipient_email || m.recipient_email === 'GERAL') && m.sender_email.toLowerCase() !== userEmail
      } else {
        return m.sender_email.toLowerCase() === targetEmail.toLowerCase() && m.recipient_email.toLowerCase() === userEmail
      }
    }).length
  }

  const getBranchBadgeStyle = (branch: string) => {
    const b = (branch || '').toLowerCase()
    if (b.includes('pharmix')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    if (b.includes('trade')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    if (b.includes('connecthealth')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    if (b.includes('connect')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    if (b.includes('bioss')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    return 'bg-secondary text-muted-foreground border-border'
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Bate-Papo Realtime
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comunicação ao vivo instantânea entre a Pharmix Matriz e todas as Filiais via Supabase Realtime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Realtime Ativo
          </span>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[550px]">
        {/* Left Sidebar: Rooms & Direct Contacts */}
        <Card className="md:col-span-4 lg:col-span-3 flex flex-col border-border/60 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="p-3 border-b border-border/40 space-y-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Canais e Contatos</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar contato..." 
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                className="pl-8 text-xs h-8 bg-secondary/50 border-border/40"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1 overflow-y-auto flex-1 divide-y divide-border/20">
            {/* General Room */}
            <button
              onClick={() => setActiveTarget('GERAL')}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                activeTarget === 'GERAL'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'hover:bg-secondary/70 text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Sala Geral 🌐</div>
                  <div className="text-[10px] opacity-80">Todos da Matriz &amp; Filiais</div>
                </div>
              </div>
              {getUnreadCount('GERAL') > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {getUnreadCount('GERAL')}
                </span>
              )}
            </button>

            {/* Direct 1-on-1 Private Chats */}
            <div className="pt-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Mensagens Privadas (1-on-1)
              </div>
              {filteredContacts.map((contact) => {
                const isSelected = activeTarget.toLowerCase() === contact.email.toLowerCase()
                const unread = getUnreadCount(contact.email)
                return (
                  <button
                    key={contact.id}
                    onClick={() => setActiveTarget(contact.email)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'hover:bg-secondary/70 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full ${contact.color} text-white flex items-center justify-center text-xs font-bold shadow-xs`}>
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{contact.name}</div>
                        <div className="text-[10px] opacity-75">{contact.email}</div>
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Section: Main Active Chat Window */}
        <Card className="md:col-span-8 lg:col-span-9 flex flex-col border-border/60 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden">
          {/* Active Chat Header */}
          <div className="p-3.5 border-b border-border/40 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTarget === 'GERAL' ? (
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Globe className="h-6 w-6" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-full ${activeContactInfo?.color || 'bg-primary'} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                  {activeContactInfo?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  {activeTarget === 'GERAL' ? 'Sala Geral (Global Pharmix)' : activeContactInfo?.name || activeTarget}
                  {activeTarget !== 'GERAL' && (
                    <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                      Chat Privado
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeTarget === 'GERAL'
                    ? 'Canal público em tempo real para toda a equipe Matriz e Filiais'
                    : `Conversa privada com ${activeTarget}`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-2 py-1 rounded border border-border/40">
                Logado como: <strong className="text-foreground">{userName}</strong> ({userBranch.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/10">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando mensagens em tempo real...</span>
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold">Nenhuma mensagem nesta conversa ainda</div>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Seja o primeiro a enviar uma mensagem instantânea em tempo real!
                </p>
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isMe = msg.sender_email.toLowerCase() === userEmail
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in duration-200`}
                  >
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {isMe ? 'Você' : msg.sender_name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${getBranchBadgeStyle(msg.sender_branch)}`}>
                        {msg.sender_branch?.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-card border border-border/60 text-foreground rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Presets & Emojis Bar */}
          <div className="px-3 py-1.5 bg-secondary/20 border-t border-border/30 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pr-1">Reações:</span>
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="px-2 py-0.5 text-xs rounded hover:bg-secondary transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border/40 bg-card flex items-center gap-2">
            <Input
              placeholder={activeTarget === 'GERAL' ? 'Digite uma mensagem para a Sala Geral...' : `Digite uma mensagem privada para ${activeContactInfo?.name || activeTarget}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-secondary/40 border-border/60"
            />
            <Button type="submit" disabled={!inputText.trim() || isSending} className="gap-2 px-4">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Enviar</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
