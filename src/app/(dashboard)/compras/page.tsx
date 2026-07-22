'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, X, Loader2, ShoppingCart, Trash2, CalendarCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { getBranchPrice } from '@/lib/utils'

export default function ComprasPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showStockEntryForm, setShowStockEntryForm] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isTradeFilial = user?.filialName === 'trade'

  const getPharmixSupplierId = (supplierList: any[] = suppliers) => {
    const pharmix = supplierList.find((supplier) => supplier.company?.toLowerCase().includes('pharmix'))
    return pharmix?.id || '91b41559-4e56-4301-bae7-38a19b5bf35f'
  }

  // Creation form state
  const [form, setForm] = useState({
    supplier_id: '',
    product_id: '',
    quantity: '100',
    unit_price: '',
    total_amount: '',
    status: 'PENDENTE',
    warehouse: 'Dubai'
  })

  // Detail/Edit form state
  const [editStatus, setEditStatus] = useState('PENDENTE')

  // Stock entry details state in creation form
  const [createStockEntry, setCreateStockEntry] = useState({
    batch_number: '',
    expiry_date: '',
    track_code: ''
  })

  // Stock Entry form state (triggered when status becomes RECEBIDO)
  const [stockEntry, setStockEntry] = useState({
    batch_number: '',
    expiry_date: '',
    track_code: '',
    warehouse: 'Dubai'
  })

  async function loadPurchases() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('purchases').select('*, suppliers(company), products(name)')

      if (search) {
        query = query.or(`status.ilike.%${search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error

      const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connect') ? 'connect' : null)

      const visiblePurchases = (data || []).filter((purchase: any) => {
        const statusStr = purchase.status || ''
        const hasSuffix = statusStr.includes('_')
        const suffix = hasSuffix ? statusStr.split('_')[1] : null

        if (user?.isFilial) {
          return suffix === filialName
        } else {
          return !suffix || suffix === 'pharmix'
        }
      })

      setPurchases(visiblePurchases)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadRelations() {
    try {
      const supabase = createClient()
      const [supsRes, prodsRes] = await Promise.all([
        supabase.from('suppliers').select('id, company'),
        supabase.from('products').select('id, name, purchase_price, sale_price, price_trade, price_connect, price_bioss, supplier_id')
      ])
      setSuppliers(supsRes.data || [])
      setAllProducts(prodsRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadPurchases()
    loadRelations()
  }, [search, user])

  useEffect(() => {
    if (user?.isFilial && suppliers.length > 0) {
      const pharmixId = getPharmixSupplierId(suppliers)
      setForm(prev => ({ ...prev, supplier_id: pharmixId }))
    }
  }, [user?.isFilial, suppliers, isModalOpen])

  // Filter products based on supplier
  useEffect(() => {
    if (form.supplier_id) {
      const filtered = allProducts.filter(p => p.supplier_id === form.supplier_id)
      setFilteredProducts(filtered)
      if (!filtered.some(p => p.id === form.product_id)) {
        setForm(prev => ({ ...prev, product_id: '', unit_price: '', total_amount: '' }))
      }
    } else {
      setFilteredProducts([])
    }
  }, [form.supplier_id, allProducts])

  // Calculate total amount
  useEffect(() => {
    const qty = parseFloat(form.quantity) || 0
    const price = parseFloat(form.unit_price) || 0
    setForm(prev => ({ ...prev, total_amount: (qty * price).toFixed(2) }))
  }, [form.quantity, form.unit_price])

  const handleProductChange = (productId: string) => {
    const selectedProd = filteredProducts.find(p => p.id === productId)
    const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connect') ? 'connect' : user?.email?.includes('bioss') ? 'bioss' : null)
    const defaultUnitPrice = selectedProd
      ? parseFloat((user?.isFilial ? getBranchPrice(selectedProd, filialName) : (selectedProd.purchase_price || 0)).toString())
      : 0

    setForm(prev => ({
      ...prev,
      product_id: productId,
      unit_price: selectedProd ? defaultUnitPrice.toString() : ''
    }))
  }

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.supplier_id || !form.product_id || !form.quantity || !form.unit_price) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (form.status === 'RECEBIDO') {
      if (!createStockEntry.batch_number || !createStockEntry.expiry_date || !createStockEntry.track_code) {
        toast.error('Preencha todas as informações do lote para dar entrada no estoque')
        return
      }
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const isFilial = user?.isFilial
      const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connect') ? 'connect' : null)
      const supplierId = isFilial ? getPharmixSupplierId(suppliers) : form.supplier_id

      const purchaseStatus = isFilial ? `${form.status}_${filialName}` : form.status
      
      // 1. Insert Purchase
      const { error: purchaseErr } = await supabase
        .from('purchases')
        .insert([{
          supplier_id: supplierId,
          product_id: form.product_id,
          quantity: parseInt(form.quantity),
          unit_price: parseFloat(form.unit_price),
          total_amount: parseFloat(form.total_amount),
          warehouse: isFilial ? 'Dubai' : (form.warehouse || 'Dubai'),
          status: purchaseStatus,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      if (purchaseErr) throw purchaseErr

      // 2. If status is RECEBIDO, insert into stock and movements (similar to confirm receipt)
      if (form.status === 'RECEBIDO') {
        const { data: stockData, error: stockErr } = await supabase
          .from('stock')
          .insert([{
            product_id: form.product_id,
            quantity: parseInt(form.quantity),
            batch_number: createStockEntry.batch_number,
            expiry_date: createStockEntry.expiry_date,
            warehouse: isFilial ? 'Dubai' : (form.warehouse || 'Dubai'),
            status: 'AVAILABLE'
          }])
          .select()
          .single()
        if (stockErr) throw stockErr

        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert([{
            stock_id: stockData.id,
            type: 'Entrada',
            quantity: parseInt(form.quantity),
            reference: createStockEntry.track_code
          }])
        if (movErr) throw movErr
      }

      // If the user is a filial, automatically generate the corresponding sale for Pharmix
      if (isFilial) {
        const { error: autoSaleErr } = await supabase.from('sales').insert([{
          customer_name: `Filial ${(filialName || '').toUpperCase()}`,
          product_id: form.product_id,
          quantity: parseInt(form.quantity),
          unit_price: parseFloat(form.unit_price),
          total_amount: parseFloat(form.total_amount),
          status: form.status === 'RECEBIDO' ? 'ENTREGUE' : 'PENDENTE',
          created_at: new Date().toISOString()
        }])
        if (autoSaleErr) console.error('Erro ao gerar venda automática na Pharmix:', autoSaleErr)
      }
      toast.success('Pedido de compra registrado com sucesso!')
      setIsModalOpen(false)
      setForm({
        supplier_id: isFilial ? getPharmixSupplierId(suppliers) : '',
        product_id: '',
        quantity: '100',
        unit_price: '',
        total_amount: '',
        status: 'PENDENTE',
        warehouse: 'Dubai'
      })
      setCreateStockEntry({
        batch_number: '',
        expiry_date: '',
        track_code: ''
      })
      loadPurchases()
    } catch (err: any) {
      toast.error(`Erro ao criar compra: ${err.message || 'Erro ao registrar'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDetail = (purchase: any) => {
    setSelectedPurchase(purchase)
    const statusParts = purchase.status?.split('_') || []
    setEditStatus(statusParts[0] || 'PENDENTE')

    // Pre-populate batch entry if details were provided during shipment by Pharmix
    if (statusParts.length >= 5) {
      setStockEntry({
        batch_number: statusParts[2] || '',
        expiry_date: statusParts[3] || '',
        track_code: statusParts[4] || '',
        warehouse: purchase.warehouse || 'Dubai'
      })
    } else {
      setStockEntry({
        batch_number: '',
        expiry_date: '',
        track_code: '',
        warehouse: purchase.warehouse || 'Dubai'
      })
    }

    setShowStockEntryForm(false)
    setIsDetailModalOpen(true)
  }

  // Handle click on "Atualizar Status"
  const handleUpdateStatusClick = () => {
    const currentStatus = selectedPurchase?.status?.split('_')[0] || ''
    if (editStatus === 'RECEBIDO' && currentStatus !== 'RECEBIDO') {
      // If updating to RECEBIDO, show the inventory details form first
      setShowStockEntryForm(true)
    } else {
      saveStatusChange()
    }
  }

  // Save regular status change (not RECEIVED)
  const saveStatusChange = async () => {
    if (!selectedPurchase) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const statusValue = user?.isFilial ? `${editStatus}_${user.filialName}` : editStatus
      const { error } = await supabase
        .from('purchases')
        .update({ status: statusValue })
        .eq('id', selectedPurchase.id)
      
      if (error) throw error
      toast.success('Status atualizado com sucesso!')
      setIsDetailModalOpen(false)
      loadPurchases()
    } catch (err: any) {
      toast.error(`Erro ao atualizar status: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle confirming receipt (saves purchase status, creates stock item + stock movement)
  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockEntry.batch_number || !stockEntry.expiry_date || !stockEntry.track_code) {
      toast.error('Preencha todas as informações do lote para dar entrada no estoque')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      // 1. Update purchase status to RECEBIDO and update warehouse if changed
      const statusValue = user?.isFilial ? `RECEBIDO_${user.filialName}` : 'RECEBIDO'
      const { error: purchaseErr } = await supabase
        .from('purchases')
        .update({ 
          status: statusValue, 
          warehouse: stockEntry.warehouse || selectedPurchase.warehouse || 'Dubai' 
        })
        .eq('id', selectedPurchase.id)
      if (purchaseErr) throw purchaseErr

      // 2. Add to stock table
      const { data: stockData, error: stockErr } = await supabase
        .from('stock')
        .insert([{
          product_id: selectedPurchase.product_id,
          quantity: selectedPurchase.quantity,
          batch_number: stockEntry.batch_number,
          expiry_date: stockEntry.expiry_date,
          warehouse: stockEntry.warehouse || selectedPurchase.warehouse || 'Dubai',
          status: 'AVAILABLE'
        }])
        .select()
        .single()
      if (stockErr) throw stockErr

      // 3. Create stock movement (Audit trail)
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert([{
          stock_id: stockData.id,
          type: 'Entrada',
          quantity: selectedPurchase.quantity,
          reference: stockEntry.track_code
        }])
      if (movErr) throw movErr

      toast.success('Recebimento confirmado! Lote adicionado ao estoque.')
      setIsDetailModalOpen(false)
      setShowStockEntryForm(false)
      setStockEntry({ batch_number: '', expiry_date: '', track_code: '', warehouse: 'Dubai' })
      loadPurchases()
    } catch (err: any) {
      toast.error(`Erro no recebimento de estoque: ${err.message || 'Verifique se as tabelas de estoque existem no Supabase'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePurchase = async () => {
    if (!selectedPurchase) return
    const confirmDelete = window.confirm('Deseja realmente excluir este pedido de compra?')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', selectedPurchase.id)
      
      if (error) throw error
      toast.success('Pedido de compra excluído!')
      setIsDetailModalOpen(false)
      loadPurchases()
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Compras Internacionais
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie compras internacionais em dólares ($ USD). Alterar status para &quot;RECEBIDO&quot; dará entrada automática no estoque.
          </p>
        </div>
        <Button 
          className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Compra
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por status da compra (ex: PENDENTE, RECEBIDO)..."
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

      <Card className="border-border/50 overflow-hidden bg-card/70 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-lg font-bold">Ordens de Compra (USD)</CardTitle>
          <CardDescription>Clique na linha de qualquer pedido para gerenciar ou excluir.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/20 last:border-0 animate-pulse">
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Nenhum pedido de compra localizado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Crie pedidos de compras para monitorar abastecimento de lotes.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Fazer Pedido de Compra
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                    <th className="py-3.5 px-6">Data</th>
                    <th className="py-3.5 px-6">Fornecedor</th>
                    <th className="py-3.5 px-6">Produto</th>
                    <th className="py-3.5 px-6 text-center">Qtd</th>
                    <th className="py-3.5 px-6 text-right">Unitário</th>
                    <th className="py-3.5 px-6 text-right">Valor Total</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {purchases.map((purchase) => (
                    <tr 
                      key={purchase.id} 
                      className="hover:bg-secondary/60 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(purchase)}
                      title="Clique para editar ou excluir"
                    >
                      <td className="py-3.5 px-6 text-muted-foreground">
                        {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-6 font-semibold">{purchase.suppliers?.company || 'N/A'}</td>
                      <td className="py-3.5 px-6">{purchase.products?.name || 'N/A'}</td>
                      <td className="py-3.5 px-6 text-center font-mono">{purchase.quantity}</td>
                      <td className="py-3.5 px-6 text-right font-mono">{formatCurrency(purchase.unit_price)}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold">{formatCurrency(purchase.total_amount)}</td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          purchase.status?.split('_')[0] === 'RECEBIDO'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                        }`}>
                          {purchase.status?.split('_')[0]}
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

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-lg font-bold">Novo Pedido de Compra ($ USD)</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePurchase} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Fornecedor *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring disabled:opacity-80"
                  value={form.supplier_id}
                  onChange={e => setForm({...form, supplier_id: e.target.value})}
                  disabled={isTradeFilial}
                  required
                >
                  <option value="">Selecione o fornecedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">
                  Produto *
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring disabled:opacity-50"
                  value={form.product_id}
                  onChange={e => handleProductChange(e.target.value)}
                  disabled={!form.supplier_id}
                  required
                >
                  <option value="">
                    {form.supplier_id ? 'Selecione o produto...' : 'Selecione um fornecedor primeiro'}
                  </option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Quantidade *</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm({...form, quantity: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">
                    {isTradeFilial ? 'Preço de compra da Trade (custo da Pharmix) *' : 'Preço Unitário ($ USD) *'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unit_price}
                    onChange={e => setForm({...form, unit_price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Status</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                  >
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="EM TRANSITO">EM TRANSITO</option>
                    <option value="RECEBIDO">RECEBIDO</option>
                  </select>
                </div>
                {!user?.isFilial ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Armazém Destino *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.warehouse}
                      onChange={e => setForm({...form, warehouse: e.target.value})}
                    >
                      <option value="Dubai">🇦🇪 Armazém Dubai</option>
                      <option value="Uruguai">🇺🇾 Armazém Uruguai</option>
                      <option value="Panamá">🇵🇦 Armazém Panamá</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Valor Total Calculado ($ USD)</label>
                    <Input
                      type="text"
                      value={form.total_amount ? `$ ${form.total_amount}` : '$ 0.00'}
                      disabled
                    />
                  </div>
                )}
              </div>

              {form.status === 'RECEBIDO' && (
                <div className="space-y-4 p-4 bg-secondary/30 border border-border/40 rounded-lg animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações de Recebimento de Lote</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Número do Lote *</label>
                    <Input
                      placeholder="Ex: LOTE-12345"
                      value={createStockEntry.batch_number}
                      onChange={e => setCreateStockEntry({...createStockEntry, batch_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Data de Vencimento *</label>
                      <Input
                        type="date"
                        value={createStockEntry.expiry_date}
                        onChange={e => setCreateStockEntry({...createStockEntry, expiry_date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Código de Rastreio / Ref *</label>
                      <Input
                        placeholder="Ex: BR123456789XX"
                        value={createStockEntry.track_code}
                        onChange={e => setCreateStockEntry({...createStockEntry, track_code: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  Confirmar Pedido
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Edit / Delete Modal */}
      {isDetailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <div>
                <h2 className="text-lg font-bold">Detalhes da Compra</h2>
                <p className="text-[10px] text-muted-foreground font-mono">ID: {selectedPurchase.id}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {!showStockEntryForm ? (
                <>
                  {/* Order Info View */}
                  <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-3 rounded-lg border border-border/40">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Fornecedor</span>
                      <div className="font-semibold">{selectedPurchase.suppliers?.company || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Produto</span>
                      <div className="font-semibold">{selectedPurchase.products?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Qtd / Unitário</span>
                      <div>{selectedPurchase.quantity} un. x {formatCurrency(selectedPurchase.unit_price)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Total do Pedido</span>
                      <div className="font-bold text-primary">{formatCurrency(selectedPurchase.total_amount)}</div>
                    </div>
                  </div>

                  {/* Status Edit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Alterar Status de Recebimento</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="EM TRANSITO">EM TRANSITO</option>
                      <option value="RECEBIDO">RECEBIDO</option>
                    </select>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-border">
                    <Button 
                      onClick={handleUpdateStatusClick} 
                      className="w-full" 
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Atualizar Status
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDetailModalOpen(false)}
                        className="flex-1"
                      >
                        Fechar
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDeletePurchase}
                        disabled={isDeleting}
                        className="flex-1 gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir Pedido
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Stock Entry Details Form (When status transitions to RECEBIDO) */
                <form onSubmit={handleConfirmReceipt} className="space-y-4 animate-in slide-in-from-right-5 duration-200">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <CalendarCheck className="h-5 w-5" />
                    <span>Entrada de Lote no Estoque</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao definir o pedido como recebido, você deve confirmar o armazém, informar a validade, o lote e o código de rastreamento para criar o lote no estoque.
                  </p>

                  {!user?.isFilial && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase font-bold text-primary">Armazém de Destino (Estoque) *</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-foreground"
                        value={stockEntry.warehouse}
                        onChange={e => setStockEntry({...stockEntry, warehouse: e.target.value})}
                      >
                        <option value="Dubai">🇦🇪 Armazém Dubai</option>
                        <option value="Uruguai">🇺🇾 Armazém Uruguai</option>
                        <option value="Panamá">🇵🇦 Armazém Panamá</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Número do Lote *</label>
                    <Input 
                      placeholder="Ex: LOTE-XYZ123"
                      value={stockEntry.batch_number}
                      onChange={e => setStockEntry({...stockEntry, batch_number: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Data de Validade *</label>
                    <Input 
                      type="date"
                      value={stockEntry.expiry_date}
                      onChange={e => setStockEntry({...stockEntry, expiry_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Código de Rastreamento (Track Code) *</label>
                    <Input 
                      placeholder="Ex: TRK-98421422"
                      value={stockEntry.track_code}
                      onChange={e => setStockEntry({...stockEntry, track_code: e.target.value})}
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowStockEntryForm(false)}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isSaving}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar Recebimento
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
