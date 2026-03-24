import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteToken = searchParams.get('invite_token')

  if (code) {
    const supabase = await createServerClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // If there's an invite token, redirect to accept invitation flow
    if (inviteToken) {
      return NextResponse.redirect(`${origin}/invite/${inviteToken}`)
    }

    // Check if user has a company membership (AUTH-03)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
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
    }

    // No company membership — go to onboarding (AUTH-03)
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
