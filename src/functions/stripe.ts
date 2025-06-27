"use server"

import Stripe from 'stripe'
import { getPayload } from './connector'
import { getUser } from './users'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function createStripeCustomer(user: any) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstname} ${user.lastname}`,
    metadata: {
      userId: user.id.toString(),
    },
  })

  // Update user with Stripe customer ID
  const payload = await getPayload()
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      stripeCustomerId: customer.id,
    },
  })

  return customer.id
}

async function createOrGetStripeProduct(item: any, type: 'subscription' | 'one_time') {
  // Check if Stripe product already exists
  if (item.stripeProductId && item.stripePriceId) {
    return {
      productId: item.stripeProductId,
      priceId: item.stripePriceId
    }
  }

  // Create Stripe product
  const product = await stripe.products.create({
    name: item.name,
    description: item.description || undefined,
    metadata: {
      payloadId: item.id.toString(),
      type: type,
    },
  })

  // Create Stripe price
  const priceConfig: Stripe.PriceCreateParams = {
    product: product.id,
    unit_amount: item.price,
    currency: item.currency || 'usd',
    metadata: {
      payloadId: item.id.toString(),
      type: type,
    },
  }

  if (type === 'subscription') {
    priceConfig.recurring = {
      interval: item.interval || 'month',
    }
  }

  const price = await stripe.prices.create(priceConfig)

  // Update the item in Payload with Stripe IDs
  const payload = await getPayload()
  const collection = type === 'subscription' ? 'plans' : 'products'
  
  await payload.update({
    collection,
    id: item.id,
    data: {
      stripeProductId: product.id,
      stripePriceId: price.id,
    },
  })

  return {
    productId: product.id,
    priceId: price.id
  }
}

export async function createCheckoutSession({
  productId,
  priceType,
  successUrl,
  cancelUrl
}: {
  productId: string
  priceType: 'subscription' | 'one_time'
  successUrl?: string
  cancelUrl?: string
}) {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  const payload = await getPayload()
  let stripeCustomerId = user.stripeCustomerId

  // Create Stripe customer if doesn't exist
  if (!stripeCustomerId) {
    stripeCustomerId = await createStripeCustomer(user)
  }

  let sessionConfig: Stripe.Checkout.SessionCreateParams
  let stripeIds: { productId: string; priceId: string }

  if (priceType === 'subscription') {
    // Get plan details
    const plans = await payload.find({
      collection: 'plans',
      where: {
        id: {
          equals: productId,
        },
      },
    })

    if (plans.docs.length === 0) {
      throw new Error('Plan not found')
    }

    const plan = plans.docs[0]
    stripeIds = await createOrGetStripeProduct(plan, 'subscription')

    sessionConfig = {
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripeIds.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?canceled=true`,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      metadata: {
        userId: user.id!.toString(),
        planId: plan.id.toString(),
        type: 'subscription',
      },
    }
  } else {
    // Get product details for one-time purchase
    const products = await payload.find({
      collection: 'products',
      where: {
        id: {
          equals: productId,
        },
      },
    })

    if (products.docs.length === 0) {
      throw new Error('Product not found')
    }

    const product = products.docs[0]
    stripeIds = await createOrGetStripeProduct(product, 'one_time')

    sessionConfig = {
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripeIds.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?canceled=true`,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      metadata: {
        userId: user.id!.toString(),
        productId: product.id.toString(),
        type: 'one_time',
      },
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  return {
    sessionId: session.id,
    url: session.url
  }
}

export async function createPortalSession(returnUrl?: string) {
  const user = await getUser()
  
  if (!user || !user.stripeCustomerId) {
    throw new Error('No Stripe customer found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash`,
  })

  return session.url
}