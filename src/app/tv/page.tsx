'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  ArrowLeft, 
  RefreshCw, 
  Trophy, 
  Target,
  Boxes,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Custom tooltip styling for TV
const CustomTVTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121826]/90 border border-emerald-500/30 backdrop-blur-md p-3 rounded-lg shadow-xl">
        <p className="text-[11px] font-bold text-muted-foreground uppercase">{`Dia ${label}`}</p>
        <p className="text-sm font-extrabold text-emerald-400 font-mono">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

interface BranchRank {
  branch: string
  label: string
  value: number
  color: string
}

interface UrgentLot {
  id: string
  productName: string
  batchNumber: string
  quantity: number
  expiryDate: Date
  daysRemaining: number
  branch: string
}

export default function TVDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Session guard
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login')
      } else if (user.isFilial) {
        router.replace('/dashboard')
        toast.error('Acesso negado: Filiais não possuem acesso ao monitor de TV.')
      }
    }
  }, [user, loading, router])

  // Core metrics & lists
  const [sales, setSales] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [totalBilling, setTotalBilling] = useState(0)
  const [todayBilling, setTodayBilling] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [monthlyGoal, setMonthlyGoal] = useState(150000) // Default BRL monthly goal
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Carousel & Progress states
  const [activeSlide, setActiveSlide] = useState<'sales' | 'inventory'>('sales')
  const [slideProgress, setSlideProgress] = useState(0)

  // Stock slide metrics
  const [stockMetrics, setStockMetrics] = useState({
    totalItems: 0,
    expiredLotsCount: 0,
    warningLotsCount: 0,
  })
  const [urgentLots, setUrgentLots] = useState<UrgentLot[]>([])

  // Branch Rankings
  const [branchRanking, setBranchRanking] = useState<BranchRank[]>([])

  // Load configuration from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGoal = localStorage.getItem('tv_monthly_goal')
      if (savedGoal) {
        setMonthlyGoal(parseFloat(savedGoal))
      }
    }
  }, [])

  const handleGoalChange = (newGoal: string) => {
    const val = parseFloat(newGoal) || 0
    setMonthlyGoal(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tv_monthly_goal', val.toString())
    }
  }

  // Load database context for the TV
  async function loadTVData() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      // 1. Fetch sales of the current month
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(name)')
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })

      const activeSales = salesData || []
      setSales(activeSales)
      setSalesCount(activeSales.length)

      // Calculate total BRL billing
      const sumBrl = activeSales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
      setTotalBilling(sumBrl)

      // Calculate today's BRL billing
      const todayTotal = activeSales
        .filter(sale => new Date(sale.created_at) >= startOfToday)
        .reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
      setTodayBilling(todayTotal)

      // Build daily data for the current month
      const totalDays = endOfMonth.getDate()
      const daysArray = Array.from({ length: totalDays }, (_, i) => ({
        day: i + 1,
        vendas: 0
      }))

      activeSales.forEach(sale => {
        const saleDate = new Date(sale.created_at)
        const dayNum = saleDate.getDate()
        if (dayNum >= 1 && dayNum <= totalDays) {
          daysArray[dayNum - 1].vendas += (sale.total_amount || 0)
        }
      })
      setDailyData(daysArray)

      // Calculate branch rankings
      const branchBillingMap: Record<string, number> = {}
      activeSales.forEach((s: any) => {
        let branch = 'pharmix'
        try {
          const parsed = JSON.parse(s.customer_name)
          if (parsed && parsed.branch) {
            branch = parsed.branch
          }
        } catch {}
        const amount = parseFloat(s.total_amount) || 0
        branchBillingMap[branch] = (branchBillingMap[branch] || 0) + amount
      })

      const branchColors: Record<string, string> = {
        pharmix: 'from-indigo-500 to-indigo-650',
        trade: 'from-emerald-500 to-emerald-600',
        connect: 'from-blue-500 to-blue-600',
        connecthealth: 'from-amber-500 to-amber-600',
      }

      const branchLabels: Record<string, string> = {
        pharmix: 'Matriz Pharmix',
        trade: 'Filial Trade',
        connect: 'Filial Connect',
        connecthealth: 'Filial ConnectHealth',
      }

      const sortedRanks = Object.entries(branchBillingMap)
        .map(([branch, value]) => ({
          branch,
          label: branchLabels[branch] || branch.toUpperCase(),
          value,
          color: branchColors[branch] || 'from-slate-500 to-slate-650'
        }))
        .sort((a, b) => b.value - a.value)
      
      setBranchRanking(sortedRanks)

      // 2. Fetch stock data for Expiry/Inventory slide
      const { data: stockData } = await supabase
        .from('stock')
        .select('*, products(name, code)')
        .order('expiry_date', { ascending: true })

      const allStock = stockData || []
      let totalItems = 0
      let expiredLotsCount = 0
      let warningLotsCount = 0
      const calculatedUrgentLots: UrgentLot[] = []

      allStock.forEach((item: any) => {
        if (item.status === 'OUT_OF_STOCK' || (item.quantity ?? 0) <= 0) return

        totalItems += item.quantity || 0
        const expDate = item.expiry_date || item.expiryDate
        if (!expDate) return

        const expiry = new Date(expDate)
        const today = new Date()
        expiry.setHours(0,0,0,0)
        today.setHours(0,0,0,0)
        const diffTime = expiry.getTime() - today.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (days <= 0) {
          expiredLotsCount++
        } else if (days <= 90) {
          warningLotsCount++
        }

        if (days <= 90) {
          calculatedUrgentLots.push({
            id: item.id,
            productName: item.products?.name || 'Medicamento',
            batchNumber: item.batch_number || item.batchNumber || 'LOTE-N/A',
            quantity: item.quantity,
            expiryDate: expiry,
            daysRemaining: days,
            branch: item.branch || 'Matriz Pharmix'
          })
        }
      })

      setStockMetrics({
        totalItems,
        expiredLotsCount,
        warningLotsCount
      })
      setUrgentLots(calculatedUrgentLots.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 6))

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading TV data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Periodic API loaders
  useEffect(() => {
    loadTVData()
    const interval = setInterval(() => {
      loadTVData()
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Slide Rotation Timers (12 seconds per slide)
  useEffect(() => {
    const slideDuration = 12000
    const step = 100
    let elapsed = 0

    const progressTimer = setInterval(() => {
      elapsed += step
      setSlideProgress((elapsed / slideDuration) * 100)

      if (elapsed >= slideDuration) {
        elapsed = 0
        setActiveSlide(prev => (prev === 'sales' ? 'inventory' : 'sales'))
      }
    }, step)

    return () => clearInterval(progressTimer)
  }, [])

  const goalPercentage = Math.min(100, Math.max(0, (totalBilling / (monthlyGoal || 1)) * 100))
  const formatBrl = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  if (loading || !user || user.isFilial) {
    return (
      <div className="min-h-screen bg-[#070A13] flex items-center justify-center">
        <div className="text-muted-foreground text-sm font-semibold animate-pulse">
          Carregando painel de monitoramento...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070A13] text-foreground flex flex-col justify-between p-6 select-none overflow-hidden font-sans relative">
      
      {/* Top Slide Transition Indicator */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/10 z-50">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_10px_#10B981]"
          style={{ width: `${slideProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/25 pb-4 mt-1">
        <div className="flex items-center gap-3">
          <a 
            href="/dashboard" 
            className="flex items-center justify-center p-2 rounded-lg bg-[#111625] border border-border/40 hover:bg-[#1a2136] transition-all duration-300 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent uppercase flex items-center gap-2">
              <span>Monitor Corporativo</span>
              <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 uppercase tracking-widest font-mono">
                {activeSlide === 'sales' ? 'Visão Comercial' : 'Controle de Estoque'}
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">
              Matriz &amp; Filiais • Pharmix Global ERP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Meta de Faturamento (BRL)</span>
            <input 
              type="number" 
              value={monthlyGoal} 
              onChange={e => handleGoalChange(e.target.value)}
              className="bg-transparent text-right font-mono font-extrabold text-indigo-400 text-lg border-b border-border/20 focus:border-indigo-500 outline-none w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#101524] px-4 py-2 rounded-lg border border-border/40 text-xs font-mono text-muted-foreground">
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Slide 1: COMMERCIAL OVERVIEW */}
      {activeSlide === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4 flex-1 animate-in fade-in zoom-in-95 duration-500">
          {/* Left Column: Commercial Key Metrics */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Card 1: Faturamento Mensal */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <DollarSign className="h-32 w-32 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-400" /> Faturamento Mensal
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-emerald-400 mt-4 tracking-tight">
                  {formatBrl(totalBilling)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Acumulado consolidado do mês corrente
                </p>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Pedidos no mês:</span>
                <span className="font-bold text-foreground text-sm">{salesCount} vendas</span>
              </div>
            </div>

            {/* Card 2: Faturamento de Hoje */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <TrendingUp className="h-32 w-32 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-400" /> Faturamento Hoje (Dia)
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-teal-400 mt-4 tracking-tight">
                  {formatBrl(todayBilling)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Vendas realizadas na data de hoje
                </p>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Status do Dia:</span>
                <span className={`font-bold text-xs uppercase px-2 py-0.5 rounded ${todayBilling > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  {todayBilling > 0 ? '📈 Movimentado' : 'Sem vendas'}
                </span>
              </div>
            </div>

            {/* Card 3: Meta e Progresso */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Trophy className="h-32 w-32 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-indigo-400" /> Progresso da Meta
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-indigo-400 mt-4 tracking-tight">
                  {goalPercentage.toFixed(1)}%
                </div>
                <div className="w-full bg-[#161D30] rounded-full h-3 mt-4 overflow-hidden border border-border/30">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-3 rounded-full transition-all duration-1000 shadow-glow" 
                    style={{ width: `${goalPercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Falta para meta:</span>
                <span className="font-bold text-foreground">
                  {totalBilling >= monthlyGoal 
                    ? 'Meta Batida! 🏆' 
                    : formatBrl(monthlyGoal - totalBilling)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Evolution Chart */}
          <div className="lg:col-span-1 bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Progressão Diária de Vendas
              </h3>
              <p className="text-xs text-muted-foreground">Histórico financeiro por dia do mês atual</p>
            </div>

            <div className="flex-1 min-h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A2235" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#475569" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip content={<CustomTVTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar 
                    dataKey="vendas" 
                    fill="url(#tvBarGrad)" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <defs>
                    <linearGradient id="tvBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Branch Leaderboard */}
          <div className="lg:col-span-1 bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-indigo-400" /> Corrida de Faturamento (Filiais)
              </h3>
              <p className="text-xs text-muted-foreground">Classificação por volume acumulado no mês</p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4 mt-6">
              {branchRanking.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground">Sem faturamento registrado nas unidades.</div>
              ) : (
                branchRanking.map((rank, index) => {
                  const maxVal = branchRanking[0]?.value || 1
                  const widthPercent = (rank.value / maxVal) * 100
                  const medals = ['🥇', '🥈', '🥉']

                  return (
                    <div key={rank.branch} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="w-5 text-center font-bold text-xs">{medals[index] || `#${index + 1}`}</span>
                          <span className="text-foreground">{rank.label}</span>
                        </span>
                        <span className="font-mono text-foreground font-bold">{formatBrl(rank.value)}</span>
                      </div>
                      <div className="w-full bg-[#161D30] rounded-full h-4 overflow-hidden border border-border/30 flex items-center">
                        <div 
                          className={`bg-gradient-to-r ${rank.color} h-3.5 rounded-full transition-all duration-1005`} 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide 2: INVENTORY & VALIDADE MONITOR */}
      {activeSlide === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4 flex-1 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Left Column: Stock Counters */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Card 1: Total de Itens em Estoque */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Boxes className="h-32 w-32 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-indigo-400" /> Total em Estoque
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-indigo-400 mt-4 tracking-tight">
                  {stockMetrics.totalItems.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total de unidades físicas disponíveis na Matriz
                </p>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Status do Inventário:</span>
                <span className="font-bold text-emerald-400 uppercase">Estável 🟢</span>
              </div>
            </div>

            {/* Card 2: Lotes Vencidos */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <AlertTriangle className="h-32 w-32 text-rose-500" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500" /> Lotes Vencidos
                </span>
                <div className={`text-4xl xl:text-5xl font-black font-mono mt-4 tracking-tight ${stockMetrics.expiredLotsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                  {stockMetrics.expiredLotsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lotes expirados que exigem devolução imediata
                </p>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Ação Recomendada:</span>
                <span className={`font-bold text-xs uppercase ${stockMetrics.expiredLotsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {stockMetrics.expiredLotsCount > 0 ? '⚠️ Devolver Lotes' : 'Nenhuma Pendência'}
                </span>
              </div>
            </div>

            {/* Card 3: Lotes Próximos do Vencimento */}
            <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Target className="h-32 w-32 text-amber-500" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-amber-500" /> Lotes Próximos a Vencer
                </span>
                <div className={`text-4xl xl:text-5xl font-black font-mono mt-4 tracking-tight ${stockMetrics.warningLotsCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {stockMetrics.warningLotsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Medicamentos vencendo nos próximos 90 dias
                </p>
              </div>
              <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">Período de Monitoria:</span>
                <span className="font-bold text-foreground">90 Dias de Alerta</span>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Urgent Lots Expiry Table */}
          <div className="lg:col-span-2 bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Painel de Alerta: Validades Mais Críticas
              </h3>
              <p className="text-xs text-muted-foreground">Fique atento aos prazos de vencimento dos lotes de medicamentos ativos</p>
            </div>

            <div className="flex-1 mt-6 overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/40 pb-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      <th className="py-2">Medicamento</th>
                      <th className="py-2">Lote</th>
                      <th className="py-2 text-center">Unidades</th>
                      <th className="py-2 text-center">Data Validade</th>
                      <th className="py-2 text-right">Prazo Restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urgentLots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum lote crítico no momento. Parabéns! 🟢</td>
                      </tr>
                    ) : (
                      urgentLots.map((lot) => {
                        const isExpired = lot.daysRemaining <= 0
                        const isCritical = lot.daysRemaining > 0 && lot.daysRemaining <= 30
                        
                        let tagClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        let text = `${lot.daysRemaining} dias`
                        
                        if (isExpired) {
                          tagClass = 'bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse font-extrabold'
                          text = 'EXPIRED 🔴'
                        } else if (isCritical) {
                          tagClass = 'bg-red-500/10 text-red-500 border-red-500/20 font-bold'
                          text = `${lot.daysRemaining} dias (CRÍTICO)`
                        } else {
                          tagClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          text = `${lot.daysRemaining} dias (ALERTA)`
                        }

                        return (
                          <tr key={lot.id} className="border-b border-border/20 hover:bg-[#161D30]/35 transition-colors">
                            <td className="py-3 font-sans font-bold text-foreground text-sm truncate max-w-[180px]" title={lot.productName}>
                              {lot.productName}
                            </td>
                            <td className="py-3 font-mono font-bold text-indigo-400">{lot.batchNumber}</td>
                            <td className="py-3 text-center text-foreground font-bold">{lot.quantity}</td>
                            <td className="py-3 text-center text-muted-foreground">{new Date(lot.expiryDate).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 text-right">
                              <span className={`px-2.5 py-1 rounded-md border text-[10px] ${tagClass}`}>
                                {text}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Feed de Últimas Vendas */}
      <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-4 shadow-2xl">
        <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4 text-emerald-400" /> Últimas Vendas em Tempo Real (Matriz &amp; Filiais)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {sales.length === 0 ? (
            <div className="col-span-5 text-center text-xs text-muted-foreground py-2">
              Nenhuma venda registrada este mês.
            </div>
          ) : (
            sales.slice(0, 5).map((sale, i) => (
              <div 
                key={sale.id} 
                className={`bg-[#121826]/70 border rounded-xl p-3 flex flex-col justify-between transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${
                  i === 0 ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.08)] bg-[#121d28]/70' : 'border-border/40'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[80px] font-bold">{sale.customer_name || 'N/A'}</span>
                  <span>{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-1.5 text-xs font-bold text-foreground truncate" title={sale.products?.name}>
                  {sale.products?.name || 'Medicamento'}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">{sale.quantity} un.</span>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono">
                    {formatBrl(sale.total_amount || 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
