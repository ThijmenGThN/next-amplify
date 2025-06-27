import { NextRequest, NextResponse } from 'next/server'
import { createPortalSession } from '@/functions/stripe'

export async function POST(req: NextRequest) {
  try {
    const { returnUrl } = await req.json()
    
    const url = await createPortalSession(returnUrl)

    return NextResponse.json({ url })

  } catch (error) {
    console.error('Portal session creation failed:', error)
    
    if (error instanceof Error) {
      if (error.message === 'No Stripe customer found') {
        return NextResponse.json(
          { error: 'No Stripe customer found' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}