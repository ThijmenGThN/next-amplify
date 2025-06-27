import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/functions/stripe'

export async function POST(req: NextRequest) {
  try {
    const { productId, priceType, successUrl, cancelUrl } = await req.json()
    
    if (!productId || !priceType) {
      return NextResponse.json(
        { error: 'Product ID and price type are required' },
        { status: 400 }
      )
    }

    const session = await createCheckoutSession({
      productId,
      priceType,
      successUrl,
      cancelUrl
    })

    return NextResponse.json(session)

  } catch (error) {
    console.error('Checkout session creation failed:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      if (error.message === 'Plan not found' || error.message === 'Product not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('not configured with Stripe')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}