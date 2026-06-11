import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple cookie-based gate — full session validation happens in server components via auth()
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow auth endpoints and the login page through
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // In dev without OAuth creds, skip the gate
  if (!process.env.AUTH_GOOGLE_ID) return NextResponse.next()

  // NextAuth v5 session cookies
  const hasSession =
    request.cookies.has('next-auth.session-token') ||
    request.cookies.has('__Secure-next-auth.session-token')

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
