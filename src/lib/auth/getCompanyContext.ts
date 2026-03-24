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
  supabase: SupabaseClient<Database>
): Promise<CompanyContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, role, companies:company_id(id, name, trial_ends_at, subscription_status)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership || !membership.companies) return null

  const company = membership.companies as any

  return {
    companyId: company.id,
    companyName: company.name,
    role: membership.role,
    trialEndsAt: company.trial_ends_at,
    subscriptionStatus: company.subscription_status,
  }
}
