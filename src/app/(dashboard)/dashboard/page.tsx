'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'
import { 
  DollarSign, 
  ShoppingCart, 
  Boxes, 
  ClipboardList, 
  TrendingUp,
  Package,
  PieChart as PieIcon,
  BarChart3,
  Settings,
  Coins
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

async function getExchangeRate(): Promise<number> {
  if (typeof window === 'undefined') return 5.0
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
    const response = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await response.json()
    const rate = data.rates?.BRL
    if (rate) {
      localStorage.setItem(CACHE_KEY, rate.toString())
      localStorage.setItem(CACHE_TIME_KEY, now.toString())
      return rate
    }
  } catch (err) {
    console.error('Error fetching exchange rate:', err)
  }

  return cachedRate ? parseFloat(cachedRate) : 5.4 // fallback rate
}

export default function Page() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    billing: 0,
    purchasesTotal: 0,
    products: 0,
    salesCount: 0,
    purchasesCount: 0,
    suppliers: 0
  })
  const [salesHistory, setSalesHistory] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [topProductsData, setTopProductsData] = useState<any[]>([])
  const [filterRange, setFilterRange] = useState<'year' | '3months' | 'thismonth'>('year')

  // Cash flow control states
  const [initialCash, setInitialCash] = useState<number>(50000)
  const [isCashModalOpen, setIsCashModalOpen] = useState(false)
  const [tempCashInput, setTempCashInput] = useState('50000')
  const [cashFlowMetrics, setCashFlowMetrics] = useState({
    currentCash: 50000,
    expectedRevenue: 0
  })

  useEffect(() => {
    setMounted(true)
    async function loadData() {
      try {
        const supabase = createClient()
        const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))
        const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connecthealth') ? 'connecthealth' : user?.email?.includes('connect') ? 'connect' : null)
        
        let purchasesQuery = supabase.from('purchases').select('total_amount, created_at, status')
        if (isFilial) {
          purchasesQuery = purchasesQuery.eq('supplier_id', '91b41559-4e56-4301-bae7-38a19b5bf35f')
        }

        // Fetch all metrics concurrently from Supabase
        const [
          { count: productsCount },
          { count: suppliersCount },
          { data: salesData },
          { data: purchasesData }
        ] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('suppliers').select('*', { count: 'exact', head: true }),
          supabase.from('sales').select('total_amount, created_at, customer_name, status, product_id, products(name)'),
          purchasesQuery
        ])

        const rate = await getExchangeRate()
        const multiplier = isFilial ? rate : 1

        const nowRange = new Date()
        let minDate: Date | null = null

        if (filterRange === '3months') {
          minDate = new Date()
          minDate.setMonth(nowRange.getMonth() - 3)
        } else if (filterRange === 'thismonth') {
          minDate = new Date(nowRange.getFullYear(), nowRange.getMonth(), 1)
        } else if (filterRange === 'year') {
          minDate = new Date()
          minDate.setFullYear(nowRange.getFullYear() - 1)
        }

        // Filter sales by branch and date
        const filteredSales = (salesData || []).filter((s) => {
          const date = new Date(s.created_at)
          if (minDate && date < minDate) return false

          if (isFilial) {
            try {
              const parsed = JSON.parse(s.customer_name)
              return parsed.branch === filialName
            } catch {
              return false
            }
          } else {
            // Pharmix user
            try {
              const parsed = JSON.parse(s.customer_name)
              return !parsed.branch || parsed.branch === 'pharmix'
            } catch {
              // Not JSON, so it belongs to Pharmix
              return true
            }
          }
        })

        // Filter purchases by branch and date
        const filteredPurchases = (purchasesData || []).filter((p) => {
          const date = new Date(p.created_at)
          if (minDate && date < minDate) return false

          const statusStr = p.status || ''
          const hasSuffix = statusStr.includes('_')
          const suffix = hasSuffix ? statusStr.split('_')[1] : null
          if (isFilial) {
            return suffix === filialName
          } else {
            return !suffix || suffix === 'pharmix'
          }
        })

        const billingTotal = filteredSales.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)
        const purchasesTotal = filteredPurchases.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0) * multiplier

        setMetrics({
          billing: billingTotal,
          purchasesTotal: purchasesTotal,
          products: productsCount || 0,
          salesCount: filteredSales.length,
          purchasesCount: filteredPurchases.length,
          suppliers: suppliersCount || 0
        })

        // Generate dynamic sales vs purchases chart data based on filter range
        let history: any[] = []

        if (filterRange === 'thismonth') {
          const daysInMonth = new Date(nowRange.getFullYear(), nowRange.getMonth() + 1, 0).getDate()
          for (let day = 1; day <= daysInMonth; day++) {
            const salesVal = filteredSales
              .filter(s => {
                const sDate = new Date(s.created_at)
                return sDate.getDate() === day && sDate.getMonth() === nowRange.getMonth() && sDate.getFullYear() === nowRange.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)

            const purchasesVal = filteredPurchases
              .filter(p => {
                const pDate = new Date(p.created_at)
                return pDate.getDate() === day && pDate.getMonth() === nowRange.getMonth() && pDate.getFullYear() === nowRange.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0) * multiplier

            history.push({
              name: `${day.toString().padStart(2, '0')}`,
              vendas: salesVal,
              compras: purchasesVal
            })
          }
        } else if (filterRange === '3months') {
          const monthsLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          for (let i = 2; i >= 0; i--) {
            const d = new Date()
            d.setMonth(nowRange.getMonth() - i)
            const mLabel = monthsLabel[d.getMonth()]
            const yearSuffix = d.getFullYear().toString().substring(2)

            const salesVal = filteredSales
              .filter(s => {
                const sDate = new Date(s.created_at)
                return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)

            const purchasesVal = filteredPurchases
              .filter(p => {
                const pDate = new Date(p.created_at)
                return pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0) * multiplier

            history.push({
              name: `${mLabel}/${yearSuffix}`,
              vendas: salesVal,
              compras: purchasesVal
            })
          }
        } else {
          // Last Year (12 Months)
          const monthsLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          for (let i = 11; i >= 0; i--) {
            const d = new Date()
            d.setMonth(nowRange.getMonth() - i)
            const mLabel = monthsLabel[d.getMonth()]
            const yearSuffix = d.getFullYear().toString().substring(2)

            const salesVal = filteredSales
              .filter(s => {
                const sDate = new Date(s.created_at)
                return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)

            const purchasesVal = filteredPurchases
              .filter(p => {
                const pDate = new Date(p.created_at)
                return pDate.getMonth() === d.getMonth() && pDate.getFullYear() === d.getFullYear()
              })
              .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0) * multiplier

            history.push({
              name: `${mLabel}/${yearSuffix}`,
              vendas: salesVal,
              compras: purchasesVal
            })
          }
        }

        // Calculate branch billing share (for Matrix) in USD
        const branchBillingMap: Record<string, number> = {}
        salesData?.forEach((s: any) => {
          let branch = 'pharmix'
          try {
            const parsed = JSON.parse(s.customer_name)
            if (parsed && parsed.branch) {
              branch = parsed.branch
            }
          } catch {}

          const amount = parseFloat(s.total_amount) || 0
          // If it's a filial sale, convert BRL to USD by dividing by rate
          const usdAmount = branch === 'pharmix' ? amount : amount / rate
          branchBillingMap[branch] = (branchBillingMap[branch] || 0) + usdAmount
        })

        const branchColors: Record<string, string> = {
          pharmix: '#6366f1',       // Indigo
          trade: '#10b981',         // Emerald
          connect: '#3b82f6',       // Blue
          connecthealth: '#f59e0b',  // Amber
        }

        const branchLabels: Record<string, string> = {
          pharmix: 'Matriz Pharmix',
          trade: 'Filial Trade',
          connect: 'Filial Connect',
          connecthealth: 'Filial ConnectHealth',
        }

        const branchDataList = Object.entries(branchBillingMap).map(([branch, value]) => ({
          name: branchLabels[branch] || branch.toUpperCase(),
          value: parseFloat(value.toFixed(2)),
          color: branchColors[branch] || '#64748b'
        })).filter(item => item.value > 0)

        setBranchData(branchDataList)

        // Calculate top 5 selling products (for Filial) in local currency (BRL)
        const productSalesMap: Record<string, number> = {}
        filteredSales.forEach((s: any) => {
          const prodName = s.products?.name || 'Medicamento'
          const amount = parseFloat(s.total_amount) || 0
          productSalesMap[prodName] = (productSalesMap[prodName] || 0) + amount
        })

        const productDataList = Object.entries(productSalesMap)
          .map(([name, value]) => ({ 
            name, 
            value: parseFloat(value.toFixed(2)) 
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)

        // Calculate global cash stats by branch (ignoring date filters)
        const branchSales = (salesData || []).filter((s) => {
          if (isFilial) {
            try {
              const parsed = JSON.parse(s.customer_name)
              return parsed.branch === filialName
            } catch {
              return false
            }
          } else {
            try {
              const parsed = JSON.parse(s.customer_name)
              return !parsed.branch || parsed.branch === 'pharmix'
            } catch {
              return true
            }
          }
        })

        const branchPurchases = (purchasesData || []).filter((p) => {
          const statusStr = p.status || ''
          const hasSuffix = statusStr.includes('_')
          const suffix = hasSuffix ? statusStr.split('_')[1] : null
          if (isFilial) {
            return suffix === filialName
          } else {
            return !suffix || suffix === 'pharmix'
          }
        })

        const globalPurchasesSum = branchPurchases.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0) * multiplier
        const globalPaidSalesSum = branchSales
          .filter(s => s.status === 'ENTREGUE')
          .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)
        
        const globalPendingSalesSum = branchSales
          .filter(s => s.status !== 'ENTREGUE')
          .reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)

        const calculatedCash = initialCash - globalPurchasesSum + globalPaidSalesSum

        setCashFlowMetrics({
          currentCash: calculatedCash,
          expectedRevenue: globalPendingSalesSum
        })

        setTopProductsData(productDataList)

        // Only display chart if there is actual activity
        const hasActivity = history.some(h => h.vendas > 0 || h.compras > 0)
        setSalesHistory(hasActivity ? history : [])

      } catch (err) {
        console.error('Error fetching Supabase metrics:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user, filterRange, initialCash])

  // Load initial cash from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard_caixa_inicial')
      if (stored) {
        setInitialCash(parseFloat(stored))
      }
    }
  }, [])

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-muted rounded-md" />
          <div className="h-5 w-80 bg-muted rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-8 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))

  const formatCurrency = (val: number) => {
    if (isFilial) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(val)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val)
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border/80 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-foreground">{payload[0].name}</p>
          <p className="font-bold text-primary mt-0.5">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border/80 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md text-xs space-y-1">
          <p className="font-semibold text-muted-foreground">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.stroke || item.color }} />
              <span className="text-foreground">{item.name}:</span>
              <span className="font-bold text-foreground font-mono">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border/80 px-3 py-2 rounded-lg shadow-xl backdrop-blur-md text-xs">
          <p className="font-semibold text-foreground">{payload[0].name}</p>
          <p className="font-bold text-primary mt-0.5">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }


  const metricsGrid = [
    {
      title: isFilial ? 'Caixa Atual (R$ BRL)' : 'Caixa Atual ($ USD)',
      value: formatCurrency(cashFlowMetrics.currentCash),
      icon: Coins,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      hasSettings: true,
    },
    {
      title: isFilial ? 'Previsão de Faturamento (R$ BRL)' : 'Previsão de Faturamento ($ USD)',
      value: formatCurrency(cashFlowMetrics.expectedRevenue),
      icon: TrendingUp,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    },
    {
      title: isFilial ? 'Faturamento Total (R$ BRL)' : 'Faturamento Total ($ USD)',
      value: formatCurrency(metrics.billing),
      icon: DollarSign,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: isFilial ? 'Despesa de Compras (R$ BRL)' : 'Despesa de Compras ($ USD)',
      value: formatCurrency(metrics.purchasesTotal),
      icon: ShoppingCart,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
    {
      title: 'Vendas Realizadas',
      value: `${metrics.salesCount} vendas`,
      icon: ClipboardList,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Produtos Cadastrados',
      value: `${metrics.products} itens`,
      icon: Boxes,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Dashboard {user?.isFilial && ` - ${user.filialName?.toUpperCase()}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isFilial 
              ? 'Visão geral com dados e valores em reais (R$ BRL) convertidos a cada 1 hora.'
              : 'Visão geral com dados e valores em dólares ($ USD) reais do seu Supabase.'
            }
          </p>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* TV Mode Button */}
          {!isFilial && (
            <a
              href="/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border/50 bg-card hover:bg-secondary/60 transition-all duration-300 hover:shadow-sm"
            >
              <span>📺 Modo TV</span>
            </a>
          )}

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border/40">
          <button
            onClick={() => setFilterRange('thismonth')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterRange === 'thismonth' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Neste Mês
          </button>
          <button
            onClick={() => setFilterRange('3months')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterRange === '3months' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Últimos 3 Meses
          </button>
          <button
            onClick={() => setFilterRange('year')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterRange === 'year' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Último Ano
          </button>
        </div>
      </div>
    </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricsGrid.map((metric, idx) => {
          const Icon = metric.icon
          return (
            <Card 
              key={idx} 
              className="group transition-all duration-300 hover:shadow-lg border-border/50 bg-card relative overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>{metric.title}</span>
                  {metric.hasSettings && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setTempCashInput(initialCash.toString());
                        setIsCashModalOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary flex items-center justify-center"
                      title="Configurar Caixa Inicial"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  )}
                </CardTitle>
                <div className={`p-2 rounded-lg border ${metric.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{metric.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Sales vs Purchases (2/3 width) */}
        <Card className="lg:col-span-2 border-border/50 bg-card/65 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Vendas vs Compras ({isFilial ? 'R$ BRL' : '$ USD'})
            </CardTitle>
            <CardDescription>Visualização mensal baseada em lançamentos reais do banco de dados</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {salesHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
                <Package className="h-8 w-8 mb-2 text-muted-foreground/60" />
                Nenhum dado de venda ou compra registrado para exibir no gráfico.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesHistory}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Legend />
                    <Area type="monotone" name={isFilial ? "Vendas (R$)" : "Vendas ($)"} dataKey="vendas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" name={isFilial ? "Compras (R$)" : "Compras ($)"} dataKey="compras" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPurchases)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Conditional Chart (1/3 width) */}
        {!isFilial ? (
          /* Donut Chart: Sales share by branch for Matrix */
          <Card className="border-border/50 bg-card/65 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-primary" />
                Faturamento por Filial ($)
              </CardTitle>
              <CardDescription>Participação consolidada no faturamento (USD)</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center justify-between h-[280px]">
              {branchData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
                  <Package className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  Sem faturamento ativo nas filiais.
                </div>
              ) : (
                <>
                  <div className="h-44 w-full relative flex items-center justify-center">
                    {/* Central Label for Total Consolidated Billing */}
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                      <span className="text-sm font-extrabold text-foreground font-mono mt-0.5">
                        {formatCurrency(branchData.reduce((acc, curr) => acc + curr.value, 0))}
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={branchData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {branchData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full text-xs space-y-1.5 overflow-y-auto max-h-24 pt-2">
                    {branchData.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground truncate max-w-[120px]">{entry.name}</span>
                        </div>
                        <span className="font-semibold font-mono">{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Bar Chart: Top 5 Selling Products for Filial */
          <Card className="border-border/50 bg-card/65 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top 5 Produtos Vendidos
              </CardTitle>
              <CardDescription>Medicamentos com mais receita local (R$ BRL)</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 h-[280px]">
              {topProductsData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
                  <Package className="h-8 w-8 mb-2 text-muted-foreground/60" />
                  Nenhuma venda de produto registrada.
                </div>
              ) : (
                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProductsData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        width={80}
                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Configure Initial Cash Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex justify-center items-center animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-sm font-bold uppercase tracking-wider">Ajustar Caixa Inicial</h2>
              <button 
                onClick={() => setIsCashModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Caixa Inicial ({isFilial ? 'R$ BRL' : '$ USD'})</label>
                <input 
                  type="number"
                  step="0.01"
                  value={tempCashInput}
                  onChange={e => setTempCashInput(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setIsCashModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const parsed = parseFloat(tempCashInput) || 0
                    setInitialCash(parsed)
                    localStorage.setItem('dashboard_caixa_inicial', parsed.toString())
                    setIsCashModalOpen(false)
                    toast.success('Caixa inicial atualizado com sucesso!')
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

