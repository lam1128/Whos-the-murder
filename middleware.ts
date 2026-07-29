import { NextRequest, NextResponse } from 'next/server'

// Simple token-based protection for temporary sharing.
// Set environment variable ALLOWED_TOKENS as comma-separated tokens, e.g.
// ALLOWED_TOKENS=token1,token2,token3

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const pathname = url.pathname
  const hostname = req.nextUrl.hostname

  // allow next internals and static files
  if (
    pathname === '/auth' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const raw = process.env.ALLOWED_TOKENS || ''
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean)

  // Local development should stay frictionless unless tokens are explicitly configured.
  if (hostname === 'localhost' || hostname === '127.0.0.1' || allowed.length === 0) {
    return NextResponse.next()
  }

  const cookieToken = req.cookies.get('game_token')?.value
  const queryToken = req.nextUrl.searchParams.get('token')
  const token = cookieToken || queryToken

  if (token && allowed.includes(token)) {
    const res = NextResponse.next()
    // persist token in cookie if it wasn't already present
    if (!cookieToken) res.cookies.set('game_token', token, { path: '/' })
    return res
  }

  // redirect to auth page with returnTo
  const redirectTo = new URL('/auth', req.url)
  redirectTo.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(redirectTo)
}

export const config = {
  matcher: ['/:path*']
}
