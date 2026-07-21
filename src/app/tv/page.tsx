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

// Custom high-contrast tooltip for TV
const CustomTVTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border-2 border-white p-2 rounded shadow-2xl">
        <p className="text-[10px] font-bold text-zinc-400 uppercase">{`Dia ${label}`}</p>
        <p className="text-sm font-black text-green-400 font-mono">
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
  const [monthlyGoal, setMonthlyGoal] = useState(150000)
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

      // Calculate branch rankings (in BRL)
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
        pharmix: 'bg-indigo-600',
        trade: 'bg-emerald-500',
        connect: 'bg-blue-500',
        connecthealth: 'bg-amber-500',
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
          color: branchColors[branch] || 'bg-zinc-650'
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
      setUrgentLots(calculatedUrgentLots.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5))

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

  // Slide Rotation Timers (20 seconds per slide)
  useEffect(() => {
    const slideDuration = 20000
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-sm font-bold animate-pulse">
          Carregando painel de monitoramento...
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen max-h-screen bg-black text-white flex flex-col justify-between p-4 select-none overflow-hidden font-sans relative">
      
      {/* Top Slide Transition Indicator */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950 z-50">
        <div 
          className="h-full bg-emerald-500 transition-all duration-100 ease-linear shadow-[0_0_12px_#10B981]"
          style={{ width: `${slideProgress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5 mt-1">
        <div className="flex items-center gap-3">
          <a 
            href="/dashboard" 
            className="flex items-center justify-center p-2 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-850 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <span>Painel de Monitoramento</span>
              <span className="text-xs bg-white text-black font-extrabold px-2 py-0.5 rounded tracking-widest font-mono">
                {activeSlide === 'sales' ? 'VENDAS' : 'ESTOQUE & VALIDADE'}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-black block tracking-wider">META DO MÊS (R$)</span>
            <input 
              type="number" 
              value={monthlyGoal} 
              onChange={e => handleGoalChange(e.target.value)}
              className="bg-transparent text-right font-mono font-black text-white text-base border-b border-zinc-700 focus:border-white outline-none w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
            <RefreshCw className={`h-3 w-3 text-emerald-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>ATUALIZADO: {lastUpdated.toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Slide 1: COMMERCIAL OVERVIEW */}
      {activeSlide === 'sales' && (
        <div className="grid grid-cols-3 gap-4 my-3 flex-1 overflow-hidden h-[calc(100vh-210px)]">
          {/* Left Column: Commercial Key Metrics */}
          <div className="col-span-1 flex flex-col gap-3 h-full">
            {/* Card 1: Faturamento Mês */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-400" /> FATURAMENTO MENSAL
                </span>
                <div className="text-3xl xl:text-4xl font-black font-mono text-emerald-400 mt-2 tracking-tight">
                  {formatBrl(totalBilling)}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Pedidos no mês:</span>
                <span className="font-extrabold text-white text-xs">{salesCount} vendas</span>
              </div>
            </div>

            {/* Card 2: Faturamento Hoje */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-400" /> FATURAMENTO HOJE
                </span>
                <div className="text-3xl xl:text-4xl font-black font-mono text-cyan-400 mt-2 tracking-tight">
                  {formatBrl(todayBilling)}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Status do Dia:</span>
                <span className={`font-bold text-xs uppercase px-2 py-0.5 rounded ${todayBilling > 0 ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  {todayBilling > 0 ? 'CONCLUÍDO' : 'SEM MOVIMENTAÇÃO'}
                </span>
              </div>
            </div>

            {/* Card 3: Meta e Progresso */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-indigo-400" /> PROGRESSO DA META
                </span>
                <div className="text-3xl xl:text-4xl font-black font-mono text-indigo-400 mt-2 tracking-tight">
                  {goalPercentage.toFixed(1)}%
                </div>
                <div className="w-full bg-zinc-900 rounded h-3 mt-3 overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-indigo-500 h-full rounded transition-all duration-1000" 
                    style={{ width: `${goalPercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Pendente para atingir:</span>
                <span className="font-extrabold text-white text-xs">
                  {totalBilling >= monthlyGoal 
                    ? 'META CONCLUÍDA! 🏆' 
                    : formatBrl(monthlyGoal - totalBilling)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Evolution Chart */}
          <div className="col-span-1 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> EVOLUÇÃO DE VENDAS DIÁRIAS
              </h3>
            </div>

            <div className="flex-1 min-h-[220px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip content={<CustomTVTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar 
                    dataKey="vendas" 
                    fill="#10b981" 
                    radius={[2, 2, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Branch Leaderboard */}
          <div className="col-span-1 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <Trophy className="h-4 w-4 text-indigo-400" /> FATURAMENTO POR UNIDADE
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3">
              {branchRanking.length === 0 ? (
                <div className="text-center text-xs text-zinc-500">Sem faturamento registrado.</div>
              ) : (
                branchRanking.map((rank, index) => {
                  const maxVal = branchRanking[0]?.value || 1
                  const widthPercent = (rank.value / maxVal) * 100
                  const medals = ['🥇', '🥈', '🥉', '4️⃣']

                  return (
                    <div key={rank.branch} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 text-center font-bold text-xs">{medals[index] || `#${index + 1}`}</span>
                          <span className="text-white">{rank.label}</span>
                        </span>
                        <span className="font-mono text-emerald-400 font-extrabold">{formatBrl(rank.value)}</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded h-3 overflow-hidden border border-zinc-800">
                        <div 
                          className={`${rank.color} h-full rounded transition-all duration-1000`} 
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
        <div className="grid grid-cols-3 gap-4 my-3 flex-1 overflow-hidden h-[calc(100vh-210px)]">
          
          {/* Left Column: Stock Counters */}
          <div className="col-span-1 flex flex-col gap-3 h-full">
            {/* Card 1: Total em Estoque */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-indigo-400" /> TOTAL EM ESTOQUE
                </span>
                <div className="text-3xl xl:text-4xl font-black font-mono text-white mt-2 tracking-tight">
                  {stockMetrics.totalItems.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Controle Físico:</span>
                <span className="font-bold text-emerald-400 uppercase text-xs">ATUALIZADO</span>
              </div>
            </div>

            {/* Card 2: Lotes Vencidos */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500" /> LOTES VENCIDOS (EXPIRADOS)
                </span>
                <div className={`text-3xl xl:text-4xl font-black font-mono mt-2 tracking-tight ${stockMetrics.expiredLotsCount > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {stockMetrics.expiredLotsCount}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Ação Recomendada:</span>
                <span className={`font-bold text-xs uppercase ${stockMetrics.expiredLotsCount > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {stockMetrics.expiredLotsCount > 0 ? 'BAIXAR NO ESTOQUE' : 'NENHUM VENCIDO'}
                </span>
              </div>
            </div>

            {/* Card 3: Lotes Próximos do Vencimento */}
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between flex-1">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-amber-550" /> LOTES PRÓXIMOS A VENCER (90D)
                </span>
                <div className={`text-3xl xl:text-4xl font-black font-mono mt-2 tracking-tight ${stockMetrics.warningLotsCount > 0 ? 'text-amber-500 font-black' : 'text-zinc-500'}`}>
                  {stockMetrics.warningLotsCount}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">Status do Período:</span>
                <span className="font-bold text-amber-500 uppercase text-xs">SOB MONITORIA</span>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Urgent Lots Expiry Table */}
          <div className="col-span-2 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <AlertTriangle className="h-4 w-4 text-red-500" /> LOTES DE MEDICAMENTOS MAIS CRÍTICOS
              </h3>
            </div>

            <div className="flex-1 mt-4 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b-2 border-zinc-800 pb-2 text-[10px] text-zinc-400 uppercase tracking-widest font-black">
                    <th className="py-2">Medicamento</th>
                    <th className="py-2">Lote</th>
                    <th className="py-2 text-center">Unidades</th>
                    <th className="py-2 text-center">Data Validade</th>
                    <th className="py-2 text-right">Validade Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentLots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 font-bold">Nenhum lote crítico no momento. 🟢</td>
                    </tr>
                  ) : (
                    urgentLots.map((lot) => {
                      const isExpired = lot.daysRemaining <= 0
                      const isCritical = lot.daysRemaining > 0 && lot.daysRemaining <= 30
                      
                      let tagClass = 'bg-black text-green-400 border-green-500'
                      let text = `${lot.daysRemaining} dias`
                      
                      if (isExpired) {
                        tagClass = 'bg-red-650 text-black border-red-500 font-black'
                        text = 'VENCIDO 🔴'
                      } else if (isCritical) {
                        tagClass = 'bg-orange-500 text-black border-orange-500 font-black'
                        text = `${lot.daysRemaining} d (CRÍTICO)`
                      } else {
                        tagClass = 'bg-black text-yellow-500 border-yellow-500 font-bold'
                        text = `${lot.daysRemaining} d (ALERTA)`
                      }

                      return (
                        <tr key={lot.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                          <td className="py-2.5 font-sans font-black text-white text-sm truncate max-w-[200px]" title={lot.productName}>
                            {lot.productName}
                          </td>
                          <td className="py-2.5 font-mono font-bold text-zinc-300">{lot.batchNumber}</td>
                          <td className="py-2.5 text-center text-white font-extrabold">{lot.quantity}</td>
                          <td className="py-2.5 text-center text-zinc-400 font-bold">{new Date(lot.expiryDate).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded border text-[10px] uppercase ${tagClass}`}>
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
      )}

      {/* Footer: Feed de Últimas Vendas */}
      <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3.5 mt-1">
        <h4 className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mb-2 flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4 text-emerald-400" /> ÚLTIMAS VENDAS EM TEMPO REAL
        </h4>

        <div className="grid grid-cols-5 gap-3">
          {sales.length === 0 ? (
            <div className="col-span-5 text-center text-xs text-zinc-500 py-1">
              Nenhuma venda registrada.
            </div>
          ) : (
            sales.slice(0, 5).map((sale, i) => (
              <div 
                key={sale.id} 
                className={`bg-black border rounded p-2.5 flex flex-col justify-between ${
                  i === 0 ? 'border-emerald-400 border-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-zinc-400 font-bold uppercase">
                  <span className="truncate max-w-[85px]">{sale.customer_name || 'N/A'}</span>
                  <span>{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-1 text-xs font-black text-white truncate" title={sale.products?.name}>
                  {sale.products?.name || 'Medicamento'}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400 font-mono">{sale.quantity} un.</span>
                  <span className="text-xs font-black text-emerald-400 font-mono">
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
