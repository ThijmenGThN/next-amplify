import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const createStripeProduct = async (productData: {
  name: string
  description?: string
  type: 'one_time' | 'subscription'
  price: number
  currency: string
  interval?: 'month' | 'year'
}) => {
  // Create product in Stripe
  const product = await stripe.products.create({
    name: productData.name,
    description: productData.description,
    type: productData.type === 'subscription' ? 'service' : 'good',
  })

  // Create price in Stripe
  const priceConfig: Stripe.PriceCreateParams = {
    product: product.id,
    unit_amount: productData.price,
    currency: productData.currency,
  }

  if (productData.type === 'subscription' && productData.interval) {
    priceConfig.recurring = {
      interval: productData.interval,
    }
  }

  const price = await stripe.prices.create(priceConfig)

  return {
    productId: product.id,
    priceId: price.id,
  }
}

export const updateStripeProduct = async (
  productId: string,
  priceId: string,
  productData: {
    name: string
    description?: string
    price: number
  }
) => {
  // Update product in Stripe
  await stripe.products.update(productId, {
    name: productData.name,
    description: productData.description,
  })

  // Create new price (Stripe doesn't allow updating existing prices)
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: productData.price,
    currency: 'usd', // You might want to make this configurable
  })

  // Deactivate old price
  await stripe.prices.update(priceId, {
    active: false,
  })

  return {
    priceId: price.id,
  }
}

export const getStripeCustomer = async (customerId: string) => {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error)
    return null
  }
}

export const getStripeSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving Stripe subscription:', error)
    return null
  }
}