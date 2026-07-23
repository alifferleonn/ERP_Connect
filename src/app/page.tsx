'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha todos os campos.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      
      // Authenticate directly via Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (error) throw error

      toast.success('Login realizado com sucesso! Bem-vindo.')
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar login no Supabase. Verifique se o usuário existe.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 relative overflow-hidden">
      {/* Visual decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />

      <Card className="w-full max-w-md border-border/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-primary to-emerald-500" />
        
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-white mt-4">
            Pharmix Global
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs sm:text-sm">
            Digite suas credenciais para acessar o painel ERP
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950/40 border-slate-800 text-white focus-visible:ring-indigo-500 placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 bg-slate-950/40 border-slate-800 text-white focus-visible:ring-indigo-500 placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold transition-all duration-300 shadow-md py-6 mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Pharmix Global ERP. Todos os direitos reservados.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
