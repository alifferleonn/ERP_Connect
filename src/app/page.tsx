'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Lock, 
  Mail, 
  Loader2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Globe2, 
  Zap, 
  Boxes,
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (error) throw error

      toast.success('Autenticado com sucesso! Entrando no Pharmix ERP...')
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar login. Verifique suas credenciais no Supabase.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/20 via-teal-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-slate-900/70 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Side: Brand Identity & Feature Showcase (Visible on Large Screens) */}
        <div className="lg:col-span-6 p-8 lg:p-12 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-indigo-950/40 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/60 relative overflow-hidden">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="space-y-8">
            {/* Header Brand */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Pharmix Global
                </h1>
                <span className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Enterprise ERP
                </span>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Gestão Inteligente &amp; Multimoeda em Tempo Real
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Plataforma integrada de controle logístico, estoque internacional, compras e faturamento corporativo para Matriz e Filiais.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 transition-all hover:border-slate-700/80">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Supabase Realtime Sync</h4>
                  <p className="text-[11px] text-slate-400">Sincronização instantânea de pedidos e estoque entre unidades.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 transition-all hover:border-slate-700/80">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Globe2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Multimoeda Dinâmica (USD / BRL)</h4>
                  <p className="text-[11px] text-slate-400">Conversão cambial em tempo real com relatórios consolidados.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 transition-all hover:border-slate-700/80">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Gestão Multiarmazéns</h4>
                  <p className="text-[11px] text-slate-400">Controle físico de lotes e validade em Dubai, Uruguai e Panamá.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Companies Footer Badge */}
          <div className="pt-8 mt-8 border-t border-slate-800/60">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Unidades Conectadas ao ERP:</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">Pharmix Matriz</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Filial Trade</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">Filial Connect</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">ConnectHealth</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">Filial Bioss</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between bg-slate-900/40">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">Acessar o Sistema</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                Entre com seu e-mail corporativo e senha cadastrados no Supabase Auth.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="usuario@pharmix.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-950/60 border-slate-800 text-slate-100 text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent placeholder:text-slate-600 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-slate-950/60 border-slate-800 text-slate-100 text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent placeholder:text-slate-600 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:via-purple-500 hover:to-emerald-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Autenticando sessão...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar no Painel <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Copyright Footer */}
          <div className="pt-8 mt-8 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Supabase Encrypted SSL
            </span>
            <span>Pharmix v2.4 (2026)</span>
          </div>
        </div>

      </div>
    </div>
  )
}
