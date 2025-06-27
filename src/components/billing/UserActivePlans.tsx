import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Package, CreditCard } from 'lucide-react'
import { CancelButton } from './CancelButton'

import type { Subscription, Purchase } from '@/types/payload-types'

interface UserActivePlansProps {
  currentSubscription?: Subscription | null
  userPurchases: Purchase[]
}

export function UserActivePlans({ currentSubscription, userPurchases }: UserActivePlansProps) {
  if (!currentSubscription && userPurchases.length === 0) {
    return null
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">My Active Plans</h2>
        <p className="text-muted-foreground">Your current subscription and purchased products</p>
      </div>

      <div className="space-y-4">
        {/* Current Subscription */}
        {currentSubscription && typeof currentSubscription.product === 'object' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {currentSubscription.product.name}
                    <Badge variant="secondary">Subscription</Badge>
                  </CardTitle>
                  <CardDescription>
                    ${(currentSubscription.product.price / 100).toFixed(2)}/{currentSubscription.product.interval}
                  </CardDescription>
                </div>
                <Badge 
                  className={
                    currentSubscription.status === 'active' ? 'bg-green-500' :
                    currentSubscription.status === 'trialing' ? 'bg-blue-500' :
                    currentSubscription.status === 'past_due' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }
                >
                  {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Current period: {formatDate(currentSubscription.currentPeriodStart)} - {formatDate(currentSubscription.currentPeriodEnd)}
                </div>
                
                {currentSubscription.cancelAtPeriodEnd && (
                  <div className="text-sm text-orange-600">
                    Will be canceled at the end of the current period
                  </div>
                )}
                
                {currentSubscription.product.features && currentSubscription.product.features.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Features included:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {currentSubscription.product.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {feature.feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Cancel Button */}
                {!currentSubscription.cancelAtPeriodEnd && (
                  <div className="pt-4 border-t">
                    <CancelButton 
                      subscriptionId={currentSubscription.id.toString()}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* One-time Purchases */}
        {userPurchases.length > 0 && (
          <>
            {currentSubscription && <Separator />}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                One-time Purchases
              </h3>
              <div className="space-y-3">
                {userPurchases.map((purchase) => (
                  <Card key={purchase.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {typeof purchase.product === 'object' ? purchase.product.name : `Product #${purchase.product}`}
                          </CardTitle>
                          <CardDescription>
                            {typeof purchase.product === 'object' ? purchase.product.description : ''}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            ${(purchase.amount / 100).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(purchase.purchaseDate)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {typeof purchase.product === 'object' && purchase.product.features && purchase.product.features.length > 0 && (
                      <CardContent className="pt-0">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Features included:</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {purchase.product.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-sm text-muted-foreground">
                                <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                                {feature.feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}