import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  try {
    console.log(`Received Stripe webhook event: ${event.type}`)
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        console.log('Handling subscription change event')
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, payload)
        break
      
      case 'customer.subscription.deleted':
        console.log('Handling subscription deleted event')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, payload)
        break
      
      case 'invoice.payment_succeeded':
        console.log('Handling invoice payment succeeded event')
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, payload)
        break
      
      case 'invoice.payment_failed':
        console.log('Handling invoice payment failed event')
        await handlePaymentFailed(event.data.object as Stripe.Invoice, payload)
        break
      
      case 'checkout.session.completed':
        console.log('Handling checkout session completed event')
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, payload)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, payload: any) {
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID
  const users = await payload.find({
    collection: 'users',
    where: {
      stripeCustomerId: {
        equals: customerId,
      },
    },
  })

  if (users.docs.length === 0) {
    console.error('User not found for customer:', customerId)
    return
  }

  const user = users.docs[0]
  
  // Get or create subscription record
  let subscriptionRecord
  const existingSubscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      stripeSubscriptionId: {
        equals: subscription.id,
      },
    },
  })

  if (existingSubscriptions.docs.length > 0) {
    // Update existing subscription
    subscriptionRecord = await payload.update({
      collection: 'subscriptions',
      id: existingSubscriptions.docs[0].id,
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    })
  } else {
    // Find the product based on Stripe price ID
    const priceId = subscription.items.data[0].price.id
    const products = await payload.find({
      collection: 'products',
      where: {
        stripePriceId: {
          equals: priceId,
        },
      },
    })

    if (products.docs.length === 0) {
      console.error('Product not found for price:', priceId)
      return
    }

    // Create new subscription record
    subscriptionRecord = await payload.create({
      collection: 'subscriptions',
      data: {
        user: user.id,
        product: products.docs[0].id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    })
  }

  // Update user's subscription status and current product
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      subscriptionStatus: subscription.status,
      currentProduct: subscriptionRecord.product,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, payload: any) {
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID
  const users = await payload.find({
    collection: 'users',
    where: {
      stripeCustomerId: {
        equals: customerId,
      },
    },
  })

  if (users.docs.length === 0) {
    console.error('User not found for customer:', customerId)
    return
  }

  const user = users.docs[0]

  // Update subscription record
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      stripeSubscriptionId: {
        equals: subscription.id,
      },
    },
  })

  if (subscriptions.docs.length > 0) {
    await payload.update({
      collection: 'subscriptions',
      id: subscriptions.docs[0].id,
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    })
  }

  // Update user's subscription status
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      subscriptionStatus: 'canceled',
      currentProduct: null,
    },
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, payload: any) {
  console.log('Payment succeeded for invoice:', invoice.id)
  // Additional logic for successful payments can be added here
}

async function handlePaymentFailed(invoice: Stripe.Invoice, payload: any) {
  console.log('Payment failed for invoice:', invoice.id)
  
  const customerId = invoice.customer as string
  
  // Find user by Stripe customer ID
  const users = await payload.find({
    collection: 'users',
    where: {
      stripeCustomerId: {
        equals: customerId,
      },
    },
  })

  if (users.docs.length > 0) {
    // Update user's subscription status to past_due
    await payload.update({
      collection: 'users',
      id: users.docs[0].id,
      data: {
        subscriptionStatus: 'past_due',
      },
    })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, payload: any) {
  console.log('Checkout session details:', {
    id: session.id,
    customer: session.customer,
    metadata: session.metadata,
    mode: session.mode,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
    currency: session.currency
  })

  const customerId = session.customer as string
  
  if (!customerId) {
    console.error('No customer ID found for checkout session:', session.id)
    return
  }

  // Find user by Stripe customer ID
  const users = await payload.find({
    collection: 'users',
    where: {
      stripeCustomerId: {
        equals: customerId,
      },
    },
  })

  if (users.docs.length === 0) {
    console.error('User not found for customer:', customerId)
    return
  }

  const user = users.docs[0]
  console.log('Found user:', user.id, user.email)

  // Get the product ID and type from session metadata
  const productId = session.metadata?.productId
  const type = session.metadata?.type

  console.log('Session metadata:', { productId, type })

  if (!productId || !type) {
    console.error('Missing product metadata in checkout session:', session.metadata)
    return
  }

  // Handle one-time purchases
  if (type === 'one_time') {
    console.log('Processing one-time purchase for product:', productId)
    
    // Find the product
    const products = await payload.find({
      collection: 'products',
      where: {
        id: {
          equals: productId,
        },
      },
    })

    if (products.docs.length === 0) {
      console.error('Product not found for ID:', productId)
      return
    }

    const product = products.docs[0]
    console.log('Found product:', product.name)

    // Create purchase record
    try {
      const purchase = await payload.create({
        collection: 'purchases',
        data: {
          user: user.id,
          product: product.id,
          stripePaymentIntentId: session.payment_intent as string,
          stripeCustomerId: customerId,
          amount: session.amount_total || 0,
          currency: session.currency || 'usd',
          status: 'completed',
          purchaseDate: new Date(),
        },
      })

      console.log('One-time purchase successfully recorded:', {
        purchaseId: purchase.id,
        userId: user.id,
        productName: product.name,
        amount: session.amount_total
      })

      // Handle coupon usage tracking
      const couponCode = session.metadata?.couponCode
      if (couponCode) {
        try {
          // Find and increment coupon usage
          const coupons = await payload.find({
            collection: 'coupons',
            where: {
              code: { equals: couponCode.toUpperCase() }
            },
            limit: 1,
          })

          if (coupons.docs.length > 0) {
            const coupon = coupons.docs[0]
            await payload.update({
              collection: 'coupons',
              id: coupon.id,
              data: {
                currentUses: (coupon.currentUses || 0) + 1,
              },
            })
            console.log('Coupon usage incremented:', couponCode)
          }
        } catch (couponError) {
          console.error('Error tracking coupon usage:', couponError)
        }
      }

    } catch (error) {
      console.error('Error creating purchase record:', error)
    }
  } else {
    console.log('Skipping subscription handling in checkout session (handled by subscription events)')
  }
}