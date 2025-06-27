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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {selectedMethod === 'stripe' ? 'Credit Card Payment' : 'Cryptocurrency Payment'}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSelectedMethod(null)}
        >
          Change Method
        </Button>
      </div>

      {selectedMethod === 'cryptomus' && isMonthlySubscription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Prepaid Subscription</h4>
              <p className="text-sm text-yellow-700">
                Monthly crypto subscriptions are prepaid. You&apos;ll receive a renewal reminder 7 days before expiry.
              </p>
            </div>
          </div>
        </div>
      )}

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