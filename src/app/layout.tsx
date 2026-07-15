import { Metadata } from 'next'
import { Providers } from '@/components/providers'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Pharmix Global - ERP Farmacêutico',
  description: 'Sistema completo de gestão de ERP para empresas farmacêuticas',
  keywords:
    'ERP, farmacêutico, gestão, estoque, vendas, compras, suprimentos',
}

const COLORS = {
  light: {
    '--background': '0 0% 100%',
    '--foreground': '224 71.4% 4.1%',
    '--card': '0 0% 100%',
    '--card-foreground': '224 71.4% 4.1%',
    '--primary': '220.9 39.3% 11%',
    '--primary-foreground': '210 40% 98%',
    '--secondary': '220 14.3% 95.9%',
    '--secondary-foreground': '220.9 39.3% 11%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    '--muted': '220 14.3% 95.9%',
    '--muted-foreground': '220 8.9% 46.1%',
    '--accent': '217.2 91.2% 59.8%',
    '--accent-foreground': '210 40% 98%',
    '--border': '220 13% 91%',
    '--input': '220 13% 91%',
    '--ring': '217.2 91.2% 59.8%',
    '--radius': '0.5rem',
  },
  dark: {
    '--background': '224 71.4% 4.1%',
    '--foreground': '210 40% 98%',
    '--card': '224 71.4% 4.1%',
    '--card-foreground': '210 40% 98%',
    '--primary': '210 40% 98%',
    '--primary-foreground': '220.9 39.3% 11%',
    '--secondary': '217.2 32.6% 17.5%',
    '--secondary-foreground': '210 40% 98%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '210 40% 98%',
    '--muted': '217.2 32.6% 17.5%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '217.2 91.2% 59.8%',
    '--accent-foreground': '224 71.4% 4.1%',
    '--border': '217.2 32.6% 17.5%',
    '--input': '217.2 32.6% 17.5%',
    '--ring': '217.2 91.2% 59.8%',
    '--radius': '0.5rem',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <style>
          {`
            :root {
              ${Object.entries(COLORS.light)
                .map(([key, value]) => `${key}: ${value};`)
                .join('\n')}
            }
            @media (prefers-color-scheme: dark) {
              :root {
                ${Object.entries(COLORS.dark)
                  .map(([key, value]) => `${key}: ${value};`)
                  .join('\n')}
              }
            }
            html[class~="dark"] {
              ${Object.entries(COLORS.dark)
                .map(([key, value]) => `${key}: ${value};`)
                .join('\n')}
            }
          `}
        </style>
      </head>
      <body className="bg-background text-foreground">
        <Providers>
          {children}
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
