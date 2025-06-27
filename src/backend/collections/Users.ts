import React from 'react'
import { render } from '@react-email/render'
import type { CollectionConfig } from 'payload'

import Reset from '@/emails/Reset'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "firstname",
      type: "text",
      required: true,
    },
    {
      name: "lastname",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "user",
      options: [
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ],
    },
    {
      name: "stripeCustomerId",
      type: "text",
      label: "Stripe Customer ID",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "subscriptionStatus",
      type: "select",
      label: "Subscription Status",
      options: [
        { label: "None", value: "none" },
        { label: "Active", value: "active" },
        { label: "Canceled", value: "canceled" },
        { label: "Past Due", value: "past_due" },
        { label: "Trialing", value: "trialing" },
        { label: "Incomplete", value: "incomplete" },
        { label: "Incomplete Expired", value: "incomplete_expired" },
        { label: "Unpaid", value: "unpaid" },
      ],
      defaultValue: "none",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "currentProduct",
      type: "relationship",
      relationTo: "products",
      label: "Current Product",
      admin: {
        readOnly: true,
      },
    }
  ],
  timestamps: true,
  auth: {
    forgotPassword: {
      generateEmailHTML: async ({ token }: { token?: string } = {}) => {
        return await render(React.createElement(
          Reset,
          { ACTION_URL: process.env.NEXT_PUBLIC_DOMAIN + "/reset/" + token }
        ))
      }
    }
  },
}
