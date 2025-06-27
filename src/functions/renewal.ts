"use server"

import { getPayload } from './connector'
import { createCryptomusPayment } from '../lib/cryptomus'

export async function renewPrepaidSubscription(subscriptionId: string, userId: string) {
  const payload = await getPayload()

  // Get the subscription
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { user: { equals: typeof userId === 'string' ? parseInt(userId) : userId } },
        { id: { equals: typeof subscriptionId === 'string' ? parseInt(subscriptionId) : subscriptionId } }
      ]
    },
  })

  if (subscriptions.docs.length === 0) {
    throw new Error('Subscription not found or access denied')
  }

  const subscription = subscriptions.docs[0]

  // Get the product
  const product = await payload.findByID({
    collection: 'products',
    id: typeof subscription.product === 'object' ? subscription.product.id : subscription.product,
  })

  if (!product) {
    throw new Error('Product not found')
  }

  // Create a new payment for renewal
  const orderId = `renewal_${subscription.id}_${Date.now()}`

  const payment = await createCryptomusPayment({
    amount: product.price,
    currency: product.currency || 'USD',
    orderId,
    returnUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/dash?renewal=canceled`,
    successUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/dash?renewal=success`,
    callbackUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/api/cryptomus/webhook`,
  })

  // Store the renewal payment
  await payload.create({
    collection: 'cryptomus-payments',
    data: {
      user: typeof userId === 'string' ? parseInt(userId) : userId,
      product: product.id,
      uuid: payment.uuid,
      orderId,
      amount: product.price,
      currency: product.currency || 'USD',
      type: 'subscription_renewal',
      status: 'pending',
      paymentUrl: payment.url,
      relatedSubscription: typeof subscriptionId === 'string' ? parseInt(subscriptionId) : subscriptionId,
    },
  })

  return {
    paymentId: payment.uuid,
    url: payment.url,
    orderId
  }
}

export async function handleSubscriptionRenewal(paymentId: string, subscriptionId: string) {
  const payload = await getPayload()

  // Get the current subscription
  const subscription = await payload.findByID({
    collection: 'subscriptions',
    id: subscriptionId,
  })

  if (!subscription) {
    throw new Error('Subscription not found')
  }

  // Get the product to determine renewal period
  const product = await payload.findByID({
    collection: 'products',
    id: typeof subscription.product === 'object' ? subscription.product.id : subscription.product,
  })

  if (!product) {
    throw new Error('Product not found')
  }

  const periodInMs = product.interval === 'year' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
  const currentPeriodEnd = new Date(subscription.currentPeriodEnd || Date.now())
  const newPeriodStart = currentPeriodEnd
  const newPeriodEnd = new Date(currentPeriodEnd.getTime() + periodInMs)

  // Update the subscription with new period
  await payload.update({
    collection: 'subscriptions',
    id: subscriptionId,
    data: {
      currentPeriodStart: newPeriodStart.toISOString(),
      currentPeriodEnd: newPeriodEnd.toISOString(),
      status: 'active',
      cancelAtPeriodEnd: false,
    },
  })

  // Schedule next renewal reminder if it's a monthly subscription
  if (product.interval === 'month') {
    await scheduleRenewalReminder((typeof subscription.user === 'object' ? subscription.user.id : subscription.user).toString(), product.id.toString(), newPeriodEnd)
  }

  // Update any pending renewal reminders
  const renewalReminders = await payload.find({
    collection: 'renewal-reminders',
    where: {
      and: [
        { user: { equals: typeof subscription.user === 'object' ? subscription.user.id : subscription.user } },
        { product: { equals: product.id } },
        { status: { equals: 'pending' } }
      ]
    }
  })

  for (const reminder of renewalReminders.docs) {
    await payload.update({
      collection: 'renewal-reminders',
      id: reminder.id,
      data: {
        status: 'renewed',
      },
    })
  }

  return {
    success: true,
    newPeriodEnd: newPeriodEnd.toISOString()
  }
}

export async function scheduleRenewalReminder(userId: string | number, productId: string | number, renewalDate: Date) {
  const payload = await getPayload()
  
  try {
    await payload.create({
      collection: 'renewal-reminders',
      data: {
        user: typeof userId === 'string' ? parseInt(userId) : userId,
        product: typeof productId === 'string' ? parseInt(productId) : productId,
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

export async function getPendingRenewalReminders() {
  const payload = await getPayload()
  
  const now = new Date()
  
  const reminders = await payload.find({
    collection: 'renewal-reminders',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { reminderDate: { less_than_equal: now.toISOString() } }
      ]
    }
  })

  return reminders.docs
}

export async function markReminderAsSent(reminderId: string) {
  const payload = await getPayload()
  
  await payload.update({
    collection: 'renewal-reminders',
    id: reminderId,
    data: {
      status: 'sent',
      sentAt: new Date().toISOString(),
      reminderCount: 1,
      lastReminderSent: new Date().toISOString(),
    },
  })
}

export async function getExpiringSubscriptions() {
  const payload = await getPayload()
  
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  
  const subscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { status: { equals: 'active' } },
        { currentPeriodEnd: { less_than_equal: threeDaysFromNow.toISOString() } },
        { 
          stripeSubscriptionId: { 
            like: 'cryptomus_%' 
          } 
        }
      ]
    }
  })

  return subscriptions.docs
}