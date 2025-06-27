'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Star } from 'lucide-react'
import { PurchaseButton } from '@/components/billing/PurchaseButton'
import { PortalButton } from '@/components/billing/PortalButton'
import { CouponInput } from '@/components/billing/CouponInput'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import type { Product, Subscription } from '@/types/payload-types'

interface ProductCardProps {
  product: Product
  priceType: 'one_time' | 'subscription'
  isCurrentSubscription?: boolean
  disabled?: boolean
  showPortalButton?: boolean
  currentSubscription?: Subscription | null
}

export function ProductCard({ 
  product, 
  priceType, 
  isCurrentSubscription = false,
  disabled = false,
  showPortalButton = false,
  currentSubscription
}: ProductCardProps) {
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: { type: 'percentage' | 'fixed'; value: number; displayText: string } } | null>(null)

  const handleCouponApplied = (coupon: { code: string; discount: { type: 'percentage' | 'fixed'; value: number; displayText: string } } | null) => {
    setAppliedCoupon(coupon)
  }

  return (
    <Card className={`relative ${product.isPopular ? 'border-primary' : ''}`}>
      {product.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {product.name}
          {isCurrentSubscription && (
            <Badge variant="secondary">Current</Badge>
          )}
        </CardTitle>
        <CardDescription>{product.description}</CardDescription>
        <div className="text-3xl font-bold">
          ${(product.price / 100).toFixed(2)}
          {priceType === 'subscription' && (
            <span className="text-sm font-normal text-muted-foreground">
              /{product.interval}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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

        {/* Coupon Input */}
        {!isCurrentSubscription && !disabled && (
          <CouponInput
            onCouponApplied={handleCouponApplied}
            productId={product.id.toString()}
            className="mt-4"
          />
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {showPortalButton ? (
          <PortalButton className="w-full" />
        ) : isCurrentSubscription ? (
          <PurchaseButton
            productId={product.id.toString()}
            priceType={priceType}
            couponCode={appliedCoupon?.code}
            disabled={true}
            className="w-full"
          >
            Already Subscribed
          </PurchaseButton>
        ) : currentSubscription && priceType === 'subscription' && typeof currentSubscription.product === 'object' ? (
          <UpgradeButton
            currentSubscriptionId={currentSubscription.id.toString()}
            newProductId={product.id.toString()}
            newProductName={product.name}
            newProductPrice={product.price}
            currentProductPrice={currentSubscription.product.price}
            className="w-full"
          />
        ) : (
          <PurchaseButton
            productId={product.id.toString()}
            priceType={priceType}
            couponCode={appliedCoupon?.code}
            disabled={disabled}
            className="w-full"
          >
            {priceType === 'subscription' ? 'Subscribe' : 'Purchase'}
          </PurchaseButton>
        )}
      </CardFooter>
    </Card>
  )
}