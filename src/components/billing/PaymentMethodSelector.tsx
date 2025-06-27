'use client'

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Bitcoin } from 'lucide-react'

interface PaymentMethodSelectorProps {
  productId: string
  priceType: 'one_time' | 'subscription'
  couponCode?: string
  isMonthlySubscription?: boolean
  selectedMethod?: PaymentMethod
  className?: string
}

type PaymentMethod = 'stripe' | 'cryptomus'

export function PaymentMethodSelector({
  productId,
  priceType,
  couponCode,
  isMonthlySubscription,
  selectedMethod,
  className
}: PaymentMethodSelectorProps) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    if (!selectedMethod) return
    
    const method = selectedMethod
    setLoading(true)
    try {
      const endpoint = method === 'stripe' ? '/api/stripe/checkout' : '/api/cryptomus/checkout'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          priceType,
          couponCode,
          successUrl: `${window.location.origin}/dash/billing?success=true&method=${method}`,
          cancelUrl: `${window.location.origin}/dash/billing?canceled=true`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Show prepaid subscription notice for Cryptomus monthly subscriptions
      if (method === 'cryptomus' && isMonthlySubscription && data.isPrepaid) {
        toast.info('Note: Monthly crypto subscriptions are prepaid. You\'ll receive a renewal reminder before expiry.')
      }

      // Redirect to payment page
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start payment process')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedMethod) {
    return (
      <div className="text-center text-muted-foreground">
        Please select a payment method above
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LoadingButton
        onClick={handlePayment}
        loading={loading}
        loadingText={selectedMethod === 'stripe' ? 'Creating checkout...' : 'Creating crypto payment...'}
        className={className || "w-full"}
        size="lg"
      >
        {selectedMethod === 'stripe' && (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        {selectedMethod === 'cryptomus' && (
          <Bitcoin className="mr-2 h-4 w-4" />
        )}
        {priceType === 'subscription' ? 'Subscribe Now' : 'Purchase Now'}
      </LoadingButton>
      
      {selectedMethod === 'cryptomus' && priceType === 'subscription' && isMonthlySubscription && (
        <p className="text-xs text-muted-foreground text-center">
          Note: Monthly crypto subscriptions are prepaid. You'll receive a renewal reminder before expiry.
        </p>
      )}
    </div>
  )
}