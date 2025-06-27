import { NextRequest, NextResponse } from 'next/server'
import { reactivateSubscription } from '../../../../functions/stripe'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    const result = await reactivateSubscription(subscriptionId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Subscription reactivation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}