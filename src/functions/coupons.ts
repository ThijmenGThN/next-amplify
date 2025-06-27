"use server"

import { getPayload } from './connector'
import { Coupon } from '@/types/payload-types'

interface CouponValidation {
  valid: boolean
  coupon?: Coupon
  error?: string
  discount?: {
    type: 'percentage' | 'fixed'
    value: number
    displayText: string
  }
}

export async function validateCoupon(code: string, productId?: string): Promise<CouponValidation> {
  try {
    const payload = await getPayload()
    
    // Find the coupon by code
    const coupons = await payload.find({
      collection: 'coupons',
      where: {
        and: [
          { code: { equals: code.toUpperCase() } },
          { isActive: { equals: true } }
        ]
      },
      depth: 1,
    })

    if (coupons.docs.length === 0) {
      return {
        valid: false,
        error: 'Coupon code not found or inactive'
      }
    }

    const coupon = coupons.docs[0]

    // Check expiration
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return {
        valid: false,
        error: 'Coupon has expired'
      }
    }

    // Check usage limits
    if (coupon.maxUses && (coupon.currentUses || 0) >= coupon.maxUses) {
      return {
        valid: false,
        error: 'Coupon usage limit reached'
      }
    }

    // Check product applicability
    if (productId) {
      const product = await payload.findByID({
        collection: 'products',
        id: parseInt(productId),
      })

      if (!product) {
        return {
          valid: false,
          error: 'Product not found'
        }
      }

      // Check if coupon applies to this product
      if (coupon.appliesTo === 'specific' && coupon.specificProducts) {
        const productIds = Array.isArray(coupon.specificProducts) 
          ? coupon.specificProducts.map(p => typeof p === 'object' && p !== null ? (p as any).id : p)
          : [typeof coupon.specificProducts === 'object' && coupon.specificProducts !== null ? (coupon.specificProducts as any).id : coupon.specificProducts]
        
        if (!productIds.includes(product.id)) {
          return {
            valid: false,
            error: 'Coupon not applicable to this product'
          }
        }
      } else if (coupon.appliesTo === 'subscriptions' && product.type !== 'subscription') {
        return {
          valid: false,
          error: 'Coupon only applies to subscription products'
        }
      } else if (coupon.appliesTo === 'one_time' && product.type !== 'one_time') {
        return {
          valid: false,
          error: 'Coupon only applies to one-time products'
        }
      }
    }

    // Calculate discount display
    let displayText = ''
    if (coupon.discountType === 'percentage') {
      displayText = `${coupon.discountValue}% off`
    } else {
      displayText = `$${(coupon.discountValue / 100).toFixed(2)} off`
    }

    return {
      valid: true,
      coupon,
      discount: {
        type: coupon.discountType,
        value: coupon.discountValue,
        displayText
      }
    }
  } catch (error) {
    console.error('Error validating coupon:', error)
    return {
      valid: false,
      error: 'Failed to validate coupon'
    }
  }
}

export async function incrementCouponUsage(couponId: number): Promise<boolean> {
  try {
    const payload = await getPayload()
    
    const coupon = await payload.findByID({
      collection: 'coupons',
      id: couponId,
    })

    if (!coupon) {
      return false
    }

    await payload.update({
      collection: 'coupons',
      id: couponId,
      data: {
        currentUses: (coupon.currentUses || 0) + 1,
      },
    })

    return true
  } catch (error) {
    console.error('Error incrementing coupon usage:', error)
    return false
  }
}