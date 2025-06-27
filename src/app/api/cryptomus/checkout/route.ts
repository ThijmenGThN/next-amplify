import { NextRequest, NextResponse } from 'next/server'
import { createCryptomusCheckoutSession } from '../../../../functions/cryptomus'

export async function POST(request: NextRequest) {
  try {
    const {
      productId,
      priceType,
      couponCode,
      successUrl,
      cancelUrl
    } = await request.json()

    if (!productId || !priceType) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, priceType' },
        { status: 400 }
      )
    }

    if (!['subscription', 'one_time'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid priceType. Must be "subscription" or "one_time"' },
        { status: 400 }
      )
    }

    const session = await createCryptomusCheckoutSession({
      productId,
      priceType,
      couponCode,
      successUrl,
      cancelUrl
    })

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Cryptomus checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}