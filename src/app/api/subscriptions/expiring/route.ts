import { NextResponse } from 'next/server'
import { getUser } from '../../../../functions/users'
import { getPayload } from '../../../../functions/connector'

export async function GET() {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await getPayload()
    
    // Get subscriptions that are expiring in the next 7 days or have already expired
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          { user: { equals: user.id } },
          { status: { equals: 'active' } },
          { currentPeriodEnd: { less_than_equal: sevenDaysFromNow.toISOString() } },
          {
            or: [
              { stripeSubscriptionId: { like: 'cryptomus_%' } },
              { stripeSubscriptionId: { like: 'free_crypto_%' } }
            ]
          }
        ]
      }
    })

    // Get products for each subscription
    const subscriptionsWithProducts = await Promise.all(
      subscriptions.docs.map(async (sub) => {
        try {
          const product = await payload.findByID({
            collection: 'products',
            id: typeof sub.product === 'object' ? sub.product.id : sub.product,
          })
          
          if (!product) return null
          
          return {
            id: sub.id.toString(),
            product: {
              id: product.id.toString(),
              name: product.name,
              price: product.price,
              currency: product.currency || 'USD'
            },
            currentPeriodEnd: sub.currentPeriodEnd,
            status: sub.status
          }
        } catch (error) {
          console.error('Error fetching product for subscription:', sub.id, error)
          return null
        }
      })
    )

    return NextResponse.json({
      subscriptions: subscriptionsWithProducts.filter(sub => sub !== null)
    })

  } catch (error: any) {
    console.error('Error fetching expiring subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}