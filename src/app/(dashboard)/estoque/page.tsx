'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  X, 
  Boxes, 
  Clock, 
  CalendarCheck, 
  History
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function EstoquePage() {
  const [search, setSearch] = useState('')
  const [stockItems, setStockItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadStockData() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch stock items
      const { data: stockData, error: stockErr } = await supabase
        .from('stock')
        .select('*, products(name, code)')
      if (stockErr) throw stockErr
      setStockItems(stockData || [])

      // Fetch stock movements
      const { data: movData, error: movErr } = await supabase
        .from('stock_movements')
        .select('*, stock(products(name))')
      if (movErr) throw movErr
      setMovements(movData || [])
    } catch (err) {
      console.error('Error loading stock from Supabase:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStockData()
  }, [])

  // Filter items locally based on search
  const filteredStock = stockItems.filter(item => 
    (item.products?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.products?.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.batchNumber || item.batch_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
      case 'Disponível':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
      case 'CRITICAL':
      case 'Crítico':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 animate-pulse'
      default:
        return 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400'
    }
  }

  const totalStockQuantity = stockItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Estoque
          </h1>
          <p className="text-muted-foreground text-sm">
            Rastreamento de lotes e controle de movimentações integrado ao Supabase.
          </p>
        </div>
        <Button 
          className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => toast.info('Operação de movimentação de estoque deve ser gerada por compras ou vendas')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no estoque por medicamento ou lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 bg-card border-border/60"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Unidades em Estoque</CardTitle>
            <Boxes className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalStockQuantity} un.</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Lotes Cadastrados</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stockItems.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Movimentações Registradas</CardTitle>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{movements.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lotes em Estoque (Table) */}
        <Card className="lg:col-span-2 border-border/50 overflow-hidden bg-card/65 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              Lotes em Estoque
            </CardTitle>
            <CardDescription>Estoque atual monitorado no Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/20 last:border-0 animate-pulse">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-12 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum lote localizado no Supabase.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                      <th className="py-3 px-6">Medicamento</th>
                      <th className="py-3 px-6">Lote</th>
                      <th className="py-3 px-6 text-right">Qtd</th>
                      <th className="py-3 px-6">Vencimento</th>
                      <th className="py-3 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredStock.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-semibold">{item.products?.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.products?.code}</div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-muted-foreground">
                          {item.batchNumber || item.batch_number}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 px-6 text-muted-foreground">
                          {item.expiryDate || item.expiry_date ? new Date(item.expiryDate || item.expiry_date).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Movimentações */}
        <Card className="border-border/50 bg-card/65 backdrop-blur-sm shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              Movimentações
            </CardTitle>
            <CardDescription>Histórico de modificações do estoque.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-y-auto max-h-[350px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-6 w-full bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Nenhuma movimentação registrada no Supabase.
              </div>
            ) : (
              <div className="space-y-4">
                {movements.map((mov) => (
                  <div key={mov.id} className="flex items-start justify-between border-b border-border/10 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="text-xs font-semibold">{mov.stock?.products?.name || 'Item'}</div>
                      <div className="text-[10px] text-muted-foreground">Tipo: {mov.type} | Ref: {mov.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono">{mov.quantity}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {new Date(mov.created_at || mov.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
