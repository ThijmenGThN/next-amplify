'use client'

import { loadStripe } from '@stripe/stripe-js'
import { useEffect } from 'react'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function StripeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check for payment success/cancel in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')

    if (success === 'true') {
      toast.success('Payment successful! Your subscription is now active.')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (canceled === 'true') {
      toast.info('Payment was canceled. You can try again anytime.')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  return <>{children}</>
}

export { stripePromise }