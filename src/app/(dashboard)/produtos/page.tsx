'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProducts } from '@/features/products/hooks/use-products'
import { Plus, Search, X, Trash2, PackageSearch, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function ProductsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Creation form states
  const [form, setForm] = useState({
    code: '',
    name: '',
    purchase_price: '',
    sale_price: '',
    supplier_id: '',
    description: '',
    status: 'Ativo'
  })

  // Edit form states
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    purchase_price: '',
    sale_price: '',
    supplier_id: '',
    description: '',
    status: 'Ativo'
  })

  const { data, isLoading, refetch } = useProducts({ search, skip, take: 25 })

  // Load suppliers for dropdown selection
  async function loadSuppliers() {
    try {
      const supabase = createClient()
      const { data: sups, error } = await supabase.from('suppliers').select('id, company')
      if (error) throw error
      setSuppliers(sups || [])
    } catch (err) {
      console.error('Error loading suppliers in products page:', err)
    }
  }

  useEffect(() => {
    loadSuppliers()
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('')
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.name || !form.purchase_price || !form.sale_price || !form.supplier_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('products').insert([{
        code: form.code,
        name: form.name,
        purchase_price: parseFloat(form.purchase_price),
        sale_price: parseFloat(form.sale_price),
        supplier_id: form.supplier_id,
        description: form.description,
        status: form.status,
        created_at: new Date().toISOString()
      }])
      
      if (error) throw error

      toast.success('Produto criado com sucesso!')
      setIsModalOpen(false)
      setForm({
        code: '',
        name: '',
        purchase_price: '',
        sale_price: '',
        supplier_id: '',
        description: '',
        status: 'Ativo'
      })
      refetch()
    } catch (err: any) {
      toast.error(`Erro ao criar produto: ${err.message || 'Erro ao registrar'}`)
    }
  }

  const handleOpenDetail = (product: any) => {
    setSelectedProduct(product)
    setEditForm({
      code: product.code || '',
      name: product.name || '',
      purchase_price: product.purchase_price ? parseFloat(product.purchase_price).toString() : '',
      sale_price: product.sale_price ? parseFloat(product.sale_price).toString() : '',
      supplier_id: product.supplier_id || '',
      description: product.description || '',
      status: product.status || 'Ativo'
    })
    setIsDetailModalOpen(true)
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.code || !editForm.name || !editForm.purchase_price || !editForm.sale_price || !editForm.supplier_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('products')
        .update({
          code: editForm.code,
          name: editForm.name,
          purchase_price: parseFloat(editForm.purchase_price),
          sale_price: parseFloat(editForm.sale_price),
          supplier_id: editForm.supplier_id,
          description: editForm.description,
          status: editForm.status
        })
        .eq('id', selectedProduct.id)

      if (error) throw error
      toast.success('Produto atualizado com sucesso!')
      setIsDetailModalOpen(false)
      refetch()
    } catch (err: any) {
      toast.error(`Erro ao atualizar produto: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return
    const confirmDelete = window.confirm(`Deseja realmente excluir o produto "${selectedProduct.name}"?`)
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id)
      
      if (error) throw error
      toast.success('Produto excluído com sucesso!')
      setIsDetailModalOpen(false)
      refetch()
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Produtos
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seu catálogo. Clique em qualquer produto para editar os preços, detalhes ou excluir.
          </p>
        </div>
        {!user?.isFilial && (
          <Button 
            className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 self-start md:self-auto"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar produtos por nome ou código..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSkip(0)
            }}
            className="pl-10 pr-10 bg-card border-border/60"
          />
          {search && (
            <button 
              onClick={() => {
                setSearch('')
                searchInputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-border/50 overflow-hidden bg-card/70 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-lg font-bold">Catálogo (Valores em USD)</CardTitle>
          <CardDescription>
            Clique na linha de qualquer produto para editar seus dados ou excluir.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/20 last:border-0 animate-pulse">
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : data?.products?.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground">
                <PackageSearch className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Nenhum produto cadastrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Adicione produtos para associá-los aos fornecedores correspondentes.
                </p>
              </div>
              {!user?.isFilial && (
                <Button size="sm" onClick={() => setIsModalOpen(true)}>
                  Cadastrar Primeiro Produto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                    <th className="py-3.5 px-6">Código</th>
                    <th className="py-3.5 px-6">Nome</th>
                    {user?.isFilial ? (
                      <>
                        <th className="py-3.5 px-6 text-right">Custo da Pharmix</th>
                        <th className="py-3.5 px-6 text-right">Preço Venda Final</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-6 text-right">Preço Compra</th>
                        <th className="py-3.5 px-6 text-right">Preço Venda</th>
                      </>
                    )}
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {data?.products?.map((product: any) => (
                    <tr 
                      key={product.id} 
                      className="group hover:bg-secondary/60 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(product)}
                      title={user?.isFilial ? "Clique para ver detalhes" : "Clique para editar ou excluir"}
                    >
                      <td className="py-3.5 px-6 font-mono text-xs text-muted-foreground font-semibold">
                        {product.code}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-foreground">
                        {product.name}
                      </td>
                      {user?.isFilial ? (
                        <>
                           <td className="py-3.5 px-6 text-right font-mono text-muted-foreground">
                             {formatCurrency(parseFloat(product.sale_price ?? 0))}
                           </td>
                           <td className="py-3.5 px-6 text-right font-mono font-medium text-primary">
                             {formatCurrency(parseFloat(product.sale_price ?? 0) * (user?.filialName === 'trade' ? 2 : user?.filialName === 'connecthealth' ? 1.8 : user?.filialName === 'connect' ? 1.5 : 1))}
                           </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-6 text-right font-mono text-muted-foreground">
                            {formatCurrency(product.purchase_price)}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-medium text-primary">
                            {formatCurrency(product.sale_price)}
                          </td>
                        </>
                      )}
                      <td className="py-3.5 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          product.status === 'Inativo'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                        }`}>
                          {product.status}
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
              <h2 className="text-lg font-bold">Novo Produto</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Código *</label>
                  <Input 
                    placeholder="Ex: PRD-001" 
                    value={form.code}
                    onChange={e => setForm({...form, code: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome do Medicamento *</label>
                <Input 
                  placeholder="Ex: Paracetamol 500mg" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Fornecedor Associado *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  value={form.supplier_id}
                  onChange={e => setForm({...form, supplier_id: e.target.value})}
                  required
                >
                  <option value="">Selecione o fornecedor deste produto...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Preço Compra ($ USD) *</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    value={form.purchase_price}
                    onChange={e => setForm({...form, purchase_price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Preço Venda ($ USD) *</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    value={form.sale_price}
                    onChange={e => setForm({...form, sale_price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Descrição</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  placeholder="Detalhes adicionais..." 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  Cadastrar Produto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Delete Product Modal */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <div>
                <h2 className="text-lg font-bold">{user?.isFilial ? 'Detalhes do Produto' : 'Editar Produto'}</h2>
                <p className="text-[10px] text-muted-foreground font-mono">ID: {selectedProduct.id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={user?.isFilial ? (e) => { e.preventDefault(); setIsDetailModalOpen(false); } : handleUpdateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Código</label>
                  <Input 
                    value={editForm.code}
                    onChange={e => setEditForm({...editForm, code: e.target.value})}
                    disabled={user?.isFilial}
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    disabled={user?.isFilial}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome do Medicamento</label>
                <Input 
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  disabled={user?.isFilial}
                  required
                />
              </div>

              {!user?.isFilial && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Fornecedor Associado *</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                    value={editForm.supplier_id}
                    onChange={e => setEditForm({...editForm, supplier_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione o fornecedor deste produto...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 grid-cols-2">
                {user?.isFilial ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Preço de Compra (Pharmix) ($ USD)</label>
                      <Input 
                        type="number"
                        value={editForm.sale_price}
                        disabled
                      />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-muted-foreground uppercase">Venda Final Sugerido ($ USD)</label>
                       <Input 
                         type="number"
                         value={(parseFloat(editForm.sale_price || '0') * (user?.filialName === 'trade' ? 2 : user?.filialName === 'connecthealth' ? 1.8 : user?.filialName === 'connect' ? 1.5 : 1)).toFixed(2)}
                         disabled
                       />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Preço Compra ($ USD) *</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editForm.purchase_price}
                        onChange={e => setEditForm({...editForm, purchase_price: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Preço Venda ($ USD) *</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editForm.sale_price}
                        onChange={e => setEditForm({...editForm, sale_price: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Descrição</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  disabled={user?.isFilial}
                />
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-border">
                {!user?.isFilial ? (
                  <>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDeleteProduct}
                      disabled={isDeleting}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    <Button type="button" onClick={() => setIsDetailModalOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
