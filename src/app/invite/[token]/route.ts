import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { origin } = new URL(request.url)

  const supabase = await createServerClient()

  // Validate the token exists and is not expired
  const { data: invitation } = await supabase
    .from('company_invitations')
    .select('id, status, expires_at')
    .eq('token', token)
    .single()

  if (!invitation) {
    return NextResponse.redirect(`${origin}/invite/error?reason=not_found`)
  }

  if (invitation.status !== 'pending') {
    return NextResponse.redirect(`${origin}/invite/error?reason=already_used`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.redirect(`${origin}/invite/error?reason=expired`)
  }

  // Token is valid — bounce to the landing page with the sign-in modal
  // pre-opened in "accept invitation" mode (per D-07). The modal forwards
  // invite_token through OAuth redirectTo, and the callback route picks
  // it up to call acceptInvitation.
  return NextResponse.redirect(
    `${origin}/?invite_token=${token}`
  )
}
