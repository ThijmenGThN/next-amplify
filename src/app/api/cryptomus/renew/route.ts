import { NextRequest, NextResponse } from 'next/server'
import { renewPrepaidSubscription } from '../../../../functions/renewal'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, userId } = await request.json()

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: subscriptionId, userId' },
        { status: 400 }
      )
    }

    const renewal = await renewPrepaidSubscription(subscriptionId, userId)

    return NextResponse.json(renewal)
  } catch (error: any) {
    console.error('Subscription renewal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create renewal payment' },
      { status: 500 }
    )
  }
}