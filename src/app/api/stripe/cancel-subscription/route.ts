import { NextRequest, NextResponse } from 'next/server'
import { cancelSubscription } from '@/functions/stripe'

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json()
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    const result = await cancelSubscription(subscriptionId)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Subscription cancellation failed:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      if (error.message === 'Subscription not found') {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}