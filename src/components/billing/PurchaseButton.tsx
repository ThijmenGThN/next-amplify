'use client'

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { toast } from 'sonner'

interface PurchaseButtonProps {
  productId: string
  priceType: 'one_time' | 'subscription'
  children: React.ReactNode
  className?: string
  disabled?: boolean
  couponCode?: string
}

export function PurchaseButton({ 
  productId, 
  priceType, 
  children, 
  className, 
  disabled,
  couponCode
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
          couponCode,
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
    <LoadingButton
      onClick={handlePurchase}
      disabled={disabled}
      loading={loading}
      loadingText={priceType === 'subscription' ? 'Creating subscription...' : 'Processing purchase...'}
      className={className}
    >
      {children}
    </LoadingButton>
  )
}