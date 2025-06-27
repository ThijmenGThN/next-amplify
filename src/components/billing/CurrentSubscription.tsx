import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PortalButton } from './PortalButton'
import { Calendar, CreditCard } from 'lucide-react'

interface CurrentSubscriptionProps {
  subscription: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    plan: {
      id: string
      name: string
      price: number
      currency: string
      interval: string
    }
  }
}

export function CurrentSubscription({ subscription }: CurrentSubscriptionProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'trialing':
        return 'bg-blue-500'
      case 'past_due':
        return 'bg-yellow-500'
      case 'canceled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
            <CardDescription>
              {subscription.plan.name} - ${(subscription.plan.price / 100).toFixed(2)}/{subscription.plan.interval}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Current period: {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          
          {subscription.cancelAtPeriodEnd && (
            <div className="text-sm text-orange-600">
              Your subscription will be canceled at the end of the current period.
            </div>
          )}
          
          <div className="flex gap-2">
            <PortalButton />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}