"use server"

import { getPayload } from 'payload'
import config from '@payload-config'

export async function createTestPurchase(userId: string, productId: string) {
  try {
    const payload = await getPayload({ config })

    // Find the user
    const user = await payload.findByID({
      collection: 'users',
      id: parseInt(userId),
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Find the product
    const product = await payload.findByID({
      collection: 'products',
      id: parseInt(productId),
    })

    if (!product) {
      return { success: false, error: 'Product not found' }
    }

    // Create purchase record
    const purchase = await payload.create({
      collection: 'purchases',
      data: {
        user: user.id,
        product: product.id,
        stripePaymentIntentId: 'test_payment_intent',
        stripeCustomerId: user.stripeCustomerId || 'test_customer',
        amount: product.price,
        currency: product.currency || 'usd',
        status: 'completed',
        purchaseDate: new Date().toISOString(),
      },
    })

    return { 
      success: true, 
      purchase: {
        id: purchase.id,
        user: user.email,
        product: product.name,
        amount: product.price
      }
    }
  } catch (error) {
    console.error('Test purchase creation error:', error)
    return { success: false, error: 'Failed to create test purchase' }
  }
}