'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  Package, 
  Star, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  // RefreshCw,
  Settings,
  Bitcoin,
  Zap
} from 'lucide-react'
import { CouponInput } from './CouponInput'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { CancelButton } from './CancelButton'
import { UpgradeButton } from './UpgradeButton'
import { RenewalReminder } from './RenewalReminder'
import { ReactivateButton } from './ReactivateButton'

interface BillingPageContentProps {
  billingData: {
    products: any[]
    subscriptionProducts: any[]
    currentSubscription: any
    userPurchases: any[]
  }
}

export function BillingPageContent({ billingData }: BillingPageContentProps) {
  const { products, subscriptionProducts, currentSubscription, userPurchases } = billingData
  const [selectedCoupon, setSelectedCoupon] = useState<{ code: string; discount: any } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cryptomus'>('stripe')

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'trialing': return 'bg-blue-500'
      case 'past_due': return 'bg-yellow-500'
      case 'canceled': return 'bg-gray-500'
      default: return 'bg-red-500'
    }
  }

  const isCanceled = currentSubscription?.status === 'canceled' || currentSubscription?.cancelAtPeriodEnd

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-xl text-muted-foreground mt-2">
          Manage your plans and explore our services
        </p>
      </div>

      {/* Renewal Reminders */}
      <RenewalReminder userId={currentSubscription?.user || ''} />

      {/* Current Plan Status */}
      {currentSubscription && typeof currentSubscription.product === 'object' && (
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{currentSubscription.product.name}</CardTitle>
                  <CardDescription className="text-lg">
                    ${formatPrice(currentSubscription.product.price)}/{currentSubscription.product.interval}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(currentSubscription.status)}>
                  {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                </Badge>
                {currentSubscription.product.isPopular && (
                  <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                    <Star className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Current period: {formatDate(currentSubscription.currentPeriodStart)} - {formatDate(currentSubscription.currentPeriodEnd)}
                  </span>
                </div>
                
                {isCanceled && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      {currentSubscription.status === 'canceled' 
                        ? 'Your subscription has been canceled.'
                        : 'Your subscription will be canceled at the end of the current period.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {!isCanceled && (
                  <CancelButton 
                    subscriptionId={currentSubscription.id.toString()}
                  />
                )}
                {currentSubscription.status === 'canceled' && (
                  <ReactivateButton
                    canceledSubscription={currentSubscription}
                  />
                )}
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </div>
            </div>

            {currentSubscription.product.features && currentSubscription.product.features.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">What&apos;s included:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentSubscription.product.features.map((feature: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature.feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>
            Apply these settings to all purchases and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <h4 className="font-medium mb-3">Preferred Payment Method</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${paymentMethod === 'stripe' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'}`}
                onClick={() => setPaymentMethod('stripe')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Credit/Debit Card</div>
                      <div className="text-sm text-muted-foreground">Stripe • Instant processing</div>
                    </div>
                    {paymentMethod === 'stripe' && (
                      <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${paymentMethod === 'cryptomus' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'}`}
                onClick={() => setPaymentMethod('cryptomus')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Bitcoin className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="font-medium">Cryptocurrency</div>
                      <div className="text-sm text-muted-foreground">Bitcoin, Ethereum & more</div>
                    </div>
                    {paymentMethod === 'cryptomus' && (
                      <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Coupon Code */}
          <div>
            <h4 className="font-medium mb-3">Promotional Code</h4>
            <CouponInput
              onCouponApplied={setSelectedCoupon}
              productId="global"
              placeholder="Enter promo code to apply to all purchases"
            />
            {selectedCoupon && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Coupon Applied: {selectedCoupon.code}</span>
                  <span className="text-sm">({selectedCoupon.discount.displayText})</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans and Products */}
      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Subscription Plans
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            One-time Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-6" data-section="subscriptions">
          {subscriptionProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionProducts.map((product: any) => (
                <PlanCard
                  key={product.id}
                  product={product}
                  isCurrentPlan={typeof currentSubscription?.product === 'object' && currentSubscription?.product?.id === product.id}
                  currentSubscription={currentSubscription}
                  paymentMethod={paymentMethod}
                  couponCode={selectedCoupon?.code}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Subscription Plans Available</h3>
                <p className="text-muted-foreground">Check back later for new subscription options!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  paymentMethod={paymentMethod}
                  couponCode={selectedCoupon?.code}
                  userPurchases={userPurchases}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Products Available</h3>
                <p className="text-muted-foreground">Check back later for new products!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase History */}
      {userPurchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Your previous one-time purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPurchases.map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {typeof purchase.product === 'object' ? purchase.product.name : `Product #${purchase.product}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(purchase.purchaseDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${formatPrice(purchase.amount)}</div>
                    <Badge variant="outline" className="text-xs">
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Individual Plan Card Component
function PlanCard({ 
  product, 
  isCurrentPlan, 
  currentSubscription, 
  paymentMethod, 
  couponCode 
}: {
  product: any
  isCurrentPlan: boolean
  currentSubscription: any
  paymentMethod: 'stripe' | 'cryptomus'
  couponCode?: string
}) {
  const formatPrice = (price: number) => (price / 100).toFixed(2)

  return (
    <Card className={`relative ${product.isPopular ? 'border-primary' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}>
      {product.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
        <div className="text-3xl font-bold mt-4">
          ${formatPrice(product.price)}
          <span className="text-sm font-normal text-muted-foreground">/{product.interval}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {product.features && product.features.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Features:</h4>
            <ul className="space-y-2">
              {product.features.map((feature: any, index: number) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature.feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t">
          {isCurrentPlan ? (
            <div className="text-center">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Current Plan
              </Badge>
            </div>
          ) : currentSubscription && !currentSubscription.cancelAtPeriodEnd ? (
            <UpgradeButton
              currentSubscriptionId={currentSubscription.id.toString()}
              newProductId={product.id.toString()}
              newProductName={product.name}
              newProductPrice={product.price}
              currentProductPrice={currentSubscription.product?.price || 0}
              className="w-full"
            />
          ) : (
            <PaymentMethodSelector
              productId={product.id.toString()}
              priceType="subscription"
              couponCode={couponCode}
              isMonthlySubscription={product.interval === 'month'}
              selectedMethod={paymentMethod}
              className="w-full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Individual Product Card Component
function ProductCard({ 
  product, 
  paymentMethod, 
  couponCode, 
  userPurchases 
}: {
  product: any
  paymentMethod: 'stripe' | 'cryptomus'
  couponCode?: string
  userPurchases: any[]
}) {
  const formatPrice = (price: number) => (price / 100).toFixed(2)
  const hasPurchased = userPurchases.some(p => 
    typeof p.product === 'object' ? p.product.id === product.id : p.product === product.id
  )

  return (
    <Card className={hasPurchased ? 'border-green-500 bg-green-50/25' : ''}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
        <div className="text-3xl font-bold mt-4">
          ${formatPrice(product.price)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {product.features && product.features.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">What&apos;s included:</h4>
            <ul className="space-y-2">
              {product.features.map((feature: any, index: number) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {feature.feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-4 border-t">
          <PaymentMethodSelector
            productId={product.id.toString()}
            priceType="one_time"
            couponCode={couponCode}
            selectedMethod={paymentMethod}
            className="w-full"
          />
          {hasPurchased && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Previously Purchased
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}