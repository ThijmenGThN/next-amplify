import { NextRequest, NextResponse } from 'next/server'
import { upgradeSubscription } from '@/functions/stripe'

export async function POST(req: NextRequest) {
  try {
    const { currentSubscriptionId, newProductId } = await req.json()
    
    if (!currentSubscriptionId || !newProductId) {
      return NextResponse.json(
        { error: 'Current subscription ID and new product ID are required' },
        { status: 400 }
      )
    }

    const result = await upgradeSubscription(currentSubscriptionId, newProductId)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Subscription upgrade failed:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      if (error.message === 'Subscription not found' || error.message === 'Product not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('contact support')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}