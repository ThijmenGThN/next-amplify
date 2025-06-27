import type { CollectionConfig } from 'payload'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'id',
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
      name: 'stripeSubscriptionId',
      type: 'text',
      required: true,
      label: 'Stripe Subscription ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      required: true,
      label: 'Stripe Customer ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'Incomplete', value: 'incomplete' },
        { label: 'Incomplete Expired', value: 'incomplete_expired' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Trialing', value: 'trialing' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'currentPeriodStart',
      type: 'date',
      label: 'Current Period Start',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      label: 'Current Period End',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'canceledAt',
      type: 'date',
      label: 'Canceled At',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'cancelAtPeriodEnd',
      type: 'checkbox',
      label: 'Cancel at Period End',
      defaultValue: false,
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}