'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, X, Loader2, DollarSign, ClipboardList, AlertTriangle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
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

export default function VendasPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  
  // States for searchable product input
  const [productSearch, setProductSearch] = useState('')
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(5.4)

  useEffect(() => {
    getExchangeRate().then(rate => setExchangeRate(rate))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showProductSuggestions && !(e.target as HTMLElement).closest('.product-suggestions-container')) {
        setShowProductSuggestions(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showProductSuggestions])

  const getProductFinalPrice = (product: any) => {
    if (!product) return 0
    let price = parseFloat(product.sale_price || 0)
    const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))
    if (isFilial) {
      price = price * exchangeRate
      const isTradeFilial = user?.filialName === 'trade'
      const isConnectHealthFilial = user?.filialName === 'connecthealth'
      const isConnectFilial = user?.filialName === 'connect'
      const defaultMarkup = isTradeFilial ? 2 : isConnectHealthFilial ? 1.8 : isConnectFilial ? 1.5 : 1
      price = price * defaultMarkup
    }
    return price
  }

  const getFilteredProducts = () => {
    if (!productSearch) return []
    const query = productSearch.toLowerCase()
    
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.code && p.code.toLowerCase().includes(query))
    )

    const cheapestMap: { [key: string]: any } = {}
    filtered.forEach(p => {
      const activePrinciple = p.code || ''
      if (activePrinciple) {
        const price = getProductFinalPrice(p)
        if (!cheapestMap[activePrinciple] || price < getProductFinalPrice(cheapestMap[activePrinciple])) {
          cheapestMap[activePrinciple] = p
        }
      }
    })

    return filtered.map(p => {
      const activePrinciple = p.code || ''
      const isCheapest = activePrinciple && cheapestMap[activePrinciple]?.id === p.id
      return {
        ...p,
        isCheapest
      }
    }).sort((a, b) => {
      const aMatchesCode = a.code?.toLowerCase().includes(query)
      const bMatchesCode = b.code?.toLowerCase().includes(query)
      if (aMatchesCode && bMatchesCode) {
        return getProductFinalPrice(a) - getProductFinalPrice(b)
      }
      return 0
    })
  }

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Semi-automatic purchase flow state
  const [showAutoPurchasePanel, setShowAutoPurchasePanel] = useState(false)
  const [deficitInfo, setDeficitInfo] = useState<{
    needed: number
    available: number
    product: any
    stockItems?: any[]
    sellQty?: number
  } | null>(null)

  // Form states
  const [form, setForm] = useState({
    customer_name: '',
    customer_cpf: '',
    customer_email: '',
    document_data: '',
    product_id: '',
    quantity: '1',
    unit_price: '',
    total_amount: '',
    status: 'PENDENTE'
  })

  // Detail/Edit status state
  const [editStatus, setEditStatus] = useState('PENDENTE')

  // Shipment flow states (for Pharmix sending to Filial)
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false)
  const [shipmentTrackCode, setShipmentTrackCode] = useState('')
  const [shipmentDeficit, setShipmentDeficit] = useState<{
    needed: number
    available: number
    product: any
  } | null>(null)
  const [shipmentStockItems, setShipmentStockItems] = useState<any[]>([])

  // Load sales and products
  async function loadSales() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('sales').select('*, products(name, code)')
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,status.ilike.%${search}%`)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error

      const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))
      const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connecthealth') ? 'connecthealth' : user?.email?.includes('connect') ? 'connect' : null)

      const visibleSales = (data || []).filter((sale: any) => {
        if (isFilial) {
          try {
            const parsed = JSON.parse(sale.customer_name)
            return parsed.branch === filialName
          } catch {
            return false
          }
        } else {
          // Pharmix user
          try {
            const parsed = JSON.parse(sale.customer_name)
            return !parsed.branch || parsed.branch === 'pharmix'
          } catch {
            // Not JSON
            return true
          }
        }
      })

      setSales(visibleSales)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('products')
        .select('*, suppliers(id, company)')
        .eq('status', 'Ativo')
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function loadRelations() {
    try {
      const supabase = createClient()
      const [supsRes, clientsRes] = await Promise.all([
        supabase.from('suppliers').select('id, company'),
        supabase.from('suppliers').select('*').eq('country', 'Cliente')
      ])
      setSuppliers(supsRes.data || [])
      setClients(clientsRes.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getPharmixSupplierId = (supplierList: any[] = suppliers) => {
    const pharmix = supplierList.find((supplier) => supplier.company?.toLowerCase().includes('pharmix'))
    return pharmix?.id || '91b41559-4e56-4301-bae7-38a19b5bf35f'
  }

  useEffect(() => {
    loadSales()
    loadProducts()
    loadRelations()
  }, [search, user])

  // Compute total value
  useEffect(() => {
    const qty = parseInt(form.quantity) || 0
    const price = parseFloat(form.unit_price) || 0
    const total = qty * price
    setForm(prev => ({ ...prev, total_amount: total.toFixed(2) }))
  }, [form.quantity, form.unit_price])

  const handleProductChange = async (productId: string) => {
    const selectedProd = products.find(p => p.id === productId)
    const isTradeFilial = user?.filialName === 'trade'
    const isConnectHealthFilial = user?.filialName === 'connecthealth'
    const isConnectFilial = user?.filialName === 'connect'
    const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))
    
    let retailPrice = selectedProd
      ? parseFloat(selectedProd.sale_price || 0)
      : 0

    if (isFilial) {
      const rate = await getExchangeRate()
      retailPrice = retailPrice * rate
    }

    const defaultMarkup = isTradeFilial ? 2 : isConnectHealthFilial ? 1.8 : isConnectFilial ? 1.5 : 1
    const finalSalePrice = retailPrice * defaultMarkup

    setForm(prev => ({
      ...prev,
      product_id: productId,
      unit_price: selectedProd ? finalSalePrice.toFixed(2) : ''
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, document_data: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const createPendingPurchase = async (product: any, needed: number) => {
    const supabase = createClient()
    const isFilial = user?.isFilial
    const filialName = user?.filialName || (user?.email?.includes('trade') ? 'trade' : user?.email?.includes('connect') ? 'connect' : null)
    const pharmixSupplierId = getPharmixSupplierId(suppliers)

    const purchaseUnitPrice = isFilial
      ? parseFloat(product.sale_price || product.purchase_price || 0)
      : parseFloat(product.purchase_price || 0)
    const totalPurchaseCost = needed * purchaseUnitPrice
    
    const purchaseStatus = isFilial ? `PENDENTE_${filialName}` : 'PENDENTE'

    const { error: purchaseErr } = await supabase
      .from('purchases')
      .insert([{
        supplier_id: isFilial ? pharmixSupplierId : product.supplier_id,
        product_id: product.id,
        quantity: needed,
        unit_price: purchaseUnitPrice,
        total_amount: totalPurchaseCost,
        status: purchaseStatus,
        created_at: new Date().toISOString()
      }])

    if (purchaseErr) throw purchaseErr

    if (isFilial) {
      const { error: autoSaleErr } = await supabase.from('sales').insert([{
        customer_name: `Filial ${(filialName || '').toUpperCase()}`,
        product_id: product.id,
        quantity: needed,
        unit_price: purchaseUnitPrice,
        total_amount: totalPurchaseCost,
        status: 'PENDENTE',
        created_at: new Date().toISOString()
      }])
      if (autoSaleErr) console.error('Erro ao gerar venda automática na Pharmix:', autoSaleErr)
    }
  }

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customer_name || !form.product_id || !form.quantity || !form.unit_price || !form.total_amount) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (user?.isFilial) {
      if (!form.customer_cpf || !form.customer_email || !form.document_data) {
        toast.error('Nome, CPF, E-mail e o Documento de Receita Médica/ID são obrigatórios para vendas da filial.')
        return
      }
    }

    const sellQty = parseInt(form.quantity)
    const selectedProd = products.find(p => p.id === form.product_id)

    setIsSaving(true)
    try {
      const supabase = createClient()

      // 1. Get current stock
      const { data: stockItems, error: stockErr } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', form.product_id)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true }) // FIFO
      if (stockErr) throw stockErr

      const availableQty = (stockItems || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
      const isTradeFilial = user?.filialName === 'trade'

      if (availableQty < sellQty) {
        const needed = sellQty - availableQty

        if (!isTradeFilial) {
          setDeficitInfo({
            needed,
            available: availableQty,
            product: selectedProd,
            stockItems,
            sellQty
          })
          setShowAutoPurchasePanel(true)
          setIsSaving(false)
          return
        }

        await createPendingPurchase(selectedProd, needed)
      }

      await executeSaleAndDeductStock(stockItems, sellQty)
    } catch (err: any) {
      toast.error(`Erro ao processar venda: ${err.message}`)
      setIsSaving(false)
    }
  }

  // Deduct batches using FIFO order
  const executeSaleAndDeductStock = async (stockItems: any[], quantityToDeduct: number) => {
    try {
      const supabase = createClient()
      let remaining = quantityToDeduct

      for (const item of stockItems) {
        if (remaining <= 0) break

        const deduct = Math.min(item.quantity, remaining)
        const newQty = item.quantity - deduct
        remaining -= deduct

        // Update batch quantity
        const { error: updateErr } = await supabase
          .from('stock')
          .update({ 
            quantity: newQty,
            status: newQty === 0 ? 'OUT_OF_STOCK' : item.status
          })
          .eq('id', item.id)
        if (updateErr) throw updateErr

        // Register movement
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert([{
            stock_id: item.id,
            type: 'Saída',
            quantity: deduct,
            reference: `VENDA-${form.customer_name}`
          }])
        if (movErr) throw movErr
      }

      // If the user is a filial, serialize customer details in customer_name
      let customerNameValue = form.customer_name
      if (user?.isFilial) {
        customerNameValue = JSON.stringify({
          name: form.customer_name,
          cpf: form.customer_cpf || '',
          email: form.customer_email || '',
          document_data: form.document_data || '',
          branch: user.filialName
        })
      }

      // Insert Sale with chosen status
      const { error: saleErr } = await supabase
        .from('sales')
        .insert([{
          customer_name: customerNameValue,
          product_id: form.product_id,
          quantity: quantityToDeduct,
          unit_price: parseFloat(form.unit_price),
          total_amount: parseFloat(form.total_amount),
          status: form.status,
          created_at: new Date().toISOString()
        }])
      if (saleErr) throw saleErr

      // If the user is a filial, trigger the automatic purchase and Pharmix sale flow - Removed (initiated on Compras page now)

      toast.success('Venda concluída e estoque baixado com sucesso!')
      setIsModalOpen(false)
      setForm({
        customer_name: '',
        customer_cpf: '',
        customer_email: '',
        document_data: '',
        product_id: '',
        quantity: '1',
        unit_price: '',
        total_amount: '',
        status: 'PENDENTE'
      })
      loadSales()
    } catch (err: any) {
      throw new Error(`Erro na baixa de estoque: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Confirming the semi-automatic PENDING purchase
  const handleConfirmAutoPurchase = async () => {
    if (!deficitInfo) return
    setIsSaving(true)
    try {
      const { needed, product, stockItems = [], sellQty = 0 } = deficitInfo
      await createPendingPurchase(product, needed)
      
      // Execute and persist the sale as well
      await executeSaleAndDeductStock(stockItems, sellQty)

      toast.success(`Pedido de compra de ${needed} un. gerado como PENDENTE para ${product.suppliers?.company || 'Matriz'} e venda registrada!`);

      setIsModalOpen(false)
      setShowAutoPurchasePanel(false)
      setDeficitInfo(null)
    } catch (err: any) {
      toast.error(`Erro ao gerar compra semiautomática: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Detail Modal view
  const handleOpenDetail = (sale: any) => {
    setSelectedSale(sale)
    setEditStatus(sale.status || 'PENDENTE')
    setIsDetailModalOpen(true)
  }

  // Update Sale Status
  const handleUpdateStatus = async () => {
    if (!selectedSale) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sales')
        .update({ status: editStatus })
        .eq('id', selectedSale.id)
      
      if (error) throw error
      toast.success('Status da venda atualizado com sucesso!')
      setIsDetailModalOpen(false)
      loadSales()
    } catch (err: any) {
      toast.error(`Erro ao atualizar status da venda: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete Sale
  const handleDeleteSale = async () => {
    if (!selectedSale) return
    const confirmDelete = window.confirm('Deseja realmente excluir esta venda?')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', selectedSale.id)
      
      if (error) throw error
      toast.success('Venda excluída com sucesso!')
      setIsDetailModalOpen(false)
      loadSales()
    } catch (err: any) {
      toast.error(`Erro ao excluir venda: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenShipment = async (sale: any) => {
    try {
      const supabase = createClient()
      
      // Fetch product with suppliers relation
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, suppliers(*)')
        .eq('id', sale.product_id)
        .single()
      if (prodErr) throw prodErr

      // Fetch stock availability in Pharmix
      const { data: stockItems, error: stockErr } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', sale.product_id)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true }) // FIFO
      if (stockErr) throw stockErr

      const availableQty = (stockItems || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0)

      setShipmentStockItems(stockItems || [])
      setShipmentTrackCode('')
      setSelectedSale(sale)

      if (availableQty < sale.quantity) {
        setShipmentDeficit({
          needed: sale.quantity - availableQty,
          available: availableQty,
          product: prodData
        })
      } else {
        setShipmentDeficit(null)
      }
      setIsDetailModalOpen(false)
      setIsShipmentModalOpen(true)
    } catch (err: any) {
      toast.error(`Erro ao verificar estoque para envio: ${err.message}`)
    }
  }

  const handleExecuteShipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSale) return
    if (!shipmentTrackCode) {
      toast.error('Informe o código de rastreio')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      let remaining = selectedSale.quantity
      let usedBatchNumber = ''
      let usedExpiryDate = ''

      for (const item of shipmentStockItems) {
        if (remaining <= 0) break

        const deduct = Math.min(item.quantity, remaining)
        const newQty = item.quantity - deduct
        remaining -= deduct

        if (!usedBatchNumber) {
          usedBatchNumber = item.batch_number || item.batchNumber || 'LOTE-GENERICO'
          usedExpiryDate = item.expiry_date || item.expiryDate || new Date().toISOString().split('T')[0]
        }

        // Update batch quantity
        const { error: updateErr } = await supabase
          .from('stock')
          .update({ 
            quantity: newQty,
            status: newQty === 0 ? 'OUT_OF_STOCK' : item.status
          })
          .eq('id', item.id)
        if (updateErr) throw updateErr

        // Register movement
        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert([{
            stock_id: item.id,
            type: 'Saída',
            quantity: deduct,
            reference: `ENVIO-FILIAL-${selectedSale.customer_name}`
          }])
        if (movErr) throw movErr
      }

      // Update Sale status to ENTREGUE
      const { error: saleErr } = await supabase
        .from('sales')
        .update({ status: 'ENTREGUE' })
        .eq('id', selectedSale.id)
      if (saleErr) throw saleErr

      // Update matching Branch Purchase to RECEBIDO with details encoded in status
      const branchName = selectedSale.customer_name.replace('Filial ', '').toLowerCase()
      
      const { data: purchaseData, error: findPurchaseErr } = await supabase
        .from('purchases')
        .select('*')
        .eq('product_id', selectedSale.product_id)
        .eq('quantity', selectedSale.quantity)
        .eq('status', `PENDENTE_${branchName}`)
        .limit(1)

      if (!findPurchaseErr && purchaseData && purchaseData.length > 0) {
        const purchaseId = purchaseData[0].id
        // Format of new status: RECEBIDO_branchName_batch_expiry_track
        const formattedExpiry = new Date(usedExpiryDate).toISOString().split('T')[0]
        const statusValue = `RECEBIDO_${branchName}_${usedBatchNumber}_${formattedExpiry}_${shipmentTrackCode}`
        
        await supabase
          .from('purchases')
          .update({ status: statusValue })
          .eq('id', purchaseId)
      }

      toast.success('Envio realizado com sucesso! Estoque da matriz baixado.')
      setIsShipmentModalOpen(false)
      loadSales()
    } catch (err: any) {
      toast.error(`Erro ao processar envio: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePharmixPurchase = async () => {
    if (!selectedSale || !shipmentDeficit) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { product, needed } = shipmentDeficit

      const purchaseUnitPrice = parseFloat(product.purchase_price || 0)
      const totalPurchaseCost = needed * purchaseUnitPrice

      const { error: purchaseErr } = await supabase
        .from('purchases')
        .insert([{
          supplier_id: product.supplier_id,
          product_id: product.id,
          quantity: needed,
          unit_price: purchaseUnitPrice,
          total_amount: totalPurchaseCost,
          status: 'PENDENTE',
          created_at: new Date().toISOString()
        }])
      if (purchaseErr) throw purchaseErr

      toast.success(`Pedido de compra de ${needed} un. gerado como PENDENTE na Pharmix para o fornecedor.`);
      setIsShipmentModalOpen(false);
      loadSales();
    } catch (err: any) {
      toast.error(`Erro ao gerar compra automática na Pharmix: ${err.message}`)
    } finally {
      setIsSaving(false);
    }
  }

  const formatCurrency = (val: number) => {
    const isFilial = user?.isFilial || (user?.email && (user.email.endsWith('@trade.com') || user.email.includes('connecthealth') || user.email.includes('connect')))
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

  const parseCustomerInfo = (customerName: string) => {
    try {
      const parsed = JSON.parse(customerName)
      if (parsed && typeof parsed === 'object' && parsed.name) {
        return {
          name: parsed.name,
          cpf: parsed.cpf || '',
          email: parsed.email || '',
          document_data: parsed.document_data || ''
        }
      }
    } catch (e) {
      // not JSON
    }
    return { name: customerName, cpf: '', email: '', document_data: '' }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENTREGUE':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
      case 'SAIU PARA ENTREGA':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400'
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400'
    }
  }

  const salesTotalSum = sales.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Vendas
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie vendas em {user?.isFilial ? 'reais (R$ BRL)' : 'dólares ($ USD)'}. Clique em um registro para atualizar o status de entrega ou excluir.
          </p>
        </div>
        <Button 
          className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => {
            setShowAutoPurchasePanel(false);
            setDeficitInfo(null);
            setProductSearch('');
            setShowProductSuggestions(false);
            setIsModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Venda
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Faturamento Realizado ({user?.isFilial ? 'R$ BRL' : '$ USD'})
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(salesTotalSum)}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Transações Totais</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{sales.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vendas por nome do cliente ou status..."
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
          <CardTitle className="text-lg font-bold">Relatório de Transações (USD)</CardTitle>
          <CardDescription>Clique na linha de qualquer venda para gerenciar o status de entrega ou excluir.</CardDescription>
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
          ) : sales.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Nenhuma venda registrada</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Utilize o botão superior para registrar a primeira transação.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Registrar Venda
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                    <th className="py-3.5 px-6">Data</th>
                    <th className="py-3.5 px-6">Cliente</th>
                    <th className="py-3.5 px-6">Produto</th>
                    <th className="py-3.5 px-6 text-center">Quantidade</th>
                    <th className="py-3.5 px-6 text-right">Unitário</th>
                    <th className="py-3.5 px-6 text-right">Valor Total</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sales.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="hover:bg-secondary/60 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(sale)}
                      title="Clique para editar ou excluir"
                    >
                      <td className="py-3.5 px-6 text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-foreground">
                          {parseCustomerInfo(sale.customer_name).name}
                        </div>
                        {parseCustomerInfo(sale.customer_name).cpf && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            CPF: {parseCustomerInfo(sale.customer_name).cpf}
                          </div>
                        )}
                        {parseCustomerInfo(sale.customer_name).email && (
                          <div className="text-[10px] text-muted-foreground">
                            {parseCustomerInfo(sale.customer_name).email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {sale.products?.name || 'Produto Não Localizado'}
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">{sale.quantity}</td>
                      <td className="py-3.5 px-6 text-right font-mono">{formatCurrency(sale.unit_price)}</td>
                      <td className="py-3.5 px-6 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(sale.status || 'PENDENTE')}`}>
                          {sale.status || 'PENDENTE'}
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

      {/* Creation / Auto Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex justify-center items-start sm:items-center animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden my-8 sm:my-0 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-lg font-bold">
                {!showAutoPurchasePanel ? 'Registrar Venda ($ USD)' : 'Estoque Insuficiente - Compra Semiautomática'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setShowAutoPurchasePanel(false);
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!showAutoPurchasePanel ? (
              /* Regular Sales Form */
              <form onSubmit={handleSaleSubmit} className="p-6 space-y-4">
                {user?.isFilial && clients.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Selecionar Cliente Cadastrado (Opcional)</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                      value=""
                      onChange={e => {
                        const selected = clients.find(c => c.id === e.target.value)
                        if (selected) {
                          setForm(prev => ({
                            ...prev,
                            customer_name: selected.company,
                            customer_email: selected.email || '',
                            customer_cpf: selected.contact || '',
                          }))
                        }
                      }}
                    >
                      <option value="">-- Escolha um cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company} {c.contact ? `(${c.contact})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome do Cliente / Empresa *</label>
                  <Input
                    placeholder="Ex: Farmácia Popular Centro"
                    value={form.customer_name}
                    onChange={e => setForm({...form, customer_name: e.target.value})}
                    required
                  />
                </div>

                {user?.isFilial && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">CPF do Cliente *</label>
                        <Input
                          placeholder="000.000.000-00"
                          value={form.customer_cpf}
                          onChange={e => setForm({...form, customer_cpf: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">E-mail do Cliente *</label>
                        <Input
                          type="email"
                          placeholder="cliente@email.com"
                          value={form.customer_email}
                          onChange={e => setForm({...form, customer_email: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Documento (Receita / ID) *</label>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        required
                        className="bg-card cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5 product-suggestions-container relative">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Produto / Medicamento *</label>
                  <div className="relative">
                    <Input
                      placeholder="Pesquise por medicamento ou princípio ativo..."
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value)
                        setShowProductSuggestions(true)
                        if (!e.target.value) {
                          setForm(prev => ({ ...prev, product_id: '', unit_price: '' }))
                        }
                      }}
                      onFocus={() => setShowProductSuggestions(true)}
                      required
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('')
                          setShowProductSuggestions(false)
                          setForm(prev => ({ ...prev, product_id: '', unit_price: '' }))
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {showProductSuggestions && productSearch && (
                    <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg animate-in fade-in duration-100">
                      {getFilteredProducts().length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          Nenhum produto encontrado.
                        </div>
                      ) : (
                        getFilteredProducts().map(p => {
                          const finalPrice = getProductFinalPrice(p)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProductSearch(`${p.name} (${p.code || 'S/ Princípio'})`)
                                setForm(prev => ({ ...prev, product_id: p.id }))
                                handleProductChange(p.id)
                                setShowProductSuggestions(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-secondary/80 flex items-center justify-between border-b border-border/20 last:border-0 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="font-semibold text-foreground">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  Princípio Ativo: <span className="font-medium text-foreground">{p.code || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {p.isCheapest && (
                                  <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    Mais Barato
                                  </span>
                                )}
                                <span className="font-mono font-bold text-primary">
                                  {formatCurrency(finalPrice)}
                                </span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                  {/* Keep a hidden input to enforce standard HTML form validation if required is passed */}
                  <input type="hidden" name="product_id" value={form.product_id} required />
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
                      Unitário ({user?.isFilial ? 'R$ BRL' : '$ USD'}) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.unit_price}
                      onChange={e => setForm({...form, unit_price: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Status de Entrega</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.status}
                      onChange={e => setForm({...form, status: e.target.value})}
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="SAIU PARA ENTREGA">SAIU PARA ENTREGA</option>
                      <option value="ENTREGUE">ENTREGUE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Total ({user?.isFilial ? 'R$ BRL' : '$ USD'})</label>
                    <Input
                      type="text"
                      value={form.total_amount ? `${user?.isFilial ? 'R$' : '$'} ${form.total_amount}` : `${user?.isFilial ? 'R$' : '$'} 0.00`}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Venda
                  </Button>
                </div>
              </form>
            ) : (
              /* Deficit Warning & Auto Purchase Confirmation */
              <div className="p-6 space-y-5 animate-in slide-in-from-right-5 duration-200">
                <div className="flex items-start gap-3 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-sm">
                    <span className="font-bold">Quantidade insuficiente no estoque!</span>
                    <p className="text-xs text-muted-foreground">
                      Você solicitou {form.quantity} unidades, mas tem apenas {deficitInfo?.available} no estoque.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase">Proposta de Compra PENDENTE</h4>
                  <div className="bg-secondary/40 p-4 rounded-lg border border-border/40 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fornecedor</span>
                      <span className="font-semibold text-foreground">{deficitInfo?.product?.suppliers?.company || 'Não cadastrado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Qtd Necessária</span>
                      <span className="font-bold text-amber-600">{deficitInfo?.needed} un.</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                       <span className="text-muted-foreground">Custo Unitário</span>
                       <span className="font-mono font-semibold">{formatCurrency(parseFloat(user?.isFilial ? (deficitInfo?.product?.sale_price || deficitInfo?.product?.purchase_price || 0) : (deficitInfo?.product?.purchase_price || 0)))}</span>
                     </div>
                     <div className="flex items-center justify-between border-t border-border/45 pt-2">
                       <span className="font-bold text-xs text-foreground">Total da Compra</span>
                       <span className="font-mono font-extrabold text-foreground">
                         {formatCurrency(deficitInfo ? deficitInfo.needed * parseFloat(user?.isFilial ? (deficitInfo.product.sale_price || deficitInfo.product.purchase_price || 0) : (deficitInfo.product.purchase_price || 0)) : 0)}
                       </span>
                     </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ao confirmar, o sistema criará o pedido de compra como <strong>PENDENTE</strong>. A venda atual será cancelada, pois o estoque físico só será reabastecido quando você der entrada e receber esta compra na tela de Compras.
                </p>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAutoPurchasePanel(false)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleConfirmAutoPurchase} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar e Gerar Compra
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail & Edit / Delete Modal */}
      {isDetailModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex justify-center items-start sm:items-center animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden my-8 sm:my-0 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <div>
                <h2 className="text-lg font-bold">Detalhes da Venda</h2>
                <p className="text-[10px] text-muted-foreground font-mono">ID: {selectedSale.id}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/30 p-3 rounded-lg border border-border/40">
                <div className="col-span-2 border-b border-border/40 pb-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</span>
                  <div className="font-semibold text-base">{parseCustomerInfo(selectedSale.customer_name).name}</div>
                  {parseCustomerInfo(selectedSale.customer_name).cpf && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      CPF: {parseCustomerInfo(selectedSale.customer_name).cpf}
                    </div>
                  )}
                  {parseCustomerInfo(selectedSale.customer_name).email && (
                    <div className="text-xs text-muted-foreground">
                      E-mail: {parseCustomerInfo(selectedSale.customer_name).email}
                    </div>
                  )}
                  {parseCustomerInfo(selectedSale.customer_name).document_data && (
                    <div className="mt-2">
                      <a 
                        href={parseCustomerInfo(selectedSale.customer_name).document_data}
                        download={`documento-${parseCustomerInfo(selectedSale.customer_name).name.replace(/\s+/g, '_')}`}
                        className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 Download/Visualizar Documento
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Produto</span>
                  <div className="font-semibold">{selectedSale.products?.name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Quantidade</span>
                  <div>{selectedSale.quantity} un. x {formatCurrency(selectedSale.unit_price)}</div>
                </div>
                <div className="col-span-2 border-t border-border/40 pt-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Faturamento</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(selectedSale.total_amount)}</div>
                </div>
              </div>

              {/* Status Edit */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Status da Entrega</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-ring"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="SAIU PARA ENTREGA">SAIU PARA ENTREGA</option>
                  <option value="ENTREGUE">ENTREGUE</option>
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {!user?.isFilial && selectedSale.customer_name?.startsWith('Filial ') && selectedSale.status === 'PENDENTE' && (
                  <Button 
                    onClick={() => handleOpenShipment(selectedSale)} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                  >
                    🚀 Enviar para Filial
                  </Button>
                )}
                <Button 
                  onClick={handleUpdateStatus} 
                  className="w-full" 
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar Status de Entrega
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
                    onClick={handleDeleteSale}
                    disabled={isDeleting}
                    className="flex-1 gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Venda
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Shipment Modal */}
      {isShipmentModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <div>
                <h2 className="text-lg font-bold">Enviar Pedido para Filial</h2>
                <p className="text-xs text-muted-foreground">{selectedSale.products?.name} - {selectedSale.quantity} un.</p>
              </div>
              <button 
                onClick={() => setIsShipmentModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {shipmentDeficit ? (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-sm">
                    <span className="font-bold">Estoque insuficiente na Pharmix!</span>
                    <p className="text-xs text-muted-foreground">
                      Você precisa de {selectedSale.quantity} unidades, mas tem apenas {shipmentDeficit.available} no estoque da matriz.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Para poder enviar este produto para a filial, você precisa primeiro comprá-lo do fornecedor genérico. Deseja gerar uma compra automática de <strong>{shipmentDeficit.needed} unidades</strong> na Pharmix?
                </p>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsShipmentModalOpen(false)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleGeneratePharmixPurchase} 
                    className="flex-1 bg-primary text-primary-foreground font-bold"
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar Compra Automática
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteShipment} className="p-6 space-y-4">
                <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
                  <ClipboardList className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold">Estoque Disponível!</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A matriz possui estoque suficiente para atender este pedido.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Código de Rastreio (Track Code) *</label>
                  <Input 
                    placeholder="Ex: BR123456789XX"
                    value={shipmentTrackCode}
                    onChange={e => setShipmentTrackCode(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsShipmentModalOpen(false)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Envio
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
