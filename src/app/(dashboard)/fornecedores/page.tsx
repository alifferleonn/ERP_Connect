'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, X, Loader2, Users, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function FornecedoresPage() {
  const [search, setSearch] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Creation form state
  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    country: '',
    notes: ''
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    country: '',
    notes: ''
  })

  async function loadSuppliers() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase.from('suppliers').select('*').neq('country', 'Cliente')
      if (search) {
        query = query.or(`company.ilike.%${search}%,contact.ilike.%${search}%,country.ilike.%${search}%`)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setSuppliers(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [search])

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company || !form.contact || !form.email || !form.country) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('suppliers').insert([form])
      if (error) throw error
      toast.success('Fornecedor cadastrado com sucesso!')
      setIsModalOpen(false)
      setForm({
        company: '',
        contact: '',
        email: '',
        phone: '',
        country: '',
        notes: ''
      })
      loadSuppliers()
    } catch (err: any) {
      toast.error(`Erro ao cadastrar fornecedor: ${err.message || 'Erro ao registrar'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDetail = (supplier: any) => {
    setSelectedSupplier(supplier)
    setEditForm({
      company: supplier.company || '',
      contact: supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      country: supplier.country || '',
      notes: supplier.notes || ''
    })
    setIsDetailModalOpen(true)
  }

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.company || !editForm.contact || !editForm.email || !editForm.country) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('suppliers')
        .update(editForm)
        .eq('id', selectedSupplier.id)
      
      if (error) throw error
      toast.success('Informações do fornecedor atualizadas!')
      setIsDetailModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      toast.error(`Erro ao atualizar fornecedor: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete supplier AND CASCADE DELETE products programmatically
  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return
    const confirmDelete = window.confirm(
      `Deseja realmente excluir o fornecedor "${selectedSupplier.company}"? ATENÇÃO: Todos os produtos associados a este fornecedor também serão excluídos!`
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const supabase = createClient()

      // 1. Delete all products belonging to this supplier first (Programmatic Cascade)
      const { error: prodDeleteErr } = await supabase
        .from('products')
        .delete()
        .eq('supplier_id', selectedSupplier.id)
      if (prodDeleteErr) throw prodDeleteErr

      // 2. Delete the supplier itself
      const { error: supplierDeleteErr } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', selectedSupplier.id)
      if (supplierDeleteErr) throw supplierDeleteErr

      toast.success('Fornecedor e todos os seus produtos associados foram excluídos!')
      setIsDetailModalOpen(false)
      loadSuppliers()
    } catch (err: any) {
      toast.error(`Erro ao excluir fornecedor: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Fornecedores
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie contatos e fornecedores. Excluir um fornecedor também removerá todos os seus produtos associados.
          </p>
        </div>
        <Button 
          className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedores por empresa, contato ou país..."
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
          <CardTitle className="text-lg font-bold">Parceiros de Negócios</CardTitle>
          <CardDescription>
            Clique na linha de qualquer fornecedor para editar seus dados ou excluir.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/20 last:border-0 animate-pulse">
                  <div className="h-4 w-40 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Nenhum fornecedor cadastrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Cadastre um fornecedor para associar novos produtos e compras.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Cadastrar Fornecedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                    <th className="py-3.5 px-6">Empresa</th>
                    <th className="py-3.5 px-6">Contato</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Telefone</th>
                    <th className="py-3.5 px-6">País</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {suppliers.map((supplier) => (
                    <tr 
                      key={supplier.id} 
                      className="hover:bg-secondary/60 cursor-pointer transition-colors"
                      onClick={() => handleOpenDetail(supplier)}
                      title="Clique para editar ou excluir"
                    >
                      <td className="py-3.5 px-6 font-semibold text-foreground">{supplier.company}</td>
                      <td className="py-3.5 px-6">{supplier.contact}</td>
                      <td className="py-3.5 px-6 text-muted-foreground">{supplier.email}</td>
                      <td className="py-3.5 px-6 text-muted-foreground">{supplier.phone || 'Não informado'}</td>
                      <td className="py-3.5 px-6">
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded border border-border/30">
                          {supplier.country}
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
              <h2 className="text-lg font-bold">Novo Fornecedor</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome da Empresa *</label>
                <Input
                  placeholder="Ex: PharmaCorp Int."
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome do Contato *</label>
                  <Input
                    placeholder="Ex: John Doe"
                    value={form.contact}
                    onChange={e => setForm({...form, contact: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">País *</label>
                  <Input
                    placeholder="Ex: Índia, Alemanha"
                    value={form.country}
                    onChange={e => setForm({...form, country: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="exemplo@fornecedor.com"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Telefone</label>
                  <Input
                    placeholder="Ex: +1 555-0199"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Notas</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  placeholder="Instruções de envio, prazos ou formas de pagamento..."
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar Fornecedor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Delete Detail Modal */}
      {isDetailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <div>
                <h2 className="text-lg font-bold">Editar Fornecedor</h2>
                <p className="text-[10px] text-muted-foreground font-mono">ID: {selectedSupplier.id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome da Empresa *</label>
                <Input
                  value={editForm.company}
                  onChange={e => setEditForm({...editForm, company: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome do Contato *</label>
                  <Input
                    value={editForm.contact}
                    onChange={e => setEditForm({...editForm, contact: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">País *</label>
                  <Input
                    value={editForm.country}
                    onChange={e => setEditForm({...editForm, country: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Email *</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Telefone</label>
                  <Input
                    value={editForm.phone}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Notas</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDeleteSupplier} 
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
