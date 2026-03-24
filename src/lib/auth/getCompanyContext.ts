import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type CompanyContext = {
  companyId: string
  companyName: string
  role: string
  trialEndsAt: string | null
  subscriptionStatus: string
}

export async function getCompanyContext(
  supabase: SupabaseClient<Database, 'construction'>
): Promise<CompanyContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch membership first, then company in a separate query
  // (avoids cross-table join type issues with manually-crafted DB types)
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) return null

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, trial_ends_at, plan_status')
    .eq('id', membership.company_id)
    .single()

  if (!company) return null

  return {
    companyId: company.id,
    companyName: company.name,
    role: membership.role,
    trialEndsAt: company.trial_ends_at,
    subscriptionStatus: company.plan_status,
  }
}
