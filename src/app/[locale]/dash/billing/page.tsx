import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, CreditCard, ShoppingCart } from 'lucide-react'
import { ProductCard } from '@/components/billing/ProductCard'
import { UserActivePlans } from '@/components/billing/UserActivePlans'
import { getBillingData } from '@/functions/billing'
import DashboardLayout from '../DashboardLayout'

async function BillingContent() {
  const billingData = await getBillingData()

  if (!billingData) {
    redirect('/login')
  }

  const { products, subscriptionProducts, currentSubscription, userPurchases } = billingData

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
          <p className="text-muted-foreground">Manage your subscriptions and purchase additional products</p>
        </div>

        {/* User's Active Plans */}
        <UserActivePlans 
          currentSubscription={currentSubscription || undefined} 
          userPurchases={userPurchases} 
        />


        {(currentSubscription || userPurchases.length > 0) && (subscriptionProducts.length > 0 || products.length > 0) && <Separator />}

        {/* Subscription Plans */}
        {subscriptionProducts.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Subscription Plans</h2>
              <p className="text-muted-foreground">Choose a plan that fits your needs</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {subscriptionProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priceType="subscription"
                  isCurrentSubscription={typeof currentSubscription?.product === 'object' && currentSubscription?.product?.id === product.id}
                  disabled={false}
                  showPortalButton={false}
                  currentSubscription={currentSubscription || undefined}
                />
              ))}
            </div>
          </section>
        )}

        {subscriptionProducts.length > 0 && products.length > 0 && <Separator />}

        {/* One-time Products */}
        {products.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">One-time Packages</h2>
              <p className="text-muted-foreground">Purchase additional features and services</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priceType="one_time"
                />
              ))}
            </div>
          </section>
        )}

        {products.length === 0 && subscriptionProducts.length === 0 && (
          <EmptyState
            icon={<ShoppingCart className="w-12 h-12" />}
            title="No Products Available"
            description="There are currently no products or subscription plans available for purchase. Check back later!"
          />
        )}

        {subscriptionProducts.length === 0 && products.length > 0 && (
          <div className="mb-8">
            <EmptyState
              icon={<CreditCard className="w-8 h-8" />}
              title="No Subscription Plans"
              description="No subscription plans are currently available, but you can still purchase one-time products below."
              className="border-dashed"
            />
          </div>
        )}

        {products.length === 0 && subscriptionProducts.length > 0 && (
          <div className="mt-8">
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title="No One-time Products"
              description="No one-time products are currently available, but you can subscribe to a plan above."
              className="border-dashed"
            />
          </div>
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