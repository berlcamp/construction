'use client'

import { useActionState } from 'react'
import { createCompany } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(createCompany, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Your Company</CardTitle>
          <CardDescription>Set up your construction management workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., ABC Construction Corp."
                required
                minLength={2}
                maxLength={100}
              />
              {state?.error && typeof state.error === 'object' && 'name' in state.error && Array.isArray((state.error as Record<string, string[]>).name) && (
                <p className="text-sm text-red-600">{(state.error as Record<string, string[]>).name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Optional — company address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Optional — contact number"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
