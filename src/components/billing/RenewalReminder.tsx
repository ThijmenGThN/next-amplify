'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-button'
import { Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface RenewalReminderProps {
  userId: string
}

interface ExpiredSubscription {
  id: string
  product: {
    id: string
    name: string
    price: number
    currency: string
  }
  currentPeriodEnd: string
  status: string
}

export function RenewalReminder({ userId }: RenewalReminderProps) {
  const [expiredSubscriptions, setExpiredSubscriptions] = useState<ExpiredSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [renewingIds, setRenewingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchExpiredSubscriptions()
  }, [userId])

  const fetchExpiredSubscriptions = async () => {
    try {
      // This would need to be implemented as an API endpoint
      const response = await fetch('/api/subscriptions/expiring')
      if (response.ok) {
        const data = await response.json()
        setExpiredSubscriptions(data.subscriptions || [])
      }
    } catch (error) {
      console.error('Error fetching expired subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenewal = async (subscriptionId: string) => {
    setRenewingIds(prev => new Set(prev).add(subscriptionId))
    
    try {
      const response = await fetch('/api/cryptomus/renew', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create renewal payment')
      }

      // Redirect to payment page
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Renewal error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create renewal payment')
    } finally {
      setRenewingIds(prev => {
        const next = new Set(prev)
        next.delete(subscriptionId)
        return next
      })
    }
  }

  const getDaysUntilExpiry = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (daysLeft: number) => {
    if (daysLeft < 0) return 'destructive'
    if (daysLeft <= 3) return 'destructive'
    if (daysLeft <= 7) return 'secondary'
    return 'default'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>Checking for subscription renewals...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expiredSubscriptions.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          <span>Subscription Renewals</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiredSubscriptions.map((subscription) => {
          const daysLeft = getDaysUntilExpiry(subscription.currentPeriodEnd)
          const isRenewing = renewingIds.has(subscription.id)
          
          return (
            <div 
              key={subscription.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border"
            >
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold">{subscription.product.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    ${(subscription.product.price / 100).toFixed(2)} {subscription.product.currency?.toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge variant={getStatusColor(daysLeft)}>
                  {daysLeft < 0 
                    ? `Expired ${Math.abs(daysLeft)} days ago`
                    : daysLeft === 0
                    ? 'Expires today'
                    : `${daysLeft} days left`
                  }
                </Badge>
                
                <LoadingButton
                  onClick={() => handleRenewal(subscription.id)}
                  loading={isRenewing}
                  loadingText="Creating payment..."
                  size="sm"
                  variant={daysLeft < 0 ? "destructive" : "default"}
                >
                  Renew Now
                </LoadingButton>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}