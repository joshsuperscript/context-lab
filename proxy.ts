import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/auth/') || pathname === '/login') {
    return NextResponse.next()
  }

  const hasOAuthCreds = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  if (!hasOAuthCreds) return NextResponse.next()

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
