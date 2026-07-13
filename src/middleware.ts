import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Protected paths
  const isDashboardRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/produtos') || 
    pathname.startsWith('/compras') || 
    pathname.startsWith('/vendas') || 
    pathname.startsWith('/fornecedores') || 
    pathname.startsWith('/estoque') ||
    pathname.startsWith('/pedidos')

  // 1. Redirect unauthenticated users trying to access protected routes
  if (isDashboardRoute && !user) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Redirect authenticated users trying to access root login page
  if (pathname === '/' && user) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
