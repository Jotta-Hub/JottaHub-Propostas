import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verifica se tem cookie de sessão do Supabase
  const hasSession = request.cookies.getAll().some(c => 
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  // Protege /admin
  if (pathname.startsWith('/admin') && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se logado vai direto pro admin
  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/login'],
}
