"use server"

import { getPayload } from './connector'
import { getUser } from './users'
import { Product, Subscription, Purchase } from '@/types/payload-types'

export async function getActiveProducts(): Promise<Product[]> {
  const payload = await getPayload()
  
  const products = await payload.find({
    collection: 'products',
    where: {
      and: [
        { isActive: { equals: true } },
        { type: { equals: 'one_time' } }
      ]
    },
    sort: 'name',
  })
  
  return products.docs
}

export async function getActiveSubscriptionProducts(): Promise<Product[]> {
  const payload = await getPayload()
  
  const products = await payload.find({
    collection: 'products',
    where: {
      and: [
        { isActive: { equals: true } },
        { type: { equals: 'subscription' } }
      ]
    },
    sort: 'sortOrder',
  })
  
  return products.docs
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const payload = await getPayload()
  
  const userSubscriptions = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [
        { user: { equals: userId } },
        { status: { in: ['active', 'trialing'] } }
      ]
    },
    depth: 2,
    limit: 1,
  })
  
  return userSubscriptions.docs[0] || null
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const payload = await getPayload()
  
  const userPurchases = await payload.find({
    collection: 'purchases',
    where: {
      and: [
        { user: { equals: userId } },
        { status: { equals: 'completed' } }
      ]
    },
    depth: 2,
    sort: '-purchaseDate',
  })
  
  return userPurchases.docs
}


export async function getBillingData() {
  const user = await getUser()
  
  if (!user) {
    return null
  }

  const [products, subscriptionProducts, currentSubscription, userPurchases] = await Promise.all([
    getActiveProducts(),
    getActiveSubscriptionProducts(),
    getUserSubscription(user.id!.toString()),
    getUserPurchases(user.id!.toString())
  ])

  return {
    user,
    products,
    subscriptionProducts,
    currentSubscription,
    userPurchases
  }
}