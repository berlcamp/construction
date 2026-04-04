import { createServerClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/getCompanyContext'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  // Auth gate: verify user is authenticated (per Pitfall 3 — getUser not getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get company context
  const context = await getCompanyContext(supabase)

  // Fetch profile for avatar/name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          companyName={context?.companyName || ''}
          trialEndsAt={context?.trialEndsAt || null}
          subscriptionStatus={context?.subscriptionStatus || 'trial'}
          userFullName={profile?.full_name || null}
          userAvatarUrl={profile?.avatar_url || null}
          userEmail={profile?.email || user.email || ''}
        />
        <main className="flex-1 overflow-y-auto bg-white p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
