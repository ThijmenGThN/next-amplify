"use server"

import { getPayload } from './connector'
import { getUser } from './users'
import { Product, Plan, Subscription } from '@/types/payload-types'

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

export async function getActivePlans(): Promise<Plan[]> {
  const payload = await getPayload()
  
  const plans = await payload.find({
    collection: 'plans',
    where: {
      isActive: { equals: true }
    },
    sort: 'sortOrder',
  })
  
  return plans.docs
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

export async function getBillingData() {
  const user = await getUser()
  
  if (!user) {
    return null
  }

  const [products, plans, currentSubscription] = await Promise.all([
    getActiveProducts(),
    getActivePlans(),
    getUserSubscription(user.id!)
  ])

  return {
    user,
    products,
    plans,
    currentSubscription
  }
}