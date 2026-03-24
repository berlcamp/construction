import { createServerClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/getCompanyContext'
import { redirect } from 'next/navigation'
import { MembersClient } from './members-client'

export default async function MembersPage() {
  const supabase = await createServerClient()
  const context = await getCompanyContext(supabase)

  if (!context) {
    redirect('/login')
  }

  // Fetch current members
  const { data: membersRaw } = await supabase
    .from('company_members')
    .select('id, role, joined_at, user_id')
    .eq('company_id', context.companyId)
    .order('joined_at', { ascending: true })

  // Fetch profiles for members
  const userIds = (membersRaw || []).map((m) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

  const members = (membersRaw || []).map((m) => ({
    id: m.id,
    role: m.role,
    joined_at: m.joined_at,
    profiles: profileMap.get(m.user_id) || null,
  }))

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('company_invitations')
    .select('id, invited_email, role, status, created_at, expires_at')
    .eq('company_id', context.companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <MembersClient
      members={members}
      invitations={invitations || []}
      currentRole={context.role}
    />
  )
}
