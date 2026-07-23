'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Search, 
  Settings, 
  User, 
  Menu, 
  X, 
  LogOut, 
  AlertTriangle, 
  Package, 
  ShoppingBag, 
  Sliders, 
  CheckCircle2, 
  RefreshCw,
  ShieldCheck
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
  const [activeMenu, setActiveMenu] = useState<'notifications' | 'settings' | 'profile' | null>(null)
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  // Settings State
  const [settings, setSettings] = useState({
    defaultWarehouse: 'Dubai',
    fallbackExchangeRate: '5.40',
    compactView: false,
    autoRefresh: true
  })

  // Popover container ref for click outside
  const popoverRef = useRef<HTMLDivElement>(null)

  // Load user settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pharmix_erp_config')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.error('Error parsing local settings', e)
      }
    }
  }, [])

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

  // Fetch live notifications from Supabase
  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const supabase = createClient()
      const list: NotificationItem[] = []

      // 1. Fetch Low Stock Items (quantity <= 5)
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
            title: '⚠️ Estoque Crítico',
            description: `${item.products?.name || 'Medicamento'} em ${item.warehouse || 'Dubai'} tem apenas ${item.quantity} un.`,
            type: 'stock',
            link: '/estoque',
            time: 'Agora'
          })
        })
      }

      // 2. Fetch Pending Sales
      const { data: pendingSales } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'PENDENTE')
        .order('created_at', { ascending: false })
        .limit(3)

      if (pendingSales) {
        pendingSales.forEach(sale => {
          list.push({
            id: `sale-${sale.id}`,
            title: '📦 Venda Pendente',
            description: `Venda para ${sale.customer_name?.slice(0, 25)}... aguarda envio.`,
            type: 'sale',
            link: '/vendas',
            time: new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          })
        })
      }

      // 3. Fetch Pending Purchases
      const { data: pendingPurchases } = await supabase
        .from('purchases')
        .select('*, products(name)')
        .or('status.ilike.%PENDENTE%')
        .order('created_at', { ascending: false })
        .limit(3)

      if (pendingPurchases) {
        pendingPurchases.forEach(pur => {
          list.push({
            id: `pur-${pur.id}`,
            title: '🛒 Compra Pendente',
            description: `Pedido de ${pur.products?.name || 'Produto'} (${pur.quantity} un.) aguarda recebimento.`,
            type: 'purchase',
            link: '/compras',
            time: new Date(pur.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          })
        })
      }

      setNotifications(list)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 45000) // auto-refresh every 45s
    return () => clearInterval(interval)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/produtos?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSaveSettings = () => {
    localStorage.setItem('pharmix_erp_config', JSON.stringify(settings))
    toast.success('Configurações salvas no navegador com sucesso!')
    setActiveMenu(null)
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
    } catch (err) {
      toast.error('Erro ao sair da conta')
    }
  }

  const getBranchBadge = () => {
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
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* 1. Notifications Button */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveMenu(activeMenu === 'notifications' ? null : 'notifications')}
              className={`relative ${activeMenu === 'notifications' ? 'bg-secondary text-foreground' : ''}`}
              title="Central de Notificações"
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
                    <span className="text-sm font-bold">Central de Alertas</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {notifications.length} alertas
                  </span>
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
                      <p className="text-[10px] text-muted-foreground">Nenhum estoque crítico ou pedido pendente no momento.</p>
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          router.push(item.link)
                          setActiveMenu(null)
                        }}
                        className="p-3 hover:bg-secondary/60 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            {item.type === 'stock' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            {item.type === 'sale' && <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />}
                            {item.type === 'purchase' && <Package className="h-3.5 w-3.5 text-emerald-500" />}
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
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

          {/* 2. Settings Button */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
              className={activeMenu === 'settings' ? 'bg-secondary text-foreground' : ''}
              title="Configurações do ERP"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Settings Modal Popover */}
            {activeMenu === 'settings' && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border/80 rounded-xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">Configurações do Sistema</h3>
                  </div>
                  <button onClick={() => setActiveMenu(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[10px]">Armazém Principal Padrão</label>
                    <select
                      value={settings.defaultWarehouse}
                      onChange={e => setSettings({ ...settings, defaultWarehouse: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                    >
                      <option value="Dubai">Dubai (Matriz Principal)</option>
                      <option value="Uruguai">Uruguai (Zona Franca)</option>
                      <option value="Panamá">Panamá (Hub Logístico)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[10px]">Câmbio Padrão Fallback (USD ➔ BRL)</label>
                    <Input
                      type="number"
                      step="0.05"
                      value={settings.fallbackExchangeRate}
                      onChange={e => setSettings({ ...settings, fallbackExchangeRate: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="bg-secondary/40 p-3 rounded-lg border border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Status Supabase Realtime</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Versão do Sistema</span>
                      <span className="font-mono font-semibold">Pharmix v2.4 (2026)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <Button size="sm" variant="outline" onClick={() => setActiveMenu(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveSettings}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 3. User Profile Button */}
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
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                      {user?.isFilial ? 'Gestor de Filial' : 'Administrador Matriz'}
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
