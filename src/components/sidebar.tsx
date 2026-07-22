'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Box,
  Boxes,
  DollarSign,
  LogOut,
  MessageSquare,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  const currentMenuItems = user?.isFilial
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/produtos', label: 'Produtos', icon: Box },
        { href: '/compras', label: 'Compras', icon: ShoppingCart },
        { href: '/contatos', label: 'Contatos de Clientes', icon: Users },
        { href: '/vendas', label: 'Vendas', icon: DollarSign },
        { href: '/chat', label: 'Bate-Papo Realtime', icon: MessageSquare },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/produtos', label: 'Produtos', icon: Box },
        { href: '/compras', label: 'Compras', icon: ShoppingCart },
        { href: '/fornecedores', label: 'Fornecedores', icon: Users },
        { href: '/estoque', label: 'Estoque', icon: Boxes },
        { href: '/vendas', label: 'Vendas', icon: DollarSign },
        { href: '/chat', label: 'Bate-Papo Realtime', icon: MessageSquare },
      ]


  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 border-r border-border bg-card transition-all duration-300 z-50',
          'md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent capitalize">
            {user?.isFilial ? `Pharmix - ${user.filialName}` : 'Pharmix Global'}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentMenuItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
            onClick={async () => {
              try {
                const { createClient } = await import('@/lib/supabase-client')
                const supabase = createClient()
                await supabase.auth.signOut()
              } catch (err) {
                console.error('Logout error:', err)
              }
              window.location.href = '/'
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-45 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
