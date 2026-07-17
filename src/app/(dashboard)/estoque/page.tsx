'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  X, 
  Boxes, 
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function EstoquePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user?.isFilial) {
      router.replace('/dashboard')
      toast.error('Acesso negado: Filiais não possuem acesso ao estoque.')
    }
  }, [user, loading, router])

  const [search, setSearch] = useState('')

  const [stockItems, setStockItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState<'disponivel' | 'entradas' | 'saidas' | 'para_entrar'>('disponivel')
  
  // Catalog expansion & sorting states
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [sortOrders, setSortOrders] = useState<Record<string, 'near' | 'far'>>({})

  async function loadStockData() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch all products
      const { data: prodsData, error: prodsErr } = await supabase
        .from('products')
        .select('*')
      if (prodsErr) throw prodsErr
      setProducts(prodsData || [])

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

      // Fetch purchases (incoming items)
      const { data: purchaseData, error: purchaseErr } = await supabase
        .from('purchases')
        .select('*, products(name, code), suppliers(company)')
      if (purchaseErr) throw purchaseErr
      setPurchases(purchaseData || [])
    } catch (err) {
      console.error('Error loading stock from Supabase:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStockData()
  }, [])

  // Toggle expand/collapse for a product in catalog
  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Toggle sort order for a product
  const toggleSortOrder = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent collapsing the card
    setSortOrders(prev => ({
      ...prev,
      [productId]: prev[productId] === 'far' ? 'near' : 'far'
    }))
  }

  // Group active stock items by product (ignoring items with status 'OUT_OF_STOCK' or quantity <= 0)
  const activeStockItems = stockItems.filter(item => item.status !== 'OUT_OF_STOCK' && (item.quantity ?? 0) > 0)
  
  const stockByProduct: Record<string, any[]> = {}
  activeStockItems.forEach(item => {
    const prodId = item.productId || item.product_id
    if (prodId) {
      if (!stockByProduct[prodId]) stockByProduct[prodId] = []
      stockByProduct[prodId].push(item)
    }
  })

  // Build grouped stock catalog from ALL active products (even if they have 0 stock)
  const groupedStockList = products
    .filter((prod: any) => prod.status?.toLowerCase() !== 'inactive' && prod.status?.toLowerCase() !== 'inativo')
    .map((prod: any) => {
      const items = stockByProduct[prod.id] || []
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      return {
        id: prod.id,
        name: prod.name || 'Medicamento Desconhecido',
        code: prod.code || '',
        totalQuantity,
        items
      }
    })
    // Filter the catalog based on search
    .filter((prod: any) => {
      const matchesProduct = 
        prod.name.toLowerCase().includes(search.toLowerCase()) ||
        prod.code.toLowerCase().includes(search.toLowerCase())
      
      const matchesBatch = prod.items.some((item: any) => 
        (item.batchNumber || item.batch_number || '').toLowerCase().includes(search.toLowerCase())
      )

      return matchesProduct || matchesBatch
    })

  // Movements classified as entries
  const inputMovements = movements.filter(mov => 
    (mov.type || '').toLowerCase().includes('entrada') || 
    (mov.type || '').toLowerCase() === 'input'
  )
  const filteredInputs = inputMovements.filter(mov => 
    (mov.stock?.products?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (mov.reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (mov.notes || '').toLowerCase().includes(search.toLowerCase())
  )

  // Movements classified as exits
  const outputMovements = movements.filter(mov => 
    (mov.type || '').toLowerCase().includes('saída') || 
    (mov.type || '').toLowerCase().includes('saida') || 
    (mov.type || '').toLowerCase() === 'output'
  )
  const filteredOutputs = outputMovements.filter(mov => 
    (mov.stock?.products?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (mov.reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (mov.notes || '').toLowerCase().includes(search.toLowerCase())
  )

  // Upcoming items: purchases whose status does not start with RECEBIDO
  const incomingPurchases = purchases.filter(p => {
    const statusStr = p.status || ''
    return !statusStr.toUpperCase().startsWith('RECEBIDO')
  })
  const filteredIncoming = incomingPurchases.filter(p => 
    (p.products?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.products?.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.suppliers?.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.status || '').toLowerCase().includes(search.toLowerCase())
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

  if (loading || user?.isFilial) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm font-semibold">
          Verificando permissões de acesso...
        </div>
      </div>
    )
  }

  const totalStockQuantity = stockItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  const totalIncomingQuantity = incomingPurchases.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

  return (


    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Estoque
          </h1>
          <p className="text-muted-foreground text-sm">
            Rastreamento de lotes, controle de movimentações e acompanhamento de itens a receber.
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
            placeholder="Buscar no estoque por medicamento, lote ou referência..."
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Unidades em Estoque</CardTitle>
            <Boxes className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalStockQuantity} un.</div>
            <p className="text-[10px] text-muted-foreground mt-1">{stockItems.length} lotes ativos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Entradas</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{inputMovements.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Lotes inseridos</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Saídas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{outputMovements.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Lotes baixados</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Para Entrar</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalIncomingQuantity} un.</div>
            <p className="text-[10px] text-muted-foreground mt-1">{incomingPurchases.length} pedidos pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setCurrentTab('disponivel')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            currentTab === 'disponivel'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Disponível em Estoque
        </button>
        <button
          onClick={() => setCurrentTab('entradas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            currentTab === 'entradas'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Entradas ({filteredInputs.length})
        </button>
        <button
          onClick={() => setCurrentTab('saidas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            currentTab === 'saidas'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Saídas ({filteredOutputs.length})
        </button>
        <button
          onClick={() => setCurrentTab('para_entrar')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            currentTab === 'para_entrar'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Truck className="h-4 w-4" />
          Para Entrar ({filteredIncoming.length})
        </button>
      </div>

      {/* Main Content Area */}
      <Card className="border-border/50 overflow-hidden bg-card/65 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {currentTab === 'disponivel' && (
              <>
                <Boxes className="h-5 w-5 text-indigo-500" />
                Catálogo de Produtos
              </>
            )}
            {currentTab === 'entradas' && (
              <>
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                Movimentações de Entrada
              </>
            )}
            {currentTab === 'saidas' && (
              <>
                <ArrowUpRight className="h-5 w-5 text-rose-500" />
                Movimentações de Saída
              </>
            )}
            {currentTab === 'para_entrar' && (
              <>
                <Truck className="h-5 w-5 text-blue-500" />
                Produtos para Entrar (Ordens Pendentes)
              </>
            )}
          </CardTitle>
          <CardDescription>
            {currentTab === 'disponivel' && 'Clique em um produto para expandir os lotes e validades.'}
            {currentTab === 'entradas' && 'Histórico de lotes inseridos e adicionados.'}
            {currentTab === 'saidas' && 'Histórico de baixas e lotes retirados por vendas.'}
            {currentTab === 'para_entrar' && 'Pedidos de compra internacionais ou envios com recebimento pendente.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/20 last:border-0 animate-pulse">
                  <div className="h-4 w-48 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Tab 1: Disponivel (Catalog format) */}
              {currentTab === 'disponivel' && (
                groupedStockList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum produto localizado no estoque.
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedStockList.map((product: any) => {
                        const isExpanded = !!expandedProducts[product.id]
                        const sortOrder = sortOrders[product.id] || 'near'

                        // Sort product items by expiry date based on local sort order
                        const sortedItems = [...product.items].sort((a: any, b: any) => {
                          const dateA = new Date(a.expiryDate || a.expiry_date || 0).getTime()
                          const dateB = new Date(b.expiryDate || b.expiry_date || 0).getTime()
                          return sortOrder === 'far' ? dateB - dateA : dateA - dateB
                        })

                        return (
                          <div 
                            key={product.id} 
                            onClick={() => toggleProduct(product.id)}
                            className="bg-card border border-border/60 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-base text-foreground tracking-tight">
                                    {product.name}
                                  </h3>
                                  <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded border border-border/40">
                                    {product.code}
                                  </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                    product.totalQuantity > 0 
                                      ? 'bg-primary/10 text-primary border border-primary/20' 
                                      : 'bg-muted text-muted-foreground border border-border'
                                  }`}>
                                    {product.totalQuantity} un.
                                  </span>
                                  <span className="text-[10px] text-muted-foreground mt-1">
                                    {product.items.length} {product.items.length === 1 ? 'lote' : 'lotes'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Collapsible details section */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-border/40 space-y-3 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Detalhamento de Lotes
                                  </span>
                                  {product.items.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => toggleSortOrder(product.id, e)}
                                      className="h-7 text-[10px] font-semibold flex items-center gap-1 border-border/80 hover:bg-secondary"
                                    >
                                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                                      {sortOrder === 'near' ? 'Validade: Mais Próxima' : 'Validade: Mais Longa'}
                                    </Button>
                                  )}
                                </div>

                                {product.items.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-muted-foreground bg-secondary/10 border border-border/30 rounded-lg">
                                    Sem lotes ativos disponíveis em estoque.
                                  </div>
                                ) : (
                                  <div className="overflow-hidden border border-border/40 rounded-lg bg-secondary/10">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-secondary/40 text-muted-foreground text-left font-semibold">
                                          <th className="py-2 px-3">Lote</th>
                                          <th className="py-2 px-3 text-right">Qtd</th>
                                          <th className="py-2 px-3">Vencimento</th>
                                          <th className="py-2 px-3 text-center">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/25">
                                        {sortedItems.map((item: any) => (
                                          <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="py-2.5 px-3 font-mono text-xs font-semibold text-muted-foreground">
                                              {item.batchNumber || item.batch_number}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                                              {item.quantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground">
                                              {item.expiryDate || item.expiry_date ? new Date(item.expiryDate || item.expiry_date).toLocaleDateString('pt-BR') : 'N/A'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusBadge(item.status)}`}>
                                                {item.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex justify-center text-muted-foreground/60 hover:text-foreground">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              )}

              {/* Tab 2: Entradas */}
              {currentTab === 'entradas' && (
                filteredInputs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma movimentação de entrada localizada.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                          <th className="py-3 px-6">Data</th>
                          <th className="py-3 px-6">Medicamento</th>
                          <th className="py-3 px-6">Referência / Lote</th>
                          <th className="py-3 px-6 text-right">Qtd Adicionada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {filteredInputs.map((mov) => (
                          <tr key={mov.id} className="hover:bg-secondary/40 transition-colors">
                            <td className="py-3.5 px-6 text-muted-foreground">
                              {new Date(mov.created_at || mov.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3.5 px-6 font-semibold">
                              {mov.stock?.products?.name || 'Item do estoque'}
                            </td>
                            <td className="py-3.5 px-6 font-mono text-xs text-muted-foreground">
                              Ref: {mov.reference || 'N/A'} {mov.notes ? `| ${mov.notes}` : ''}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +{mov.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Tab 3: Saídas */}
              {currentTab === 'saidas' && (
                filteredOutputs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma movimentação de saída localizada.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                          <th className="py-3 px-6">Data</th>
                          <th className="py-3 px-6">Medicamento</th>
                          <th className="py-3 px-6">Referência</th>
                          <th className="py-3 px-6 text-right">Qtd Retirada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {filteredOutputs.map((mov) => (
                          <tr key={mov.id} className="hover:bg-secondary/40 transition-colors">
                            <td className="py-3.5 px-6 text-muted-foreground">
                              {new Date(mov.created_at || mov.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3.5 px-6 font-semibold">
                              {mov.stock?.products?.name || 'Item do estoque'}
                            </td>
                            <td className="py-3.5 px-6 font-mono text-xs text-muted-foreground">
                              {mov.reference || 'N/A'} {mov.notes ? `| ${mov.notes}` : ''}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                              -{mov.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Tab 4: Para Entrar */}
              {currentTab === 'para_entrar' && (
                filteredIncoming.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum produto com entrada pendente.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                          <th className="py-3 px-6">Data do Pedido</th>
                          <th className="py-3 px-6">Medicamento</th>
                          <th className="py-3 px-6">Fornecedor</th>
                          <th className="py-3 px-6 text-right">Qtd Pedida</th>
                          <th className="py-3 px-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {filteredIncoming.map((p) => (
                          <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                            <td className="py-3.5 px-6 text-muted-foreground">
                              {new Date(p.created_at || p.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="font-semibold">{p.products?.name || 'N/A'}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{p.products?.code || 'N/A'}</div>
                            </td>
                            <td className="py-3.5 px-6 font-semibold">
                              {p.suppliers?.company || 'N/A'}
                            </td>
                            <td className="py-3.5 px-6 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {p.quantity} un.
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-600 border-amber-500/25">
                                {p.status?.split('_')[0]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
