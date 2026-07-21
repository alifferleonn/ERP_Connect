'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Sparkles, 
  Send, 
  Settings, 
  Trash2, 
  Loader2, 
  Bot, 
  User, 
  RefreshCw,
  Terminal
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export default function AssistantPage() {
  useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  
  // AI Provider & Config
  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini')
  const [geminiKey, setGeminiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash')
  const [ollamaHost, setOllamaHost] = useState('http://127.0.0.1:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3')

  // ERP Context Data
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [systemContext, setSystemContext] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load configs on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = localStorage.getItem('ai_provider') as 'gemini' | 'ollama'
      const savedGeminiKey = localStorage.getItem('gemini_key')
      const savedGeminiModel = localStorage.getItem('gemini_model')
      const savedOllamaHost = localStorage.getItem('ollama_host')
      const savedOllamaModel = localStorage.getItem('ollama_model')
      
      if (savedProvider) setProvider(savedProvider)
      if (savedGeminiKey) setGeminiKey(savedGeminiKey)
      if (savedGeminiModel) setGeminiModel(savedGeminiModel)
      if (savedOllamaHost) setOllamaHost(savedOllamaHost)
      if (savedOllamaModel) setOllamaModel(savedOllamaModel)
    }
  }, [])

  // Auto-scroll chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSaveConfigs = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_provider', provider)
      localStorage.setItem('gemini_key', geminiKey)
      localStorage.setItem('gemini_model', geminiModel)
      localStorage.setItem('ollama_host', ollamaHost)
      localStorage.setItem('ollama_model', ollamaModel)
    }
    toast.success('Configurações de IA salvas com sucesso!')
    setIsConfigOpen(false)
  }

  // Load database context for the AI Agent
  async function loadErpContext() {
    setIsContextLoading(true)
    try {
      const supabase = createClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // 1. Fetch sales of current month
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(name)')
        .gte('created_at', startOfMonth.toISOString())

      // 2. Fetch products catalog
      const { data: productsData } = await supabase
        .from('products')
        .select('name, code, purchase_price, sale_price')

      // 3. Fetch active stock items
      const { data: stockData } = await supabase
        .from('stock')
        .select('*, products(name, code)')
        .order('expiry_date', { ascending: true })

      const activeSales = salesData || []
      const activeProducts = productsData || []
      const allStock = stockData || []

      // Calculate totals
      const totalBillingBrl = activeSales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
      
      // Expired or warning stock lots (expiry in <= 90 days)
      const warningStock = allStock
        .filter((item: any) => {
          if (item.status === 'OUT_OF_STOCK' || (item.quantity ?? 0) <= 0) return false
          const expDate = item.expiry_date || item.expiryDate
          if (!expDate) return false
          const expiry = new Date(expDate)
          const today = new Date()
          expiry.setHours(0,0,0,0)
          today.setHours(0,0,0,0)
          const diffTime = expiry.getTime() - today.getTime()
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return days <= 90
        })
        .map((item: any) => {
          const expDate = item.expiry_date || item.expiryDate
          const expiry = new Date(expDate)
          const today = new Date()
          const diffTime = expiry.getTime() - today.getTime()
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          return {
            produto: item.products?.name,
            lote: item.batch_number || item.batchNumber,
            quantidade: item.quantity,
            vencimento: expDate ? new Date(expDate).toLocaleDateString('pt-BR') : 'N/A',
            situacao: days <= 0 ? 'VENCIDO' : days <= 30 ? 'CRÍTICO' : 'ALERTA',
            diasRestantes: days
          }
        })

      const erpStatusContext = `Você é o "Assistente de IA do ERP Conectado", especialista em auditoria e suporte da matriz Pharmix Global e filiais.
Contexto atual da Matriz no ERP:
- Faturamento consolidado do mês corrente em Reais: R$ ${totalBillingBrl.toFixed(2)}
- Volume total de vendas do mês atual: ${activeSales.length} pedidos
- Lotes de Medicamentos Vencidos ou em Alerta de Validade (Críticos/Aviso):
${warningStock.length > 0 ? JSON.stringify(warningStock, null, 2) : 'Nenhum lote vencido ou próximo do vencimento no estoque.'}
- Catálogo de Medicamentos Registrados:
${JSON.stringify(activeProducts.slice(0, 10).map((p: any) => ({ nome: p.name, codigo: p.code, custo_usd: p.purchase_price, preco_brl: p.sale_price })), null, 2)}

Diretrizes da IA:
1. Apresente-se como o Assistente de Inteligência do ERP.
2. Responda em Português de forma profissional, direta e executiva.
3. Use os dados acima para responder a perguntas de estoque, validades e faturamento.
4. Se o usuário perguntar como operar o sistema (ex: dar entrada, devolver vencido, despacho), explique de forma simples seguindo o manual de processos.`

      setSystemContext(erpStatusContext)
    } catch (err: any) {
      console.error('Error fetching ERP context:', err)
      toast.error('Não foi possível carregar as informações em tempo real do ERP.')
    } finally {
      setIsContextLoading(false)
    }
  }

  useEffect(() => {
    loadErpContext()
  }, [])

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault()
    const textToSend = (customText || inputMessage).trim()
    if (!textToSend) return

    const userMessage: Message = { role: 'user', content: textToSend }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setInputMessage('')
    setIsLoading(true)

    try {
      // Assemble full payload including system context if not already loaded in the conversation
      const conversationPayload: Message[] = [
        { role: 'system', content: systemContext },
        ...updatedMessages
      ]
      let res;
      if (provider === 'gemini') {
        res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationPayload,
            provider: 'gemini',
            apiKey: geminiKey,
            modelName: geminiModel
          })
        })
      } else {
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        if (isLocalhost) {
          res = await fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: conversationPayload,
              provider: 'ollama',
              hostUrl: ollamaHost,
              modelName: ollamaModel
            })
          })
        } else {
          res = await fetch(`${ollamaHost}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: conversationPayload,
              stream: false
            })
          })
        }
      }

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Falha ao conectar com o modelo de IA.')
      }

      const data = await res.json()
      const isOllamaDirect = provider === 'ollama' && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      const assistantReply = isOllamaDirect ? (data.message?.content || 'Sem resposta.') : (data.message || 'Sem resposta.')
      setMessages([...updatedMessages, { role: 'assistant', content: assistantReply }])
    } catch (err: any) {
      toast.error(err.message || 'Erro ao obter resposta do assistente.')
      
      let errorMsg = `❌ Erro de Conexão: Não consegui me comunicar com a IA.`
      if (provider === 'gemini') {
        errorMsg += `\n\nErro retornado pela API do Gemini. Certifique-se de que sua Chave de API está ativa e correta.`
      } else {
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        errorMsg += ` em \`${ollamaHost}\` usando o modelo \`${ollamaModel}\`.`
        if (!isLocalhost) {
          errorMsg += `\n\n**Nota de Produção (Vercel)**:\nComo o ERP está rodando na nuvem, o seu navegador bloqueia a conexão local devido a restrições de CORS (segurança do navegador).\n\n**Como resolver isso de forma simples**:\n\n1. Feche o Ollama na barra de tarefas (caso esteja aberto).\n2. Abra o **Prompt de Comando (cmd)** do Windows e inicie o Ollama liberando o acesso (CORS) com o seguinte comando:\n   \`set OLLAMA_ORIGINS=*\`\n   \`ollama serve\`\n3. Deixe essa janela do cmd aberta e clique para enviar a pergunta novamente no ERP!`
        } else {
          errorMsg += `\n\nCertifique-se de que o Ollama está rodando localmente e que o modelo está instalado (\`ollama run ${ollamaModel}\`).`
        }
      }
      
      setMessages([...updatedMessages, { role: 'assistant', content: errorMsg }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    toast.info('Histórico de conversa limpo.')
  }

  const suggestedPrompts = [
    { text: 'Quais lotes estão vencidos ou em alerta?', label: '🔍 Validades em Risco' },
    { text: 'Como posso dar entrada manual no estoque?', label: '📦 Registrar Entrada' },
    { text: 'Resuma o faturamento consolidado deste mês', label: '💵 Faturamento Mensal' },
    { text: 'Como faço para devolver medicamentos vencidos?', label: '🔴 Devolução de Lotes' }
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-500" />
            Assistente IA de Operações
          </h1>
          <p className="text-muted-foreground text-sm">
            Assistente de Inteligência Artificial local integrado aos dados de faturamento e estoque do Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="border-border/60 hover:bg-secondary/40 font-semibold flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" />
            Configurar Ollama
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadErpContext}
            disabled={isContextLoading}
            className="border-border/60 hover:bg-secondary/40 font-semibold"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isContextLoading ? 'animate-spin' : ''}`} />
            Sincronizar Dados
          </Button>
        </div>
      </div>

      {/* Collapsible Configurations Panel */}
      {isConfigOpen && (
        <Card className="border-indigo-500/25 bg-indigo-500/5 animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-500" /> Parâmetros do Assistente de Inteligência Artificial
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha entre usar a API da nuvem (Google Gemini) ou rodar um modelo de linguagem localmente em sua máquina (Ollama).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5 max-w-sm">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Provedor de Inteligência Artificial</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                value={provider}
                onChange={e => setProvider(e.target.value as 'gemini' | 'ollama')}
              >
                <option value="gemini">Google Gemini (Nuvem - Rápido)</option>
                <option value="ollama">Ollama (Local - Sem Custos)</option>
              </select>
            </div>

            {provider === 'gemini' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Chave de API (Gemini API Key)</label>
                  <Input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="Chave de API do Gemini"
                    className="bg-card border-border/60 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Modelo do Gemini</label>
                  <Input
                    value={geminiModel}
                    onChange={e => setGeminiModel(e.target.value)}
                    placeholder="Ex: gemini-1.5-flash, gemini-1.5-pro"
                    className="bg-card border-border/60 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Endpoint / Host do Ollama</label>
                  <Input
                    value={ollamaHost}
                    onChange={e => setOllamaHost(e.target.value)}
                    placeholder="Ex: http://127.0.0.1:11434"
                    className="bg-card border-border/60 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Modelo do Ollama</label>
                  <Input
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    placeholder="Ex: llama3, mistral, gemma"
                    className="bg-card border-border/60 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveConfigs} className="bg-indigo-600 hover:bg-indigo-700">Salvar Ajustes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <Card className="border-border/50 overflow-hidden bg-card/65 backdrop-blur-sm shadow-xl flex flex-col h-[600px]">
        <CardHeader className="pb-3 border-b border-border/40 bg-secondary/15 flex flex-row justify-between items-center space-y-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-emerald-500" />
                Agente Conectado: {provider === 'gemini' ? geminiModel : ollamaModel} ({provider.toUpperCase()})
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-mono mt-0.5">
                Contexto ativo: {isContextLoading ? 'Sincronizando...' : 'Carregado de Supabase'}
              </CardDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Limpar Conversa
            </Button>
          )}
        </CardHeader>

        {/* Messages Feed */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0D15]/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">O que você gostaria de auditar hoje?</h3>
                <p className="text-sm text-muted-foreground">
                  Sou um agente local programado com as validades, estoque e vendas do ERP. Pergunte sobre medicamentos vencendo ou procedimentos operacionais!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full pt-4">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, p.text)}
                    className="p-3 text-[11px] font-bold text-left rounded-xl border border-border/60 bg-card hover:bg-secondary/40 hover:border-indigo-500/40 text-muted-foreground hover:text-foreground transition-all duration-300 shadow-sm"
                  >
                    <div className="text-indigo-400 mb-1">{p.label}</div>
                    <div className="line-clamp-2 text-[10px] font-normal leading-normal">{p.text}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] animate-in fade-in duration-300 ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    m.role === 'user' 
                      ? 'bg-primary/10 border-primary/30 text-primary' 
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-primary text-primary-foreground font-semibold rounded-tr-none' 
                      : 'bg-card border border-border/60 text-foreground rounded-tl-none font-medium'
                  }`}>
                    {m.content.split('\n').map((paragraph, index) => (
                      <p key={index} className={index > 0 ? 'mt-2' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[80%] mr-auto animate-in fade-in duration-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl p-4 bg-card border border-border/60 text-muted-foreground text-xs font-semibold rounded-tl-none flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-300" />
                    Digitando...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/40 bg-secondary/10">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder={isLoading ? 'Aguardando resposta...' : 'Digite sua dúvida de estoque ou vendas para a IA...'}
              disabled={isLoading || isContextLoading}
              className="flex-1 bg-card border-border/60 pr-10 focus-visible:ring-indigo-500"
            />
            <Button 
              type="submit" 
              disabled={isLoading || isContextLoading || !inputMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 shrink-0 transition-all"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
