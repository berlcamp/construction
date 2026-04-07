import { type NextRequest, NextResponse } from 'next/server'
import { refreshSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = ['/auth/callback', '/invite']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes (and the marketing landing page at "/")
  if (pathname === '/' || pathname === '/pricing' || publicRoutes.some(route => pathname.startsWith(route))) {
    const { supabaseResponse } = await refreshSession(request)
    return supabaseResponse
  }

  // For all other routes, require authentication
  const { user, supabaseResponse } = await refreshSession(request)

  if (!user) {
    // Redirect unauthenticated users to the landing page with the
    // sign-in modal open (AUTH-06).
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = '?signin=1'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
