import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { acceptInvitation } from '@/lib/auth/acceptInvitation'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')

  if (code) {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    // Handle invitation acceptance if invite_token is present (per D-08)
    if (inviteToken) {
      const result = await acceptInvitation(supabase, inviteToken, user.id)
      if (result.success) {
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/invite/error?reason=${encodeURIComponent(result.error || 'unknown')}`)
      }
    }

    // Check if user has a company membership (AUTH-03)
    const { data: membership } = await supabase
      .from('company_members')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membership) {
      // User has a company — go to dashboard (D-04)
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // No company membership — go to onboarding (AUTH-03)
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
