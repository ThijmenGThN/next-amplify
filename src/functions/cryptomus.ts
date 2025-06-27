"use server"

import { getPayload } from './connector'
import { getUser } from './users'
import { createCryptomusPayment, getCryptomusPaymentStatus } from '../lib/cryptomus'

export async function createCryptomusCheckoutSession({
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
  let couponValidation: any = null

  // Handle coupon if provided
  if (couponCode) {
    const { validateCoupon } = await import('./coupons')
    couponValidation = await validateCoupon(couponCode, productId)
    
    if (!couponValidation.valid || !couponValidation.coupon) {
      throw new Error(couponValidation.error || 'Invalid coupon')
    }

    // For 100% off coupons, handle as free product
    if (couponValidation.coupon.discountType === 'percentage' && couponValidation.coupon.discountValue === 100) {
      return await handleFreeCryptomusProduct(user, productId, priceType, couponValidation.coupon, successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`)
    }
  }

  let product: any

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

    product = products.docs[0]

    // For monthly subscriptions, we need to handle them as one-time payments
    // since Cryptomus doesn't support recurring subscriptions
    if (product.interval === 'month') {
      return await createCryptomusPrepaidSubscription(user, product, couponValidation, successUrl, cancelUrl)
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

    product = products.docs[0]
  }

  // Calculate final price after coupon
  let finalPrice = product.price
  if (couponValidation?.coupon) {
    if (couponValidation.coupon.discountType === 'percentage') {
      finalPrice = Math.round(product.price * (1 - couponValidation.coupon.discountValue / 100))
    } else {
      finalPrice = Math.max(0, product.price - couponValidation.coupon.discountValue)
    }
  }

  const orderId = `${priceType}_${product.id}_${user.id}_${Date.now()}`

  // Create payment with Cryptomus
  const payment = await createCryptomusPayment({
    amount: finalPrice,
    currency: product.currency || 'USD',
    orderId,
    returnUrl: cancelUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?canceled=true`,
    successUrl: successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`,
    callbackUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/api/cryptomus/webhook`,
  })

  // Store payment intent in database for tracking
  await payload.create({
    collection: 'cryptomus-payments',
    data: {
      user: user.id || 0,
      product: product.id,
      uuid: payment.uuid,
      orderId,
      amount: finalPrice,
      currency: product.currency || 'USD',
      type: priceType,
      status: 'pending',
      paymentUrl: payment.url,
      ...(couponCode && { couponCode }),
    },
  })

  return {
    paymentId: payment.uuid,
    url: payment.url,
    orderId
  }
}

async function createCryptomusPrepaidSubscription(
  user: any, 
  product: any, 
  couponValidation: any, 
  successUrl?: string, 
  cancelUrl?: string
) {
  // Calculate final price after coupon
  let finalPrice = product.price
  if (couponValidation?.coupon) {
    if (couponValidation.coupon.discountType === 'percentage') {
      finalPrice = Math.round(product.price * (1 - couponValidation.coupon.discountValue / 100))
    } else {
      finalPrice = Math.max(0, product.price - couponValidation.coupon.discountValue)
    }
  }

  const orderId = `prepaid_sub_${product.id}_${user.id}_${Date.now()}`

  // Create payment with Cryptomus
  const payment = await createCryptomusPayment({
    amount: finalPrice,
    currency: product.currency || 'USD',
    orderId,
    returnUrl: cancelUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?canceled=true`,
    successUrl: successUrl || `${process.env.NEXT_PUBLIC_DOMAIN}/dash?success=true`,
    callbackUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/api/cryptomus/webhook`,
  })

  const payload = await getPayload()

  // Store prepaid subscription payment
  await payload.create({
    collection: 'cryptomus-payments',
    data: {
      user: user.id || 0,
      product: product.id,
      uuid: payment.uuid,
      orderId,
      amount: finalPrice,
      currency: product.currency || 'USD',
      type: 'prepaid_subscription',
      status: 'pending',
      paymentUrl: payment.url,
      ...(couponValidation?.coupon && { couponCode: couponValidation.coupon.code }),
    },
  })

  return {
    paymentId: payment.uuid,
    url: payment.url,
    orderId,
    isPrepaid: true
  }
}

async function handleFreeCryptomusProduct(
  user: any, 
  productId: string, 
  priceType: 'subscription' | 'one_time', 
  coupon: any, 
  successUrl: string
) {
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
        user: user.id || 0,
        product: product.id,
        status: 'active',
        stripeSubscriptionId: `free_crypto_${Date.now()}`,
        stripeCustomerId: '',  // Empty for crypto payments
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
    })
  } else {
    // Create a free purchase record
    await payload.create({
      collection: 'purchases',
      data: {
        user: user.id || 0,
        product: product.id,
        amount: 0,
        currency: 'usd',
        status: 'completed',
        purchaseDate: new Date().toISOString(),
        stripePaymentIntentId: `free_crypto_${Date.now()}`,
      },
    })
  }

  // Increment coupon usage
  const { incrementCouponUsage } = await import('./coupons')
  await incrementCouponUsage(coupon.id)

  return {
    paymentId: null,
    url: successUrl,
    orderId: null
  }
}

export async function getCryptomusPaymentDetails(uuid: string) {
  const user = await getUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }

  try {
    const payment = await getCryptomusPaymentStatus(uuid)
    return payment
  } catch (error) {
    console.error('Error retrieving Cryptomus payment:', error)
    return null
  }
}