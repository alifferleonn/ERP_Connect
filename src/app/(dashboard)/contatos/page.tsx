'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, X, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function ContatosPage() {
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)

  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    notes: '',
    country: 'Cliente',
    cpf: '',
  })

  async function loadContacts() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('country', 'Cliente')

      if (search) {
        query = query.or(`company.ilike.%${search}%,contact.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`)
      }

      const { data, error } = await query.order('company', { ascending: true })
      if (error) throw error
      setContacts(data || [])
    } catch (err: any) {
      console.error('Error loading contacts:', err)
      toast.error('Erro ao carregar contatos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company || !form.contact || !form.email || !form.phone || !form.cpf) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      if (selectedContact) {
        // Edit contact
        const { error } = await supabase
          .from('suppliers')
          .update({
            company: form.company,
            contact: form.contact,
            email: form.email,
            phone: form.phone,
            notes: form.notes,
            cpf: form.cpf,
          })
          .eq('id', selectedContact.id)
        if (error) throw error
        toast.success('Contato atualizado com sucesso!')
      } else {
        // Create contact
        const { error } = await supabase
          .from('suppliers')
          .insert([{
            company: form.company,
            contact: form.contact,
            email: form.email,
            phone: form.phone,
            notes: form.notes,
            country: 'Cliente',
            cpf: form.cpf,
          }])
        if (error) throw error
        toast.success('Contato cadastrado com sucesso!')
      }

      setIsModalOpen(false)
      setSelectedContact(null)
      setForm({
        company: '',
        contact: '',
        email: '',
        phone: '',
        notes: '',
        country: 'Cliente',
        cpf: '',
      })
      loadContacts()
    } catch (err: any) {
      toast.error(`Erro ao salvar contato: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }


  const handleEdit = (contact: any) => {
    setSelectedContact(contact)
    setForm({
      company: contact.company || '',
      contact: contact.contact || '',
      email: contact.email || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
      country: 'Cliente',
      cpf: contact.cpf || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (contact: any) => {
    const confirm = window.confirm(`Deseja realmente excluir o contato de "${contact.company}"?`)
    if (!confirm) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', contact.id)

      if (error) throw error
      toast.success('Contato excluído com sucesso!')
      loadContacts()
    } catch (err: any) {
      toast.error(`Erro ao excluir contato: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Contatos de Clientes
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os contatos de clientes frequentes da filial.
          </p>
        </div>
        <Button onClick={() => { setSelectedContact(null); setIsModalOpen(true); }} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos por nome, empresa ou e-mail..."
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
          <CardTitle className="text-lg font-bold">Lista de Clientes Frequentes</CardTitle>
          <CardDescription>
            Contatos cadastrados para esta filial.
          </CardDescription>
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
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/85 flex items-center justify-center text-muted-foreground">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Nenhum contato cadastrado</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Crie contatos para facilitar o faturamento e vendas recorrentes.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Cadastrar Primeiro Contato
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/20 border-b border-border/40 text-muted-foreground font-medium text-left">
                    <th className="py-3.5 px-6">Nome / Empresa</th>
                    <th className="py-3.5 px-6">Pessoa de Contato</th>
                    <th className="py-3.5 px-6">E-mail</th>
                    <th className="py-3.5 px-6">Telefone</th>
                    <th className="py-3.5 px-6">Observações</th>
                    <th className="py-3.5 px-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-secondary/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-foreground">{contact.company}</div>
                        {contact.cpf && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            CPF: {contact.cpf}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">{contact.contact}</td>
                      <td className="py-3.5 px-6 font-mono text-xs">{contact.email}</td>
                      <td className="py-3.5 px-6 font-mono text-xs">{contact.phone}</td>

                      <td className="py-3.5 px-6 text-muted-foreground max-w-xs truncate">{contact.notes || '-'}</td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(contact)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/20">
              <h2 className="text-lg font-bold">
                {selectedContact ? 'Editar Contato' : 'Novo Contato'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Nome do Cliente / Empresa *</label>
                <Input
                  placeholder="Ex: Aliffer Leonn"
                  value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Pessoa Física de Contato *</label>
                <Input
                  placeholder="Ex: Aliffer Azevedo"
                  value={form.contact}
                  onChange={e => setForm({...form, contact: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">CPF *</label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={e => setForm({...form, cpf: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">E-mail *</label>
                  <Input
                    type="email"
                    placeholder="contato@email.com"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Telefone *</label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase font-medium">Observações</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  placeholder="Medicamentos que costuma pedir, preferências, etc..."
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
                  {selectedContact ? 'Salvar Alterações' : 'Cadastrar Contato'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
