'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PurchaseButtonProps {
  productId: string
  priceType: 'one_time' | 'subscription'
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function PurchaseButton({ 
  productId, 
  priceType, 
  children, 
  className, 
  disabled 
}: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    if (disabled) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          priceType,
          successUrl: `${window.location.origin}/dash/billing?success=true`,
          cancelUrl: `${window.location.origin}/dash/billing?canceled=true`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout process')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || loading}
      className={className}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}