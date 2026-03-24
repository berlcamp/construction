'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Suspense } from 'react'

const errorMessages: Record<string, { title: string; description: string }> = {
  not_found: {
    title: 'Invitation Not Found',
    description: 'This invitation link is invalid or has been removed.',
  },
  expired: {
    title: 'Invitation Expired',
    description: 'This invitation has expired. Please ask the company administrator to send a new one.',
  },
  already_used: {
    title: 'Invitation Already Used',
    description: 'This invitation has already been accepted.',
  },
  unknown: {
    title: 'Something Went Wrong',
    description: 'We could not process your invitation. Please try again or contact the company administrator.',
  },
}

function InviteErrorContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'unknown'
  const error = errorMessages[reason] || errorMessages.unknown

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-red-600">{error.title}</CardTitle>
          <CardDescription>{error.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InviteErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <InviteErrorContent />
    </Suspense>
  )
}
