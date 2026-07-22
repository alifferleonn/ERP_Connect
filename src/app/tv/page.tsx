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
import pharmixLogo from '@/public/pharmix.png'
import tradeLogo from '@/public/trade.webp'
import connectLogo from '@/public/connect.png'
import biossLogo from '@/public/bioss.png'

// Custom high-contrast large tooltip for TV
const CustomTVTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border-4 border-white p-3 rounded shadow-2xl">
        <p className="text-sm font-black text-zinc-300 uppercase">{`Dia ${label}`}</p>
        <p className="text-xl font-black text-green-400 font-mono">
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

async function getExchangeRate(): Promise<number> {
  if (typeof window === 'undefined') return 5.4
  const CACHE_KEY = 'usd_brl_rate'
  const CACHE_TIME_KEY = 'usd_brl_rate_timestamp'
  const ONE_HOUR = 60 * 60 * 1000

  const cachedRate = localStorage.getItem(CACHE_KEY)
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY)
  const now = Date.now()

  if (cachedRate && cachedTime && (now - parseInt(cachedTime) < ONE_HOUR)) {
    return parseFloat(cachedRate)
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    if (data && data.rates && data.rates.BRL) {
      const rate = data.rates.BRL
      localStorage.setItem(CACHE_KEY, rate.toString())
      localStorage.setItem(CACHE_TIME_KEY, now.toString())
      return rate
    }
  } catch (err) {
    console.error('Failed to fetch exchange rate:', err)
  }

  return 5.4
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

      // Fetch live exchange rate
      const rate = await getExchangeRate()

      const getSaleBrlAmount = (s: any) => {
        const rawAmount = parseFloat(s.total_amount) || 0
        let isPharmixSale = true
        try {
          const parsed = JSON.parse(s.customer_name)
          if (parsed && parsed.branch && parsed.branch !== 'pharmix') {
            isPharmixSale = false
          }
        } catch {
          isPharmixSale = true
        }

        // Convert Pharmix USD sales to BRL. Filial sales are already in BRL.
        return isPharmixSale ? rawAmount * rate : rawAmount
      }

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
      const sumBrl = activeSales.reduce((acc, curr) => acc + getSaleBrlAmount(curr), 0)
      setTotalBilling(sumBrl)

      // Calculate today's BRL billing
      const todayTotal = activeSales
        .filter(sale => new Date(sale.created_at) >= startOfToday)
        .reduce((acc, curr) => acc + getSaleBrlAmount(curr), 0)
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
          daysArray[dayNum - 1].vendas += getSaleBrlAmount(sale)
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
        const amountBrl = getSaleBrlAmount(s)
        branchBillingMap[branch] = (branchBillingMap[branch] || 0) + amountBrl
      })

      const branchColors: Record<string, string> = {
        pharmix: 'bg-indigo-500',
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
        <div className="text-white text-lg font-black animate-pulse">
          Carregando painel de monitoramento...
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen max-h-screen bg-black text-white flex flex-col justify-between p-6 select-none overflow-hidden font-sans relative">
      
      {/* Top Slide Transition Indicator - Thicker for TV visibility */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-zinc-950 z-50">
        <div 
          className="h-full bg-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_20px_#10B981]"
          style={{ width: `${slideProgress}%` }}
        />
      </div>

      {/* Header - Bigger text, higher contrast */}
      <div className="flex items-center justify-between border-b-4 border-zinc-800 pb-4 mt-2">
        <div className="flex items-center gap-4">
          <a 
            href="/dashboard" 
            className="flex items-center justify-center p-3 rounded bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </a>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
              <span>MONITOR CORPORATIVO</span>
              <span className="text-sm bg-white text-black font-extrabold px-3 py-1 rounded tracking-widest font-mono">
                {activeSlide === 'sales' ? 'VENDAS & METAS' : 'ESTOQUE & VALIDADE'}
              </span>
            </h1>
          </div>
        </div>
        {/* Group Logos */}
        <div className="hidden lg:flex items-center gap-6 bg-white px-5 py-2 rounded border-2 border-zinc-800">
          <img src={pharmixLogo.src} alt="Pharmix" className="h-8 object-contain" />
          <img src={tradeLogo.src} alt="Trade" className="h-8 object-contain" />
          <img src={connectLogo.src} alt="Connect" className="h-8 object-contain" />
          <img src={biossLogo.src} alt="Bioss" className="h-8 object-contain" />
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-zinc-300 uppercase font-black block tracking-widest">META DO MÊS</span>
            <input 
              type="number" 
              value={monthlyGoal} 
              onChange={e => handleGoalChange(e.target.value)}
              className="bg-transparent text-right font-mono font-black text-indigo-400 text-2xl border-b-2 border-zinc-700 focus:border-white outline-none w-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2.5 rounded border-2 border-zinc-800 text-xs font-mono font-black text-white">
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>ATUALIZADO: {lastUpdated.toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Slide 1: COMMERCIAL OVERVIEW */}
      {activeSlide === 'sales' && (
        <div className="grid grid-cols-3 gap-6 my-4 flex-1 overflow-hidden h-[calc(100vh-250px)]">
          {/* Left Column: Commercial Key Metrics */}
          <div className="col-span-1 flex flex-col gap-4 h-full">
            {/* Card 1: Faturamento Mês */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" /> FATURAMENTO MENSAL
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-emerald-400 mt-3 tracking-tight">
                  {formatBrl(totalBilling)}
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Pedidos no mês:</span>
                <span className="font-black text-white text-base">{salesCount} vendas</span>
              </div>
            </div>

            {/* Card 2: Faturamento de Hoje */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-400" /> FATURAMENTO DE HOJE
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-cyan-400 mt-3 tracking-tight">
                  {formatBrl(todayBilling)}
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Status do Dia:</span>
                <span className={`font-black text-sm uppercase px-3 py-1 rounded ${todayBilling > 0 ? 'bg-emerald-500 text-black font-black' : 'bg-zinc-800 text-zinc-300'}`}>
                  {todayBilling > 0 ? 'FATURADO' : 'SEM VENDAS'}
                </span>
              </div>
            </div>

            {/* Card 3: Meta e Progresso */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-400" /> PROGRESSO DA META
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-indigo-400 mt-3 tracking-tight">
                  {goalPercentage.toFixed(1)}%
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-5 mt-4 overflow-hidden border-2 border-zinc-800">
                  <div 
                    className="bg-indigo-500 h-full rounded transition-all duration-1000" 
                    style={{ width: `${goalPercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Pendente para atingir:</span>
                <span className="font-black text-white text-base">
                  {totalBilling >= monthlyGoal 
                    ? 'META CONCLUÍDA! 🏆' 
                    : formatBrl(monthlyGoal - totalBilling)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Center Column: Evolution Chart */}
          <div className="col-span-1 bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <TrendingUp className="h-5 w-5 text-emerald-400" /> EVOLUÇÃO DE VENDAS DIÁRIAS
              </h3>
            </div>

            <div className="flex-1 min-h-[220px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#ffffff" 
                    fontSize={11} 
                    fontWeight="bold"
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#ffffff" 
                    fontSize={10} 
                    fontWeight="bold"
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
          <div className="col-span-1 bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <Trophy className="h-5 w-5 text-indigo-400" /> FATURAMENTO POR FILIAL
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-5">
              {branchRanking.length === 0 ? (
                <div className="text-center text-xs text-zinc-500">Sem faturamento registrado.</div>
              ) : (
                branchRanking.map((rank, index) => {
                  const maxVal = branchRanking[0]?.value || 1
                  const widthPercent = (rank.value / maxVal) * 100
                  const medals = ['🥇', '🥈', '🥉', '4️⃣']

                  return (
                    <div key={rank.branch} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-center font-extrabold text-sm">{medals[index] || `#${index + 1}`}</span>
                          <span className="text-white text-base">{rank.label}</span>
                        </span>
                        <span className="font-mono text-emerald-400 font-black text-base">{formatBrl(rank.value)}</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded h-5 overflow-hidden border-2 border-zinc-850">
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
        <div className="grid grid-cols-3 gap-6 my-4 flex-1 overflow-hidden h-[calc(100vh-250px)]">
          
          {/* Left Column: Stock Counters */}
          <div className="col-span-1 flex flex-col gap-4 h-full">
            {/* Card 1: Total em Estoque */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-indigo-400" /> TOTAL EM ESTOQUE
                </span>
                <div className="text-4xl xl:text-5xl font-black font-mono text-white mt-3 tracking-tight">
                  {stockMetrics.totalItems.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Controle Físico:</span>
                <span className="font-black text-emerald-400 uppercase text-sm">ATIVADO</span>
              </div>
            </div>

            {/* Card 2: Lotes Vencidos */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" /> LOTES VENCIDOS (EXPIRADOS)
                </span>
                <div className={`text-4xl xl:text-5xl font-black font-mono mt-3 tracking-tight ${stockMetrics.expiredLotsCount > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                  {stockMetrics.expiredLotsCount}
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Ação Recomendada:</span>
                <span className={`font-black text-sm uppercase ${stockMetrics.expiredLotsCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {stockMetrics.expiredLotsCount > 0 ? 'RECOLHER AGORA' : 'NENHUM VENCIDO'}
                </span>
              </div>
            </div>

            {/* Card 3: Lotes Próximos do Vencimento */}
            <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between flex-1">
              <div>
                <span className="text-xs uppercase font-black text-zinc-300 tracking-widest flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-500" /> LOTES A VENCER (90 DIAS)
                </span>
                <div className={`text-4xl xl:text-5xl font-black font-mono mt-3 tracking-tight ${stockMetrics.warningLotsCount > 0 ? 'text-amber-500 font-black' : 'text-zinc-500'}`}>
                  {stockMetrics.warningLotsCount}
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-extrabold">Status de Validade:</span>
                <span className="font-black text-amber-400 uppercase text-sm">MONITORADO</span>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Urgent Lots Expiry Table */}
          <div className="col-span-2 bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-sm font-black tracking-widest text-zinc-300 flex items-center gap-2 uppercase">
                <AlertTriangle className="h-5 w-5 text-red-500" /> LOTES DE MEDICAMENTOS MAIS CRÍTICOS
              </h3>
            </div>

            <div className="flex-1 mt-4 overflow-hidden">
              <table className="w-full text-left text-sm font-mono">
                <thead>
                  <tr className="border-b-4 border-zinc-800 pb-3 text-xs text-zinc-300 uppercase tracking-widest font-black">
                    <th className="py-2.5">Medicamento</th>
                    <th className="py-2.5">Lote</th>
                    <th className="py-2.5 text-center">Quantidade</th>
                    <th className="py-2.5 text-center">Data Validade</th>
                    <th className="py-2.5 text-right">Validade Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentLots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 text-lg font-black">Nenhum lote crítico no momento. 🟢</td>
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
                        <tr key={lot.id} className="border-b-2 border-zinc-900 hover:bg-zinc-900/50">
                          <td className="py-3 font-sans font-black text-white text-base truncate max-w-[220px]" title={lot.productName}>
                            {lot.productName}
                          </td>
                          <td className="py-3 font-mono font-bold text-zinc-300 text-base">{lot.batchNumber}</td>
                          <td className="py-3 text-center text-white font-extrabold text-base">{lot.quantity}</td>
                          <td className="py-3 text-center text-zinc-350 font-bold text-base">{new Date(lot.expiryDate).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 text-right">
                            <span className={`px-3 py-1 rounded border-2 text-xs uppercase ${tagClass}`}>
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
      <div className="bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-4 mt-2">
        <h4 className="text-xs uppercase font-black text-zinc-300 tracking-widest mb-3 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-emerald-400" /> ÚLTIMAS VENDAS EM TEMPO REAL
        </h4>

        <div className="grid grid-cols-5 gap-4">
          {sales.length === 0 ? (
            <div className="col-span-5 text-center text-sm text-zinc-500 py-2">
              Nenhuma venda registrada.
            </div>
          ) : (
            sales.slice(0, 5).map((sale, i) => (
              <div 
                key={sale.id} 
                className={`bg-black border rounded-xl p-3 flex flex-col justify-between ${
                  i === 0 ? 'border-emerald-400 border-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-zinc-800 border-2'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-300 font-black uppercase">
                  <span className="truncate max-w-[90px]">{sale.customer_name || 'N/A'}</span>
                  <span>{new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-1.5 text-sm font-black text-white truncate" title={sale.products?.name}>
                  {sale.products?.name || 'Medicamento'}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-mono font-bold">{sale.quantity} un.</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
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
