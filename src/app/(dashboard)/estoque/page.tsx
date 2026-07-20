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
  Calendar,
  Pencil,
  Loader2,
  CalendarCheck,
  ClipboardList
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
  const [filterExpiryOnly, setFilterExpiryOnly] = useState(false)

  const [stockItems, setStockItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState<'disponivel' | 'entradas' | 'saidas' | 'para_entrar'>('disponivel')

  // Manual movement form state
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [movementForm, setMovementForm] = useState({
    product_id: '',
    type: 'Entrada', // 'Entrada' | 'Saída'
    quantity: '10',
    batch_number: '',
    expiry_date: '',
    reference: 'Ajuste de Inventário',
    selected_stock_id: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  // Batch editing form state
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = useState(false)
  const [selectedBatchToEdit, setSelectedBatchToEdit] = useState<any>(null)
  const [editBatchForm, setEditBatchForm] = useState({
    batch_number: '',
    expiry_date: ''
  })

  const getExpiryStatusInfo = (expiryDateStr: string) => {
    if (!expiryDateStr) return { label: 'Disponível', badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' }
    const expiry = new Date(expiryDateStr)
    const now = new Date()
    expiry.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (days <= 0) {
      return { 
        label: 'Vencido', 
        badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 font-bold' 
      }
    } else if (days <= 30) {
      return { 
        label: `Crítico (${days}d)`, 
        badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 font-semibold animate-pulse' 
      }
    } else if (days <= 90) {
      return { 
        label: `Alerta (${days}d)`, 
        badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 font-semibold' 
      }
    } else {
      return { 
        label: 'Seguro', 
        badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' 
      }
    }
  }

  
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

  const handleReturnExpired = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent collapsing the product card
    const confirm = window.confirm(`Deseja realmente registrar a devolução/descarte do lote vencido "${item.batchNumber || item.batch_number}"? Isso zerará o estoque deste lote.`)
    if (!confirm) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // 1. Update stock item quantity to 0 and status to OUT_OF_STOCK
      const { error: updateErr } = await supabase
        .from('stock')
        .update({
          quantity: 0,
          status: 'OUT_OF_STOCK'
        })
        .eq('id', item.id)
      if (updateErr) throw updateErr

      // 2. Register stock movement of type 'Saída'
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert([{
          stock_id: item.id,
          type: 'Saída',
          quantity: item.quantity,
          reference: 'DEVOLUÇÃO LOTE VENCIDO'
        }])
      if (movErr) throw movErr

      toast.success(`Devolução do lote ${item.batchNumber || item.batch_number} registrada com sucesso!`)
      loadStockData()
    } catch (err: any) {
      toast.error(`Erro ao registrar devolução: ${err.message}`)
      setIsLoading(false)
    }
  }

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementForm.product_id || !movementForm.quantity || !movementForm.type) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const qty = parseInt(movementForm.quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('A quantidade deve ser um número maior que zero')
      return
    }

    if (movementForm.type === 'Entrada') {
      if (!movementForm.batch_number || !movementForm.expiry_date) {
        toast.error('Preencha o lote e a validade para movimentações de entrada')
        return
      }
    } else {
      if (!movementForm.selected_stock_id) {
        toast.error('Selecione de qual lote deseja retirar as unidades')
        return
      }
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      if (movementForm.type === 'Entrada') {
        // 1. Create stock item
        const { data: stockData, error: stockErr } = await supabase
          .from('stock')
          .insert([{
            product_id: movementForm.product_id,
            quantity: qty,
            batch_number: movementForm.batch_number,
            expiry_date: movementForm.expiry_date,
            status: 'AVAILABLE'
          }])
          .select()
          .single()
        if (stockErr) throw stockErr

        // 2. Create movement
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert([{
            stock_id: stockData.id,
            type: 'Entrada',
            quantity: qty,
            reference: movementForm.reference || 'Entrada Manual'
          }])
        if (movErr) throw movErr

      } else {
        // Saída
        // 1. Fetch current stock item
        const { data: currentStock, error: fetchErr } = await supabase
          .from('stock')
          .select('quantity, batch_number')
          .eq('id', movementForm.selected_stock_id)
          .single()
        if (fetchErr) throw fetchErr

        if (currentStock.quantity < qty) {
          throw new Error(`Estoque insuficiente neste lote! Quantidade disponível: ${currentStock.quantity}`)
        }

        const newQty = currentStock.quantity - qty

        // 2. Update stock item
        const { error: updateErr } = await supabase
          .from('stock')
          .update({
            quantity: newQty,
            status: newQty <= 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'
          })
          .eq('id', movementForm.selected_stock_id)
        if (updateErr) throw updateErr

        // 3. Create movement
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert([{
            stock_id: movementForm.selected_stock_id,
            type: 'Saída',
            quantity: qty,
            reference: movementForm.reference || 'Saída Manual'
          }])
        if (movErr) throw movErr
      }

      toast.success('Movimentação manual de estoque registrada com sucesso!')
      setIsMovementModalOpen(false)
      setMovementForm({
        product_id: '',
        type: 'Entrada',
        quantity: '10',
        batch_number: '',
        expiry_date: '',
        reference: 'Ajuste de Inventário',
        selected_stock_id: ''
      })
      loadStockData()
    } catch (err: any) {
      toast.error(`Erro ao salvar movimentação: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenEditBatch = (item: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedBatchToEdit(item)
    let formattedDate = ''
    if (item.expiryDate || item.expiry_date) {
      const d = new Date(item.expiryDate || item.expiry_date)
      formattedDate = d.toISOString().split('T')[0]
    }
    setEditBatchForm({
      batch_number: item.batchNumber || item.batch_number || '',
      expiry_date: formattedDate
    })
    setIsEditBatchModalOpen(true)
  }

  const handleSaveBatchEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBatchToEdit) return
    if (!editBatchForm.batch_number || !editBatchForm.expiry_date) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('stock')
        .update({
          batch_number: editBatchForm.batch_number,
          expiry_date: editBatchForm.expiry_date
        })
        .eq('id', selectedBatchToEdit.id)

      if (error) throw error

      toast.success('Informações do lote atualizadas com sucesso!')
      setIsEditBatchModalOpen(false)
      setSelectedBatchToEdit(null)
      loadStockData()
    } catch (err: any) {
      toast.error(`Erro ao atualizar lote: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

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
    // Filter by expiration alert if active
    .filter((prod: any) => {
      if (!filterExpiryOnly) return true
      return prod.items.some((item: any) => {
        const expiryDateStr = item.expiryDate || item.expiry_date
        if (!expiryDateStr) return false
        const expiry = new Date(expiryDateStr)
        const now = new Date()
        expiry.setHours(0, 0, 0, 0)
        now.setHours(0, 0, 0, 0)
        const diffTime = expiry.getTime() - now.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return days <= 90
      })
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
          onClick={() => setIsMovementModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
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

        {/* Expiry filter button */}
        <Button
          variant={filterExpiryOnly ? "default" : "outline"}
          onClick={() => setFilterExpiryOnly(!filterExpiryOnly)}
          className="sm:w-auto font-semibold flex items-center gap-1.5 transition-all duration-300"
        >
          <Calendar className="h-4 w-4" />
          {filterExpiryOnly ? "Mostrando: Próximos do Vencimento" : "Filtrar: Próximos do Vencimento"}
        </Button>
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
                        const isExpanded = !!expandedProducts[product.id] || filterExpiryOnly
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
                                <div>
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
                                          <th className="py-2 px-3 text-center">Ações</th>
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
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${getExpiryStatusInfo(item.expiryDate || item.expiry_date).badgeClass}`}>
                                                {getExpiryStatusInfo(item.expiryDate || item.expiry_date).label}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center flex items-center justify-center gap-1.5">
                                              <Button
                                                variant="ghost"
                                                onClick={(e) => handleOpenEditBatch(item, e)}
                                                className="h-6 px-1.5 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/80 rounded transition-all"
                                                title="Editar informações do lote"
                                              >
                                                <Pencil className="h-3 w-3 text-muted-foreground" />
                                              </Button>
                                              {getExpiryStatusInfo(item.expiryDate || item.expiry_date).label === 'Vencido' && (
                                                <Button
                                                  variant="ghost"
                                                  onClick={(e) => handleReturnExpired(item, e)}
                                                  className="h-6 px-2 text-[9px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 rounded transition-all"
                                                >
                                                  Devolver
                                                </Button>
                                              )}
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

      {/* Manual Movement Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Registrar Movimentação Manual
              </h2>
              <button 
                onClick={() => setIsMovementModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMovement} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Medicamento *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                  value={movementForm.product_id}
                  onChange={e => setMovementForm({...movementForm, product_id: e.target.value, selected_stock_id: ''})}
                  required
                >
                  <option value="">Selecione o medicamento...</option>
                  {products
                    .filter((p: any) => p.status?.toLowerCase() !== 'inactive' && p.status?.toLowerCase() !== 'inativo')
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Tipo de Movimentação *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                    value={movementForm.type}
                    onChange={e => setMovementForm({...movementForm, type: e.target.value, selected_stock_id: ''})}
                    required
                  >
                    <option value="Entrada">Entrada (Acrescentar)</option>
                    <option value="Saída">Saída (Remover)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Quantidade *</label>
                  <Input
                    type="number"
                    min="1"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm({...movementForm, quantity: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Conditional fields based on type */}
              {movementForm.type === 'Entrada' ? (
                <div className="space-y-4 p-4 bg-secondary/30 border border-border/40 rounded-lg animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações do Novo Lote</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Número do Lote *</label>
                    <Input
                      placeholder="Ex: LOTE-12345"
                      value={movementForm.batch_number}
                      onChange={e => setMovementForm({...movementForm, batch_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Data de Vencimento *</label>
                    <Input
                      type="date"
                      value={movementForm.expiry_date}
                      onChange={e => setMovementForm({...movementForm, expiry_date: e.target.value})}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-secondary/30 border border-border/40 rounded-lg animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Lote de Saída</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Lote de Origem *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                      value={movementForm.selected_stock_id}
                      onChange={e => setMovementForm({...movementForm, selected_stock_id: e.target.value})}
                      disabled={!movementForm.product_id}
                      required
                    >
                      <option value="">Selecione o lote...</option>
                      {movementForm.product_id && stockItems
                        .filter(item => (item.productId || item.product_id) === movementForm.product_id && item.status !== 'OUT_OF_STOCK' && (item.quantity ?? 0) > 0)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            Lote: {item.batch_number || item.batchNumber} (Disponível: {item.quantity} un.) - Venc: {item.expiry_date || item.expiryDate ? new Date(item.expiry_date || item.expiryDate).toLocaleDateString('pt-BR') : 'N/A'}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Motivo / Referência *</label>
                <Input
                  placeholder="Ex: Ajuste de Inventário, Descarte por Avaria..."
                  value={movementForm.reference}
                  onChange={e => setMovementForm({...movementForm, reference: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {isEditBatchModalOpen && selectedBatchToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Editar Lote &amp; Validade
              </h2>
              <button 
                onClick={() => {
                  setIsEditBatchModalOpen(false)
                  setSelectedBatchToEdit(null)
                }} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Número do Lote *</label>
                <Input
                  value={editBatchForm.batch_number}
                  onChange={e => setEditBatchForm({...editBatchForm, batch_number: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Data de Vencimento *</label>
                <Input
                  type="date"
                  value={editBatchForm.expiry_date}
                  onChange={e => setEditBatchForm({...editBatchForm, expiry_date: e.target.value})}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditBatchModalOpen(false)
                    setSelectedBatchToEdit(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
