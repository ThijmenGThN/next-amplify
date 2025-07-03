"use server"

import { getPayload } from './connector'
import { getUser } from './users'
import crypto from 'crypto'

// Types and interfaces
export interface CryptomusPaymentData {
  amount: string
  currency: string
  order_id: string
  url_return?: string
  url_success?: string
  url_callback?: string
  is_payment_multiple?: boolean
  lifetime?: number
  to_currency?: string
}

export interface CryptomusPaymentResponse {
  uuid: string
  order_id: string
  amount: string
  payment_status: string
  url: string
  address: string
  from: string
  wallet_address_uuid: string
  network: string
  currency: string
  payer_currency: string
  additional_data: string | null
  comment: string | null
  merchant_amount: string
  is_final: boolean
  status: string
  created_at: string
  updated_at: string
}

export interface CryptomusWebhookData {
  uuid: string
  order_id: string
  amount: string
  payment_status: 'paid' | 'fail' | 'wrong_amount' | 'process' | 'confirm_check'
  payer_amount: string
  discount_percent: string
  network: string
  currency: string
  payer_currency: string
  additional_data: string | null
  created_at: string
  updated_at: string
  sign: string
}

// Cryptomus client class
class CryptomusClient {
  private apiKey: string
  private merchantId: string
  private baseUrl = 'https://api.cryptomus.com/v1'

  constructor(apiKey: string, merchantId: string) {
    this.apiKey = apiKey
    this.merchantId = merchantId
  }

  private generateSign(data: Record<string, any>): string {
    const cleanData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined && value !== null)
    )
    
    const sortedKeys = Object.keys(cleanData).sort()
    const sortedData: Record<string, any> = {}
    
    for (const key of sortedKeys) {
      sortedData[key] = cleanData[key]
    }
    
    const jsonString = JSON.stringify(sortedData)
    const base64Data = Buffer.from(jsonString, 'utf8').toString('base64')
    const signatureString = base64Data + this.apiKey
    
    const hash = crypto
      .createHash('md5')
      .update(signatureString, 'utf8')
      .digest('hex')
    
    return hash
  }

  private generateJsonBody(data: Record<string, any>): string {
    const cleanData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined && value !== null)
    )
    
    return JSON.stringify(cleanData)
  }

  private generateSignFromJson(jsonString: string): string {
    const base64Data = Buffer.from(jsonString, 'utf8').toString('base64')
    const signatureString = base64Data + this.apiKey
    
    const hash = crypto
      .createHash('md5')
      .update(signatureString, 'utf8')
      .digest('hex')
    
    return hash
  }

  async createPayment(paymentData: CryptomusPaymentData): Promise<CryptomusPaymentResponse> {
    const data = {
      ...paymentData,
      merchant_id: this.merchantId,
    }

    const jsonBody = this.generateJsonBody(data)
    const sign = this.generateSignFromJson(jsonBody)

    const response = await fetch(`${this.baseUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': this.merchantId,
        'sign': sign,
      },
      body: jsonBody,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Cryptomus API error: ${response.status} - ${errorData.message || 'Invalid Sign'}`)
    }

    const result = await response.json()
    
    if (result.state !== 0) {
      throw new Error(`Cryptomus payment creation failed: ${result.message || 'Unknown error'}`)
    }

    return result.result
  }

  async getPaymentStatus(uuid: string): Promise<CryptomusPaymentResponse> {
    const data = {
      uuid,
      merchant_id: this.merchantId,
    }

    const sign = this.generateSign(data)

    const response = await fetch(`${this.baseUrl}/payment/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': this.merchantId,
        'sign': sign,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Cryptomus API error: ${response.status} - ${errorData.message || 'Unknown error'}`)
    }

    const result = await response.json()
    
    if (result.state !== 0) {
      throw new Error(`Cryptomus payment status check failed: ${result.message || 'Unknown error'}`)
    }

    return result.result
  }

  verifyWebhook(webhookData: CryptomusWebhookData, expectedSign: string): boolean {
    const { sign: _sign, ...dataWithoutSign } = webhookData
    
    if (!dataWithoutSign.merchant_id) {
      dataWithoutSign.merchant_id = this.merchantId
    }
    
    const calculatedSign = this.generateSign(dataWithoutSign)
    return calculatedSign === expectedSign
  }

  static formatPrice(amount: number): string {
    return (amount / 100).toFixed(2)
  }

  static parsePrice(amount: string): number {
    return Math.round(parseFloat(amount) * 100)
  }
}

// Validate environment variables
if (!process.env.CRYPTOMUS_API_KEY) {
  throw new Error('CRYPTOMUS_API_KEY environment variable is required')
}
if (!process.env.CRYPTOMUS_MERCHANT_ID) {
  throw new Error('CRYPTOMUS_MERCHANT_ID environment variable is required')
}

export const cryptomus = new CryptomusClient(
  process.env.CRYPTOMUS_API_KEY!,
  process.env.CRYPTOMUS_MERCHANT_ID!
)

export const createCryptomusPayment = async (paymentData: {
  amount: number
  currency: string
  orderId: string
  returnUrl?: string
  successUrl?: string
  callbackUrl?: string
}) => {
  const cryptomusData: CryptomusPaymentData = {
    amount: CryptomusClient.formatPrice(paymentData.amount),
    currency: paymentData.currency.toUpperCase(),
    order_id: paymentData.orderId,
    url_return: paymentData.returnUrl,
    url_success: paymentData.successUrl,
    url_callback: paymentData.callbackUrl,
    is_payment_multiple: false,
    lifetime: 3600,
  }

  const apiData: any = {
    amount: cryptomusData.amount,
    currency: 'USD',
    order_id: cryptomusData.order_id,
    is_payment_multiple: false,
    lifetime: 3600,
  }

  if (cryptomusData.url_return) apiData.url_return = cryptomusData.url_return
  if (cryptomusData.url_success) apiData.url_success = cryptomusData.url_success
  if (cryptomusData.url_callback) apiData.url_callback = cryptomusData.url_callback

  return await cryptomus.createPayment(apiData)
}

export const getCryptomusPaymentStatus = async (uuid: string) => {
  return await cryptomus.getPaymentStatus(uuid)
}

export const verifyCryptomusWebhook = (webhookData: CryptomusWebhookData, expectedSign: string): boolean => {
  return cryptomus.verifyWebhook(webhookData, expectedSign)
}

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