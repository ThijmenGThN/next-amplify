import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Star } from 'lucide-react'
import { PurchaseButton } from '@/components/billing/PurchaseButton'
import { PortalButton } from '@/components/billing/PortalButton'
import { CurrentSubscription } from '@/components/billing/CurrentSubscription'
import { getBillingData } from '@/functions/billing'
import DashboardLayout from '../DashboardLayout'

async function BillingContent() {
  const billingData = await getBillingData()

  if (!billingData) {
    redirect('/login')
  }

  const { user, products, plans, currentSubscription } = billingData

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
          <p className="text-muted-foreground">Manage your subscriptions and purchase additional products</p>
        </div>

        {/* Current Subscription */}
        {currentSubscription && (
          <CurrentSubscription subscription={currentSubscription} />
        )}

        {/* Subscription Plans */}
        {plans.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Subscription Plans</h2>
              <p className="text-muted-foreground">Choose a plan that fits your needs</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.isPopular ? 'border-primary' : ''}`}>
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {currentSubscription?.plan?.id === plan.id && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="text-3xl font-bold">
                      ${(plan.price / 100).toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.interval}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature.feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>

                  <CardFooter>
                    {currentSubscription?.plan?.id === plan.id ? (
                      <PortalButton className="w-full" />
                    ) : (
                      <PurchaseButton
                        productId={plan.id}
                        priceType="subscription"
                        disabled={!!currentSubscription}
                        className="w-full"
                      >
                        {currentSubscription ? 'Already Subscribed' : 'Subscribe'}
                      </PurchaseButton>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}

        {plans.length > 0 && products.length > 0 && <Separator />}

        {/* One-time Products */}
        {products.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">One-time Packages</h2>
              <p className="text-muted-foreground">Purchase additional features and services</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                    <div className="text-2xl font-bold">
                      ${(product.price / 100).toFixed(2)}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {product.features && product.features.length > 0 && (
                      <ul className="space-y-2">
                        {product.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature.feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>

                  <CardFooter>
                    <PurchaseButton
                      productId={product.id}
                      priceType="one_time"
                      className="w-full"
                    >
                      Purchase
                    </PurchaseButton>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}

        {products.length === 0 && plans.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>No products or plans are currently available.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingContent />
    </Suspense>
  )
}