import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pega o token da sessão nos cookies
  const accessToken = request.cookies.get('sb-access-token')?.value ||
    request.cookies.getAll().find(c => c.name.includes('auth-token'))?.value

  // Tenta verificar sessão via Supabase
  let isAuthenticated = false

  if (accessToken) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser(accessToken)
      isAuthenticated = !!user
    } catch {
      isAuthenticated = false
    }
  }

  // Protege /admin
  if (pathname.startsWith('/admin') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Se logado e vai pro /login, redireciona pro admin
  if (pathname === '/login' && isAuthenticated) {
    const adminUrl = new URL('/admin', request.url)
    return NextResponse.redirect(adminUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/login'],
}
