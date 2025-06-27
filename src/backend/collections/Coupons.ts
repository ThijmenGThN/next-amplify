import type { CollectionConfig } from 'payload'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  admin: {
    useAsTitle: 'code',
  },
  access: {
    create: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    read: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    update: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    delete: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      label: 'Coupon Code',
      admin: {
        description: 'Unique coupon code (e.g., SAVE20, WELCOME50)',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Coupon Name',
      admin: {
        description: 'Internal name for this coupon',
      },
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed Amount', value: 'fixed' },
      ],
      defaultValue: 'percentage',
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
      label: 'Discount Value',
      admin: {
        description: 'For percentage: enter 20 for 20%. For fixed: enter amount in cents (e.g., 1000 = $10)',
      },
      min: 0,
    },
    {
      name: 'maxUses',
      type: 'number',
      label: 'Maximum Uses',
      admin: {
        description: 'Leave empty for unlimited uses',
      },
      min: 1,
    },
    {
      name: 'currentUses',
      type: 'number',
      defaultValue: 0,
      label: 'Current Uses',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Expiration Date',
      admin: {
        description: 'Leave empty for no expiration',
      },
    },
    {
      name: 'appliesTo',
      type: 'select',
      required: true,
      options: [
        { label: 'All Products', value: 'all' },
        { label: 'Specific Products', value: 'specific' },
        { label: 'Subscription Products Only', value: 'subscriptions' },
        { label: 'One-time Products Only', value: 'one_time' },
      ],
      defaultValue: 'all',
    },
    {
      name: 'specificProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Specific Products',
      admin: {
        condition: (data) => data.appliesTo === 'specific',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
    {
      name: 'stripeCouponId',
      type: 'text',
      label: 'Stripe Coupon ID',
      admin: {
        readOnly: true,
        description: 'Automatically generated when coupon is used',
      },
    },
  ],
  timestamps: true,
}