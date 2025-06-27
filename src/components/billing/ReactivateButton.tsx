'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ReactivateButtonProps {
  canceledSubscription: any
  className?: string
}

export function ReactivateButton({ 
  canceledSubscription,
  className 
}: ReactivateButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReactivate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: canceledSubscription.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription')
      }

      if (data.requiresNewPayment) {
        toast.info('Please create a new subscription to reactivate your plan.')
        // Scroll to subscription plans
        const subscriptionSection = document.querySelector('[data-section="subscriptions"]')
        if (subscriptionSection) {
          subscriptionSection.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        toast.success('Subscription reactivated successfully!')
      }
      
      router.refresh()
    } catch (error) {
      console.error('Reactivation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate subscription')
    } finally {
      setLoading(false)
    }
  }

  const productName = typeof canceledSubscription.product === 'object' 
    ? canceledSubscription.product.name 
    : 'Unknown Product'

  const productPrice = typeof canceledSubscription.product === 'object' 
    ? (canceledSubscription.product.price / 100).toFixed(2)
    : '0.00'

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="default" size="sm" className={className}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reactivate Plan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivate Subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;re about to reactivate your <strong>{productName}</strong> subscription 
            for ${productPrice}/{canceledSubscription.product?.interval || 'month'}. 
            {canceledSubscription.status === 'canceled' 
              ? ' You will be charged immediately and your access will be restored.'
              : ' This will prevent the cancellation at the end of your current billing period.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              onClick={handleReactivate}
              loading={loading}
              variant="default"
            >
              Reactivate Now
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}