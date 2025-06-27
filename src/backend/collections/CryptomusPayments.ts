import type { CollectionConfig } from 'payload'

export const CryptomusPayments: CollectionConfig = {
  slug: 'cryptomus-payments',
  admin: {
    useAsTitle: 'orderId',
  },
  access: {
    create: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return {
        user: {
          equals: user?.id,
        },
      }
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'User',
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Product',
    },
    {
      name: 'uuid',
      type: 'text',
      required: true,
      label: 'Cryptomus Payment UUID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'orderId',
      type: 'text',
      required: true,
      label: 'Order ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Amount (in cents)',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      label: 'Currency',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'One Time', value: 'one_time' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Prepaid Subscription', value: 'prepaid_subscription' },
        { label: 'Subscription Renewal', value: 'subscription_renewal' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'fail' },
        { label: 'Wrong Amount', value: 'wrong_amount' },
        { label: 'Processing', value: 'process' },
        { label: 'Confirm Check', value: 'confirm_check' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'paymentUrl',
      type: 'text',
      label: 'Payment URL',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'couponCode',
      type: 'text',
      label: 'Coupon Code',
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Paid At',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'cryptoCurrency',
      type: 'text',
      label: 'Cryptocurrency Used',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'cryptoAmount',
      type: 'text',
      label: 'Crypto Amount',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'network',
      type: 'text',
      label: 'Network',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'relatedSubscription',
      type: 'relationship',
      relationTo: 'subscriptions',
      label: 'Related Subscription',
      admin: {
        condition: (data) => data.type === 'subscription_renewal',
        description: 'The subscription this renewal payment is for',
      },
    },
  ],
  timestamps: true,
}