import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function acceptInvitation(
  supabase: SupabaseClient<Database, 'construction'>,
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Find the invitation
  const { data: invitation } = await supabase
    .from('company_invitations')
    .select('id, company_id, role, status, expires_at, invited_email')
    .eq('token', token)
    .single()

  if (!invitation) {
    return { success: false, error: 'Invitation not found' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: 'Invitation already used' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from('company_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
    return { success: false, error: 'Invitation has expired' }
  }

  // Check user is not already a member of this company
  const { data: existingMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', invitation.company_id)
    .maybeSingle()

  if (existingMember) {
    // Already a member — mark invitation as accepted and proceed
    await supabase
      .from('company_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)
    return { success: true }
  }

  // Create company_members record with assigned role (per AUTH-08)
  const { error: memberError } = await supabase
    .from('company_members')
    .insert({
      user_id: userId,
      company_id: invitation.company_id,
      role: invitation.role,
    })

  if (memberError) {
    return { success: false, error: 'Failed to join company' }
  }

  // Mark invitation as accepted
  await supabase
    .from('company_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  return { success: true }
}
