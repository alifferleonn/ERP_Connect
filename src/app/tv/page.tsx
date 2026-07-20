'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { DollarSign, ShoppingCart, TrendingUp, ArrowLeft, RefreshCw, Trophy, Target } from 'lucide-react'
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

export default function TVDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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

  const [sales, setSales] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [totalBilling, setTotalBilling] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [monthlyGoal, setMonthlyGoal] = useState(150000) // Default BRL monthly goal
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

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

  async function loadTVData() {
    try {
      const supabase = createClient()
      const now = new Date()
      
      // Calculate start and end of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)

      // Fetch sales in the current month
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*, products(name)')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false })

      if (salesErr) throw salesErr

      const activeSales = salesData || []
      setSales(activeSales)
      setSalesCount(activeSales.length)

      // Calculate total BRL billing
      const sumBrl = activeSales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
      setTotalBilling(sumBrl)

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
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading TV data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTVData()

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadTVData()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const goalPercentage = Math.min(100, Math.max(0, (totalBilling / (monthlyGoal || 1)) * 100))

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
    <div className="min-h-screen bg-[#070A13] text-foreground flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/25 pb-4">
        <div className="flex items-center gap-3">
          <a 
            href="/dashboard" 
            className="flex items-center justify-center p-2 rounded-lg bg-[#111625] border border-border/40 hover:bg-[#1a2136] transition-all duration-300 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent uppercase">
              Monitor de Vendas
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">
              Matriz &amp; Filiais • Monitoramento de Escritório
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4 flex-1">
        
        {/* Left column: Major Indicators */}
        <div className="flex flex-col gap-6 lg:col-span-1 justify-between">
          {/* Card 1: Faturamento Mensal */}
          <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="h-32 w-32 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-400" /> Faturamento Mensal
              </span>
              <div className="text-4xl xl:text-5xl font-black font-mono text-emerald-400 mt-4 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBilling)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Faturamento total no mês corrente (desde o dia 1)
              </p>
            </div>
            <div className="pt-4 border-t border-border/20 flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">Volume de pedidos:</span>
              <span className="font-bold text-foreground text-sm">{salesCount} vendas</span>
            </div>
          </div>

          {/* Card 2: Meta e Progresso */}
          <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between flex-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
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
                  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyGoal - totalBilling)
                }
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right columns: Daily sales progress chart */}
        <div className="lg:col-span-2 bg-[#0D1220]/75 border border-border/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Progressão Diária de Vendas
              </h3>
              <p className="text-xs text-muted-foreground">Faturamento por dia calendário do mês atual</p>
            </div>
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

      </div>

      {/* Footer: Feed de Últimas Vendas */}
      <div className="bg-[#0D1220]/75 border border-border/50 rounded-2xl p-4 shadow-2xl">
        <h4 className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
          <ShoppingCart className="h-4 w-4 text-emerald-400" /> Últimas Vendas em Tempo Real
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
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_amount || 0)}
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
