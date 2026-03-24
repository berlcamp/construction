'use client'

import { useActionState, useState } from 'react'
import { createInvitation } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Member = {
  id: string
  role: string
  joined_at: string
  profiles: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null
}

type Invitation = {
  id: string
  invited_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

export function MembersClient({
  members,
  invitations,
  currentRole,
}: {
  members: Member[]
  invitations: Invitation[]
  currentRole: string
}) {
  const canInvite = ['owner', 'admin'].includes(currentRole)
  const [state, formAction, isPending] = useActionState(createInvitation, null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Members</h1>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{member.profiles?.full_name || member.profiles?.email || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                </div>
                <Badge variant="secondary">{member.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{inv.invited_email}</p>
                    <p className="text-sm text-muted-foreground">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline">{inv.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" placeholder="colleague@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="staff"
                >
                  <option value="admin">Admin</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="procurement_officer">Procurement Officer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>
                {isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
              {state?.error && typeof state.error === 'string' && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              {state?.success && state?.inviteUrl && (
                <div className="rounded-md border bg-green-50 p-3">
                  <p className="text-sm text-green-800">Invitation created! Share this link:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs">{state.inviteUrl}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(state.inviteUrl!)}
                    >
                      {copiedUrl === state.inviteUrl ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
