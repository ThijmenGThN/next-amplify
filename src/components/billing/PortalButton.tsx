'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface PortalButtonProps {
  className?: string
  children?: React.ReactNode
}

export function PortalButton({ className, children }: PortalButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePortal = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dash/billing`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      // Open portal in new tab
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePortal}
      disabled={loading}
      className={className}
      variant="outline"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          {children || 'Manage Subscription'}
        </>
      )}
    </Button>
  )
}