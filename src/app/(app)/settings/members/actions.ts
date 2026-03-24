'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/getCompanyContext'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const InviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'project_manager', 'accountant', 'procurement_officer', 'staff']),
})

export async function createInvitation(
  _prevState: { error?: string | Record<string, string[]>; success?: boolean; inviteUrl?: string } | null,
  formData: FormData
): Promise<{ error?: string | Record<string, string[]>; success?: boolean; inviteUrl?: string }> {
  const supabase = await createServerClient()
  const context = await getCompanyContext(supabase)

  if (!context) {
    return { error: 'Not authenticated or no company found' }
  }

  // Only owner and admin can invite (per AUTH-07)
  if (!['owner', 'admin'].includes(context.role)) {
    return { error: 'Only owners and admins can invite members' }
  }

  const parsed = InviteMemberSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Get current user id for invited_by field
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Insert invitation (partial unique index prevents duplicate pending invites per AUTH-09)
  const { data: invitation, error: insertError } = await supabase
    .from('company_invitations')
    .insert({
      company_id: context.companyId,
      invited_by: user.id,
      invited_email: parsed.data.email,
      role: parsed.data.role,
    })
    .select('token')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: 'A pending invitation already exists for this email' }
    }
    return { error: 'Failed to create invitation' }
  }

  // TODO: In a future plan, send invitation email via Resend
  // For now, the token is available for manual sharing
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/${invitation.token}`

  revalidatePath('/settings/members')

  return { success: true, inviteUrl }
}
