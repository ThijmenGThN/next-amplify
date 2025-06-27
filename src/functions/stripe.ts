"use server"

import Stripe from 'stripe'
import { getPayload } from './connector'
import { getUser } from './users'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
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

async function createOrGetStripeCoupon(coupon: any) {
  // Check if Stripe coupon already exists
  if (coupon.stripeCouponId) {
    try {
      await stripe.coupons.retrieve(coupon.stripeCouponId)
      return coupon.stripeCouponId
    } catch (error) {
      console.log('Stripe coupon not found, creating new one:', coupon.stripeCouponId)
      // Continue to create new one
    }
  }

  // Create Stripe coupon
  const stripeCouponData: any = {
    name: coupon.name,
    metadata: {
      payloadId: coupon.id.toString(),
    },
  }

  if (coupon.discountType === 'percentage') {
    stripeCouponData.percent_off = coupon.discountValue
  } else {
    stripeCouponData.amount_off = coupon.discountValue
    stripeCouponData.currency = 'usd' // You might want to make this configurable
  }

  if (coupon.maxUses) {
    stripeCouponData.max_redemptions = coupon.maxUses
  }

  if (coupon.expiresAt) {
    stripeCouponData.redeem_by = Math.floor(new Date(coupon.expiresAt).getTime() / 1000)
  }

  const stripeCoupon = await stripe.coupons.create(stripeCouponData)

  // Update the coupon in Payload with Stripe ID
  const payload = await getPayload()
  await payload.update({
    collection: 'coupons',
    id: coupon.id,
    data: {
      stripeCouponId: stripeCoupon.id,
    },
  })

  return stripeCoupon.id
}

async function createOrGetStripeProduct(item: any, type: 'subscription' | 'one_time') {
  // Check if Stripe product and price exist in Stripe
  if (item.stripeProductId && item.stripePriceId) {
    try {
      // Verify both product and price exist in Stripe
      await stripe.products.retrieve(item.stripeProductId)
      await stripe.prices.retrieve(item.stripePriceId)
      
      return {
        productId: item.stripeProductId,
        priceId: item.stripePriceId
      }
    } catch (error) {
      console.log('Stripe product/price not found, creating new ones:', item.stripeProductId, item.stripePriceId)
      // Continue to create new ones
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

  // Update the product in Payload with new Stripe IDs
  const payload = await getPayload()
  
  await payload.update({
    collection: 'products',
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
  couponCode,
  successUrl,
  cancelUrl
}: {
  productId: string
  priceType: 'subscription' | 'one_time'
  couponCode?: string
  successUrl?: string
  cancelUrl?: string
}) {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  const payload = await getPayload()
  let stripeCustomerId = user.stripeCustomerId

  // Verify Stripe customer exists, or create new one
  if (stripeCustomerId) {
    try {
      await stripe.customers.retrieve(stripeCustomerId)
    } catch (error) {
      console.log('Stripe customer not found, creating new one:', stripeCustomerId)
      stripeCustomerId = await createStripeCustomer(user)
    }
  } else {
    stripeCustomerId = await createStripeCustomer(user)
  }

  let sessionConfig: Stripe.Checkout.SessionCreateParams
  let stripeIds: { productId: string; priceId: string }
  let stripeCouponId: string | undefined
  let couponValidation: any = null

  // Handle coupon if provided
  if (couponCode) {
    const { validateCoupon } = await import('./coupons')
    couponValidation = await validateCoupon(couponCode, productId)
    
    if (!couponValidation.valid || !couponValidation.coupon) {
      throw new Error(couponValidation.error || 'Invalid coupon')
    }

    // For 100% off coupons, we need to handle this specially
    if (couponValidation.coupon.discountType === 'percentage' && couponValidation.coupon.discountValue === 100) {
      // Handle 100% discount by creating a free purchase/subscription directly
      return await handleFreeProduct(user, productId, priceType, couponValidation.coupon, successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`)
    }

    stripeCouponId = await createOrGetStripeCoupon(couponValidation.coupon)
  }

  if (priceType === 'subscription') {
    // Get subscription product details
    const products = await payload.find({
      collection: 'products',
      where: {
        and: [
          { id: { equals: productId } },
          { type: { equals: 'subscription' } }
        ]
      },
    })

    if (products.docs.length === 0) {
      throw new Error('Subscription product not found')
    }

    const product = products.docs[0]
    stripeIds = await createOrGetStripeProduct(product, 'subscription')

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
      allow_promotion_codes: !stripeCouponId, // Disable if we have a specific coupon
      metadata: {
        userId: user.id!.toString(),
        productId: product.id.toString(),
        type: 'subscription',
        ...(couponCode && { couponCode }),
      },
    }

    // Add coupon if provided
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }]
    }
  } else {
    // Get product details for one-time purchase
    const products = await payload.find({
      collection: 'products',
      where: {
        and: [
          { id: { equals: productId } },
          { type: { equals: 'one_time' } }
        ]
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
      allow_promotion_codes: !stripeCouponId, // Disable if we have a specific coupon
      metadata: {
        userId: user.id!.toString(),
        productId: product.id.toString(),
        type: 'one_time',
        ...(couponCode && { couponCode }),
      },
    }

    // Add coupon if provided
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }]
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig)

  return {
    sessionId: session.id,
    url: session.url
  }
}

async function handleFreeProduct(user: any, productId: string, priceType: 'subscription' | 'one_time', coupon: any, successUrl: string) {
  const payload = await getPayload()
  
  // Get product details
  const products = await payload.find({
    collection: 'products',
    where: {
      and: [
        { id: { equals: productId } },
        { type: { equals: priceType } }
      ]
    },
  })

  if (products.docs.length === 0) {
    throw new Error('Product not found')
  }

  const product = products.docs[0]

  if (priceType === 'subscription') {
    // Create a free subscription record
    await payload.create({
      collection: 'subscriptions',
      data: {
        user: user.id,
        product: product.id,
        status: 'active',
        stripeSubscriptionId: `free_${Date.now()}`, // Generate a fake ID for free subscriptions
        stripeCustomerId: user.stripeCustomerId || '',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancelAtPeriodEnd: false,
      },
    })
  } else {
    // Create a free purchase record
    await payload.create({
      collection: 'purchases',
      data: {
        user: user.id,
        product: product.id,
        amount: 0,
        currency: 'usd',
        status: 'completed',
        purchaseDate: new Date().toISOString(),
        stripePaymentIntentId: `free_${Date.now()}`, // Generate a fake ID for free purchases
      },
    })
  }

  // Increment coupon usage
  const { incrementCouponUsage } = await import('./coupons')
  await incrementCouponUsage(coupon.id)

  // Return success URL (simulate successful checkout)
  return {
    sessionId: null,
    url: successUrl
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

export async function cancelSubscription(subscriptionId: string) {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  const payload = await getPayload()
  
  // Get the subscription from our database
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { user: { equals: user.id } },
        { id: { equals: subscriptionId } }
      ]
    },
  })

  if (subscriptions.docs.length === 0) {
    throw new Error('Subscription not found')
  }

  const subscription = subscriptions.docs[0]

  // Handle free subscriptions (those created with 100% off coupons)
  if (subscription.stripeSubscriptionId?.startsWith('free_')) {
    // Just mark as cancelled in our database
    await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
      },
    })
    return { success: true }
  }

  // Cancel the subscription in Stripe
  if (subscription.stripeSubscriptionId) {
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  // Update our database
  await payload.update({
    collection: 'subscriptions',
    id: subscription.id,
    data: {
      cancelAtPeriodEnd: true,
    },
  })

  return { success: true }
}

export async function upgradeSubscription(currentSubscriptionId: string, newProductId: string) {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  const payload = await getPayload()
  
  // Get current subscription
  const currentSub = await payload.findByID({
    collection: 'subscriptions',
    id: currentSubscriptionId,
  })

  if (!currentSub || currentSub.user !== user.id) {
    throw new Error('Subscription not found')
  }

  // Get new product
  const newProduct = await payload.findByID({
    collection: 'products',
    id: parseInt(newProductId),
  })

  if (!newProduct || newProduct.type !== 'subscription') {
    throw new Error('Product not found')
  }

  // Handle free subscriptions
  if (currentSub.stripeSubscriptionId?.startsWith('free_')) {
    throw new Error('Please contact support to upgrade from a free plan')
  }

  // Create or get Stripe product/price for new plan
  const stripeIds = await createOrGetStripeProduct(newProduct, 'subscription')

  // Update the subscription in Stripe
  if (currentSub.stripeSubscriptionId) {
    const stripeSubscription = await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId)
    
    await stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: stripeIds.priceId,
      }],
      proration_behavior: 'always_invoice',
    })
  }

  // Update our database
  await payload.update({
    collection: 'subscriptions',
    id: currentSubscriptionId,
    data: {
      product: newProduct.id,
    },
  })

  return { success: true }
}