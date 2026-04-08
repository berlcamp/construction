'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CreateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  address: z.string().max(500).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    + '-' + Math.random().toString(36).slice(2, 8)
}

export async function createCompany(
  _prevState: { error?: Record<string, string[]> | string } | null,
  formData: FormData
): Promise<{ error?: Record<string, string[]> | string } | never> {
  const supabase = await createServerClient()

  // Verify user is authenticated (per Pitfall 3 — use getUser not getSession)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/?signin=1')
  }

  // Check user doesn't already have a company
  const { data: existingMembership } = await supabase
    .from('company_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existingMembership) {
    redirect('/dashboard')
  }

  // Validate input
  const parsed = CreateCompanySchema.safeParse({
    name: formData.get('name'),
    address: formData.get('address'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Create company with 14-day trial (per D-03)
  // trial_ends_at defaults to now() + 14 days in DB, but set explicitly for clarity
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const slug = generateSlug(parsed.data.name)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: parsed.data.name,
      slug,
      owner_id: user.id,
      address: parsed.data.address || null,
      contact_phone: parsed.data.phone || null,
      trial_ends_at: trialEndsAt.toISOString(),
      plan_status: 'trial',
    })
    .select('id')
    .single()

  if (companyError || !company) {
    console.error('[onboarding] company insert failed:', companyError)
    return { error: { name: [companyError?.message ?? 'Failed to create company. Please try again.'] } }
  }

  // Create owner membership (per AUTH-04)
  const { error: memberError } = await supabase
    .from('company_members')
    .insert({
      user_id: user.id,
      company_id: company.id,
      role: 'owner',
    })

  if (memberError) {
    console.error('[onboarding] membership insert failed:', memberError)
    // Cleanup: delete the company if membership fails
    await supabase.from('companies').delete().eq('id', company.id)
    return { error: { name: [memberError.message ?? 'Failed to create company membership. Please try again.'] } }
  }

  // Redirect to dashboard (per D-04 — no welcome page)
  redirect('/dashboard')
}
