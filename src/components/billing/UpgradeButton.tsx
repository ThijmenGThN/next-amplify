'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { ArrowUp, ArrowDown } from 'lucide-react'
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

interface UpgradeButtonProps {
  currentSubscriptionId: string
  newProductId: string
  newProductName: string
  newProductPrice: number
  currentProductPrice: number
  className?: string
}

export function UpgradeButton({ 
  currentSubscriptionId, 
  newProductId, 
  newProductName, 
  newProductPrice, 
  currentProductPrice,
  className
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const isUpgrade = newProductPrice > currentProductPrice
  const priceDiff = Math.abs(newProductPrice - currentProductPrice)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSubscriptionId,
          newProductId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change subscription')
      }

      toast.success(`Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newProductName}`)
      router.refresh()
    } catch (error) {
      console.error('Subscription change error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change subscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={isUpgrade ? "default" : "outline"} className={className}>
          {isUpgrade ? (
            <>
              <ArrowUp className="mr-2 h-4 w-4" />
              Upgrade to {newProductName}
            </>
          ) : (
            <>
              <ArrowDown className="mr-2 h-4 w-4" />
              Downgrade to {newProductName}
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isUpgrade ? 'Upgrade' : 'Downgrade'} Subscription?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isUpgrade ? (
              <>
                You&apos;re about to upgrade to <strong>{newProductName}</strong> for ${(newProductPrice / 100).toFixed(2)}/month. 
                You&apos;ll be charged the prorated difference of ${(priceDiff / 100).toFixed(2)} immediately.
              </>
            ) : (
              <>
                You&apos;re about to downgrade to <strong>{newProductName}</strong> for ${(newProductPrice / 100).toFixed(2)}/month. 
                You&apos;ll receive a prorated credit of ${(priceDiff / 100).toFixed(2)} on your next bill.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              onClick={handleUpgrade}
              loading={loading}
              variant={isUpgrade ? "default" : "outline"}
            >
              {isUpgrade ? 'Upgrade Now' : 'Downgrade Now'}
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}