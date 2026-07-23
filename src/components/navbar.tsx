'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Search, 
  User, 
  Menu, 
  LogOut, 
  AlertTriangle, 
  Package, 
  ShoppingBag, 
  CheckCircle2, 
  RefreshCw,
  ShieldCheck,
  Trash2,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  title: string
  description: string
  type: 'stock' | 'sale' | 'purchase'
  link: string
  time: string
}

export function Navbar() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Modals / Popovers State
  const [activeMenu, setActiveMenu] = useState<'notifications' | 'profile' | null>(null)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Exchange Rate State
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null)

  // Popover container ref for click outside
  const popoverRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email?.toLowerCase() || ''
  const storageKey = `pharmix_dismissed_notifs_${userEmail || 'guest'}`

  // Load dismissed notification IDs from localStorage
  useEffect(() => {

    if (userEmail) {
      const savedDismissed = localStorage.getItem(storageKey)
      if (savedDismissed) {
        try {
          setDismissedIds(JSON.parse(savedDismissed))
        } catch (e) {
          console.error('Error parsing dismissed notifications', e)
        }
      }
    }

    // Fetch live API exchange rate
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates?.BRL) {
          setLiveRate(data.rates.BRL)
          setLastUpdatedTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        }
      })
      .catch(err => console.error('Erro ao buscar cotação ao vivo:', err))
  }, [userEmail, storageKey])

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch company-private live notifications from Supabase
  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const supabase = createClient()
      const list: NotificationItem[] = []

      const isFilialUser = user?.isFilial || false
      const filialName = user?.filialName || (userEmail.includes('trade') ? 'trade' : userEmail.includes('connecthealth') ? 'connecthealth' : userEmail.includes('connect') ? 'connect' : userEmail.includes('bioss') ? 'bioss' : null)

      // 1. Low Stock Items (quantity <= 5)
      // Only Pharmix Matriz manages global central stock, filiais focus on sales/purchases
      if (!isFilialUser) {
        const { data: lowStock } = await supabase
          .from('stock')
          .select('*, products(name)')
          .lte('quantity', 5)
          .order('quantity', { ascending: true })
          .limit(5)

        if (lowStock) {
          lowStock.forEach(item => {
            list.push({
              id: `stock-${item.id}`,
              title: '⚠️ Estoque Crítico (Matriz)',
              description: `${item.products?.name || 'Medicamento'} em ${item.warehouse || 'Dubai'} tem apenas ${item.quantity} un.`,
              type: 'stock',
              link: '/estoque',
              time: 'Agora'
            })
          })
        }
      }

      // 2. Pending Sales
      const { data: pendingSales } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'PENDENTE')
        .order('created_at', { ascending: false })
        .limit(10)

      if (pendingSales) {
        pendingSales.forEach(sale => {
          const custNameLower = (sale.customer_name || '').toLowerCase()
          
          if (isFilialUser) {
            // Filial ONLY sees pending sales related to their branch
            if (filialName && custNameLower.includes(filialName)) {
              list.push({
                id: `sale-${sale.id}`,
                title: '📦 Venda Pendente para Filial',
                description: `Venda solicitada para ${(filialName).toUpperCase()} aguarda envio.`,
                type: 'sale',
                link: '/vendas',
                time: new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              })
            }
          } else {
            // Pharmix Matriz sees all pending sales to branches/clients
            list.push({
              id: `sale-${sale.id}`,
              title: '📦 Venda Pendente Matriz',
              description: `Venda para ${sale.customer_name?.slice(0, 25)}... aguarda envio.`,
              type: 'sale',
              link: '/vendas',
              time: new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            })
          }
        })
      }

      // 3. Pending Purchases
      const { data: pendingPurchases } = await supabase
        .from('purchases')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .limit(15)

      if (pendingPurchases) {
        pendingPurchases.forEach(pur => {
          const statusStr = pur.status || ''
          const hasSuffix = statusStr.includes('_')
          const suffix = hasSuffix ? statusStr.split('_')[1] : null

          if (isFilialUser) {
            // Filial ONLY sees purchases meant for their branch (e.g. status PENDENTE_trade)
            if (suffix === filialName) {
              list.push({
                id: `pur-${pur.id}`,
                title: '🛒 Compra Solicitada (Filial)',
                description: `Pedido de ${pur.products?.name || 'Produto'} (${pur.quantity} un.) enviado à Pharmix.`,
                type: 'purchase',
                link: '/compras',
                time: new Date(pur.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              })
            }
          } else {
            // Pharmix Matriz ONLY sees purchases without suffix or created for Matriz directly
            if (!suffix || suffix === 'pharmix') {
              list.push({
                id: `pur-${pur.id}`,
                title: '🛒 Compra Pendente Matriz',
                description: `Pedido de ${pur.products?.name || 'Produto'} (${pur.quantity} un.) aguarda recebimento.`,
                type: 'purchase',
                link: '/compras',
                time: new Date(pur.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              })
            }
          }
        })
      }

      // Read current dismissed IDs from localStorage to filter out
      const currentDismissed = localStorage.getItem(storageKey)
      const dismissedList: string[] = currentDismissed ? JSON.parse(currentDismissed) : []

      // Filter out dismissed notifications
      const activeNotifications = list.filter(item => !dismissedList.includes(item.id))
      setNotifications(activeNotifications)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 45000)
    return () => clearInterval(interval)
  }, [user])

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setNotifications(prev => prev.filter(item => item.id !== id))
    toast.success('Alerta descartado')
  }

  const handleClearAllNotifications = () => {
    const allIds = notifications.map(item => item.id)
    const updated = Array.from(new Set([...dismissedIds, ...allIds]))
    setDismissedIds(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setNotifications([])
    toast.success('Todas as notificações foram descartadas')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/produtos?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Sessão encerrada com sucesso!')
      window.location.href = '/'
    } catch (err) {
      toast.error('Erro ao sair da conta')
    }
  }

  const getBranchBadge = () => {
    if (user?.isSupervisor) return { label: '👔 Gerência Geral & Auditoria', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold' }
    if (!user?.isFilial) return { label: 'Pharmix Matriz Global', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' }
    const f = (user?.filialName || '').toLowerCase()
    if (f.includes('trade')) return { label: 'Filial Trade', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
    if (f.includes('connecthealth')) return { label: 'Filial ConnectHealth', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
    if (f.includes('connect')) return { label: 'Filial Connect', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
    if (f.includes('bioss')) return { label: 'Filial Bioss', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' }
    return { label: 'Filial Conectada', bg: 'bg-secondary text-muted-foreground border-border' }
  }

  const badgeInfo = getBranchBadge()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 md:sticky md:top-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-4 gap-4">
        {/* Mobile Hamburger Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 md:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto, código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs bg-background/80"
            />
          </div>
        </form>

        {/* Action Header Icons & Controls */}
        <div className="flex items-center gap-1.5" ref={popoverRef}>
          {/* Dollar Rate Live Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[11px] leading-none"
            title={`Cotação Dólar em tempo real via API. Última atualização: ${lastUpdatedTime || 'agora'}`}
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-[11px]">
                $1.00 = R$ {liveRate ? liveRate.toFixed(2) : '5.40'}
              </span>
              <span className="text-[9px] text-muted-foreground opacity-85 leading-tight">
                {lastUpdatedTime ? `Atualizado às ${lastUpdatedTime}` : 'Ao vivo'}
              </span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* 1. Notifications Button */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveMenu(activeMenu === 'notifications' ? null : 'notifications')}
              className={`relative ${activeMenu === 'notifications' ? 'bg-secondary text-foreground' : ''}`}
              title="Central de Notificações da Empresa"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Button>

            {/* Notifications Popover */}
            {activeMenu === 'notifications' && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border/80 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-border/40 bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">Alertas ({user?.isFilial ? badgeInfo.label : 'Pharmix Matriz'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline mr-1"
                        title="Limpar todos os alertas da lista"
                      >
                        <Trash2 className="h-3 w-3" /> Limpar Todos
                      </button>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {notifications.length}
                    </span>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
                  {loadingNotifications ? (
                    <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Carregando alertas...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center space-y-1">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                      <p className="text-xs font-semibold">Tudo sob controle!</p>
                      <p className="text-[10px] text-muted-foreground">Nenhum alerta pendente para a sua unidade.</p>
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          router.push(item.link)
                          setActiveMenu(null)
                        }}
                        className="p-3 hover:bg-secondary/60 cursor-pointer transition-colors space-y-1 group relative"
                      >
                        <div className="flex items-center justify-between pr-6">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            {item.type === 'stock' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            {item.type === 'sale' && <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />}
                            {item.type === 'purchase' && <Package className="h-3.5 w-3.5 text-emerald-500" />}
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug pr-6">{item.description}</p>
                        
                        {/* Individual Dismiss/Delete Button */}
                        <button
                          onClick={(e) => handleDismissNotification(item.id, e)}
                          className="absolute right-2.5 top-3 p-1 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 opacity-60 hover:opacity-100 transition-all"
                          title="Excluir notificação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-border/40 bg-secondary/20 text-center">
                  <button
                    onClick={loadNotifications}
                    className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Atualizar Alertas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Button */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveMenu(activeMenu === 'profile' ? null : 'profile')}
              className={`rounded-full border border-primary/20 ${activeMenu === 'profile' ? 'bg-primary/20' : ''}`}
              title="Perfil do Usuário"
            >
              <User className="h-4 w-4 text-primary" />
            </Button>

            {/* Profile Menu Popover */}
            {activeMenu === 'profile' && (
              <div className="absolute right-0 mt-2 w-72 bg-card border border-border/80 rounded-xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info Header */}
                <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold truncate leading-tight">{user?.name || 'Usuário'}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'usuario@pharmix.com'}</p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Empresa / Unidade:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeInfo.bg}`}>
                      {badgeInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nível de Acesso:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                      {user?.isSupervisor ? 'Supervisão Geral & Auditoria' : user?.isFilial ? 'Gestor de Filial' : 'Administrador Matriz'}
                    </span>
                  </div>
                </div>

                {/* Logout Footer Button */}
                <div className="pt-2 border-t border-border/40">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full gap-2 text-xs font-bold"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair da Conta
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
