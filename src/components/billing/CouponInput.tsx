'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Tag, X, Check } from 'lucide-react'
import { validateCoupon } from '@/functions/coupons'

interface CouponInputProps {
  onCouponApplied: (coupon: { code: string; discount: { type: 'percentage' | 'fixed'; value: number; displayText: string } } | null) => void
  productId?: string
  className?: string
}

export function CouponInput({ onCouponApplied, productId, className }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [error, setError] = useState('')

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setLoading(true)
    setError('')

    try {
      const result = await validateCoupon(couponCode.trim(), productId)

      if (result.valid && result.discount) {
        const couponData = {
          code: couponCode.trim().toUpperCase(),
          discount: result.discount
        }
        setAppliedCoupon(couponData)
        onCouponApplied(couponData)
        setCouponCode('')
      } else {
        setError(result.error || 'Invalid coupon code')
        onCouponApplied(null)
      }
    } catch (_error) {
      setError('Failed to validate coupon')
      onCouponApplied(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setError('')
    onCouponApplied(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon()
    }
  }

  return (
    <div className="space-y-3">
      {appliedCoupon ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {appliedCoupon.code}
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {appliedCoupon.discount.displayText}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveCoupon}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="coupon-input"
              placeholder="Enter promo code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || loading}
              size="default"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}