'use client'

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  selectedMethod: initialMethod,
  className
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(initialMethod || null)
  const [loading, setLoading] = useState(false)

  const handlePayment = async (method: PaymentMethod) => {
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Payment Method</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => setSelectedMethod('stripe')}
          >
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div>
                <h4 className="font-semibold">Credit Card</h4>
                <p className="text-sm text-muted-foreground">
                  Pay with credit/debit card via Stripe
                </p>
                {priceType === 'subscription' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatic recurring billing
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
            onClick={() => setSelectedMethod('cryptomus')}
          >
            <div className="flex items-center space-x-3">
              <Bitcoin className="h-6 w-6 text-orange-500" />
              <div>
                <h4 className="font-semibold">Cryptocurrency</h4>
                <p className="text-sm text-muted-foreground">
                  Pay with Bitcoin, Ethereum, and more
                </p>
                {priceType === 'subscription' && isMonthlySubscription && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prepaid - renew before expiry
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LoadingButton
        onClick={() => handlePayment(selectedMethod)}
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
    </div>
  )
}