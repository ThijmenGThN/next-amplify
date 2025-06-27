import type { CollectionConfig } from 'payload'

export const Plans: CollectionConfig = {
  slug: 'plans',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    read: () => true,
    update: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
    delete: ({ req: { user } }) => {
      return Boolean(user?.role === 'admin')
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Plan Name',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      label: 'Price (in cents)',
      min: 0,
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'EUR', value: 'eur' },
        { label: 'GBP', value: 'gbp' },
      ],
    },
    {
      name: 'interval',
      type: 'select',
      required: true,
      defaultValue: 'month',
      options: [
        { label: 'Monthly', value: 'month' },
        { label: 'Yearly', value: 'year' },
      ],
    },
    {
      name: 'stripePriceId',
      type: 'text',
      label: 'Stripe Price ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'stripeProductId',
      type: 'text',
      label: 'Stripe Product ID',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
    {
      name: 'isPopular',
      type: 'checkbox',
      defaultValue: false,
      label: 'Popular Plan',
    },
    {
      name: 'maxUsers',
      type: 'number',
      label: 'Max Users',
      min: 1,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
    },
  ],
  timestamps: true,
}