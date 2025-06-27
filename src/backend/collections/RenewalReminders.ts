import type { CollectionConfig } from 'payload'

export const RenewalReminders: CollectionConfig = {
  slug: 'renewal-reminders',
  admin: {
    useAsTitle: 'id',
    description: 'Manages renewal reminders for prepaid subscriptions'
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
      name: 'reminderDate',
      type: 'date',
      required: true,
      label: 'Reminder Date',
      admin: {
        description: 'When to send the renewal reminder',
      },
    },
    {
      name: 'renewalDate',
      type: 'date',
      required: true,
      label: 'Renewal Date',
      admin: {
        description: 'When the subscription expires and needs renewal',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Renewed', value: 'renewed' },
        { label: 'Expired', value: 'expired' },
        { label: 'Canceled', value: 'canceled' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Cryptomus Prepaid Subscription', value: 'cryptomus_prepaid_subscription' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Sent At',
      admin: {
        description: 'When the reminder was sent',
        readOnly: true,
      },
    },
    {
      name: 'reminderCount',
      type: 'number',
      label: 'Reminder Count',
      defaultValue: 0,
      admin: {
        description: 'Number of reminders sent',
        readOnly: true,
      },
    },
    {
      name: 'lastReminderSent',
      type: 'date',
      label: 'Last Reminder Sent',
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}