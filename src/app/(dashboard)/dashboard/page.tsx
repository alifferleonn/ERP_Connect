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
  Legend
} from 'recharts'
import { 
  DollarSign, 
  ShoppingCart, 
  Boxes, 
  ClipboardList, 
  TrendingUp,
  Package
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/use-auth'

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
  const [filterRange, setFilterRange] = useState<'year' | '3months' | 'thismonth'>('year')

  useEffect(() => {
    setMounted(true)
    async function loadData() {
      try {
        const supabase = createClient()
        const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.endsWith('@connect.com') || user.email.endsWith('@connecthealth.com')))
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
          supabase.from('sales').select('total_amount, created_at, customer_name'),
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
  }, [user, filterRange])

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

  const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.endsWith('@connect.com') || user.email.endsWith('@connecthealth.com')))

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

  const metricsGrid = [
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
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
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

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border/40 self-start md:self-auto">
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsGrid.map((metric, idx) => {
          const Icon = metric.icon
          return (
            <Card 
              key={idx} 
              className="group transition-all duration-300 hover:shadow-lg border-border/50 bg-card"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {metric.title}
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
      <Card className="border-border/50 bg-card/65 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Vendas vs Compras ($ USD)
          </CardTitle>
          <CardDescription>Visualização mensal baseada em lançamentos reais do banco de dados</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {salesHistory.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
              <Package className="h-8 w-8 mb-2 text-muted-foreground/60" />
              Nenhum dado de venda ou compra registrado no Supabase para exibir no gráfico.
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  <Legend />
                  <Area type="monotone" name="Vendas ($)" dataKey="vendas" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" name="Compras ($)" dataKey="compras" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPurchases)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
