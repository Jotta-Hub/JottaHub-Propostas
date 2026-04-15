import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const allCookies = request.cookies.getAll()
  const hasSession = allCookies.some(c => c.name.includes('supabase') || c.name.includes('sb-'))

  if (pathname.startsWith('/admin') && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/login'],
}
