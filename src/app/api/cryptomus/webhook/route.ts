import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '../../../../functions/connector'
import { verifyCryptomusWebhook, type CryptomusWebhookData } from '../../../../lib/cryptomus'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CryptomusWebhookData
    
    // Verify webhook signature
    if (!verifyCryptomusWebhook(body, body.sign)) {
      console.error('Invalid Cryptomus webhook signature')
      console.error('Webhook data:', body)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = await getPayload()

    // Find the payment record
    const payments = await payload.find({
      collection: 'cryptomus-payments',
      where: {
        uuid: { equals: body.uuid }
      }
    })

    if (payments.docs.length === 0) {
      console.error('Payment not found:', body.uuid)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = payments.docs[0]

    // Update payment status
    await payload.update({
      collection: 'cryptomus-payments',
      id: payment.id,
      data: {
        status: body.payment_status,
        paidAt: body.payment_status === 'paid' ? new Date().toISOString() : undefined,
        cryptoCurrency: body.payer_currency,
        cryptoAmount: body.payer_amount,
        network: body.network,
      }
    })

    // Handle successful payment
    if (body.payment_status === 'paid') {
      await handleSuccessfulPayment(payment, body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cryptomus webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSuccessfulPayment(payment: any, _webhookData: CryptomusWebhookData) {
  const payload = await getPayload()

  if (payment.type === 'subscription_renewal') {
    // Handle subscription renewal
    const { handleSubscriptionRenewal } = await import('../../../../functions/renewal')
    await handleSubscriptionRenewal(payment.uuid, payment.relatedSubscription)
  } else if (payment.type === 'one_time') {
    // Create purchase record
    await payload.create({
      collection: 'purchases',
      data: {
        user: payment.user,
        product: payment.product,
        amount: payment.amount,
        currency: payment.currency,
        status: 'completed',
        purchaseDate: new Date().toISOString(),
        stripePaymentIntentId: `cryptomus_${payment.uuid}`,
      }
    })
  } else if (payment.type === 'subscription' || payment.type === 'prepaid_subscription') {
    // Get product details to determine subscription period
    const product = await payload.findByID({
      collection: 'products',
      id: payment.product
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const periodInMs = product.interval === 'year' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    const currentPeriodStart = new Date()
    const currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodInMs)

    // Create subscription record
    await payload.create({
      collection: 'subscriptions',
      data: {
        user: payment.user,
        product: payment.product,
        status: 'active',
        stripeSubscriptionId: `cryptomus_${payment.uuid}`,
        stripeCustomerId: '', // Empty for crypto payments
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: false,
      }
    })

    // For prepaid monthly subscriptions, schedule renewal notification
    if (payment.type === 'prepaid_subscription' && product.interval === 'month') {
      await scheduleRenewalNotification(payment.user, payment.product, currentPeriodEnd)
    }
  }

  // Handle coupon usage if applicable
  if (payment.couponCode) {
    try {
      const { incrementCouponUsage } = await import('../../../../functions/coupons')
      
      // Find coupon by code
      const coupons = await payload.find({
        collection: 'coupons',
        where: {
          code: { equals: payment.couponCode }
        }
      })

      if (coupons.docs.length > 0) {
        await incrementCouponUsage(coupons.docs[0].id)
      }
    } catch (error) {
      console.error('Error incrementing coupon usage:', error)
    }
  }
}

async function scheduleRenewalNotification(userId: any, productId: any, renewalDate: Date) {
  const payload = await getPayload()
  
  // Create a renewal reminder record
  // This would ideally integrate with a job queue system like Bull/Agenda
  try {
    await payload.create({
      collection: 'renewal-reminders',
      data: {
        user: userId,
        product: productId,
        reminderDate: new Date(renewalDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days before
        renewalDate: renewalDate.toISOString(),
        status: 'pending',
        type: 'cryptomus_prepaid_subscription',
      }
    })
  } catch (error) {
    console.error('Error creating renewal reminder:', error)
  }
}