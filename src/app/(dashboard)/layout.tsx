import { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard | Pharmix Global',
  description: 'Dashboard do ERP Pharmix Global',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 md:ml-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 md:ml-0">
          {children}
        </main>
      </div>
    </div>
  )
}
