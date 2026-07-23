import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticação | ConnectSync',
  description: 'Sistema de autenticação do ERP ConnectSync',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  )
}
