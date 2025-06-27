import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import config from '@payload-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, payload)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, payload)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, payload)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, payload)
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
    // Find the plan based on Stripe price ID
    const priceId = subscription.items.data[0].price.id
    const plans = await payload.find({
      collection: 'plans',
      where: {
        stripePriceId: {
          equals: priceId,
        },
      },
    })

    if (plans.docs.length === 0) {
      console.error('Plan not found for price:', priceId)
      return
    }

    // Create new subscription record
    subscriptionRecord = await payload.create({
      collection: 'subscriptions',
      data: {
        user: user.id,
        plan: plans.docs[0].id,
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

  // Update user's subscription status and current plan
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      subscriptionStatus: subscription.status,
      currentPlan: subscriptionRecord.plan,
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
      currentPlan: null,
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