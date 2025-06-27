'use server'

import { getPayload } from './connector'

export async function checkExpiredSubscriptions() {
  const payload = await getPayload()
  const now = new Date()

  try {
    // Find all active subscriptions that have passed their end date
    const expiredSubscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          {
            status: { equals: 'active' }
          },
          {
            currentPeriodEnd: { less_than: now.toISOString() }
          }
        ]
      }
    })

    const results = {
      checked: expiredSubscriptions.docs.length,
      expired: 0,
      errors: [] as string[]
    }

    for (const subscription of expiredSubscriptions.docs) {
      try {
        // Handle Stripe subscriptions
        if (subscription.stripeSubscriptionId && !subscription.stripeSubscriptionId.startsWith('cryptomus_')) {
          // For Stripe subscriptions, we should sync with Stripe API to get current status
          // but for now, we'll mark as expired locally
          await payload.update({
            collection: 'subscriptions',
            id: subscription.id,
            data: {
              status: 'past_due', // Stripe might auto-retry, so use past_due initially
              updatedAt: now.toISOString()
            }
          })
          results.expired++
        }
        // Handle Cryptomus (prepaid) subscriptions
        else if (subscription.stripeSubscriptionId?.startsWith('cryptomus_')) {
          await payload.update({
            collection: 'subscriptions',
            id: subscription.id,
            data: {
              status: 'canceled',
              cancelAtPeriodEnd: true,
              updatedAt: now.toISOString()
            }
          })
          results.expired++

          // Schedule renewal reminder if it's a monthly subscription
          if (typeof subscription.product === 'object' && subscription.product.interval === 'month') {
            await scheduleExpiryNotification(subscription.user, subscription.product.id)
          }
        }
      } catch (error) {
        console.error(`Error updating subscription ${subscription.id}:`, error)
        results.errors.push(`Subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Also check for renewal reminders that should be sent
    await checkPendingRenewalReminders()

    return results
  } catch (error) {
    console.error('Error checking expired subscriptions:', error)
    throw new Error(`Failed to check expired subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function checkPendingRenewalReminders() {
  const payload = await getPayload()
  const now = new Date()

  try {
    // Find renewal reminders that should be sent (reminder date has passed)
    const pendingReminders = await payload.find({
      collection: 'renewal-reminders',
      where: {
        and: [
          {
            status: { equals: 'pending' }
          },
          {
            reminderDate: { less_than: now.toISOString() }
          }
        ]
      }
    })

    const results = {
      checked: pendingReminders.docs.length,
      sent: 0,
      errors: [] as string[]
    }

    for (const reminder of pendingReminders.docs) {
      try {
        // Mark reminder as sent
        await payload.update({
          collection: 'renewal-reminders',
          id: reminder.id,
          data: {
            status: 'sent',
            sentAt: now.toISOString()
          }
        })

        // Here you would integrate with your notification system
        // For example: send email, push notification, etc.
        console.log(`Renewal reminder sent for user ${reminder.user}, product ${reminder.product}`)
        
        results.sent++
      } catch (error) {
        console.error(`Error processing renewal reminder ${reminder.id}:`, error)
        results.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return results
  } catch (error) {
    console.error('Error checking renewal reminders:', error)
    throw new Error(`Failed to check renewal reminders: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function scheduleExpiryNotification(userId: any, productId: any) {
  const payload = await getPayload()
  
  try {
    // Create an immediate renewal reminder for expired subscription
    await payload.create({
      collection: 'renewal-reminders',
      data: {
        user: userId,
        product: productId,
        reminderDate: new Date().toISOString(), // Send immediately
        renewalDate: new Date().toISOString(), // Already expired
        status: 'pending',
        type: 'cryptomus_subscription_expired',
      }
    })
  } catch (error) {
    console.error('Error creating expiry notification:', error)
  }
}

export async function getExpiringSubscriptions(daysAhead: number = 7) {
  const payload = await getPayload()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  try {
    const expiringSubscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [
          {
            status: { equals: 'active' }
          },
          {
            currentPeriodEnd: { 
              greater_than: new Date().toISOString(),
              less_than: futureDate.toISOString()
            }
          }
        ]
      }
    })

    return expiringSubscriptions.docs.map(sub => ({
      id: sub.id,
      userId: sub.user,
      productId: sub.product,
      productName: typeof sub.product === 'object' ? sub.product.name : `Product #${sub.product}`,
      expiryDate: sub.currentPeriodEnd,
      isStripe: sub.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith('cryptomus_'),
      isCrypto: sub.stripeSubscriptionId?.startsWith('cryptomus_')
    }))
  } catch (error) {
    console.error('Error getting expiring subscriptions:', error)
    throw new Error(`Failed to get expiring subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}