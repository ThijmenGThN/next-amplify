# CLAUDE.md

This file provides STRICT guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MANDATORY RULES

### STRICT REQUIREMENTS
- **NEVER use API folder** - Always use PayloadCMS server actions
- **NEVER use localization** - Build everything in English unless explicitly requested
- **ALWAYS use Shadcn UI** - Never use other UI libraries or custom components
- **ALWAYS use PayloadCMS** - Never bypass the CMS for data operations

### Development Commands
- `npm run lint` - Run ESLint with Next.js TypeScript rules
- `npm run generate:types` - Generate TypeScript types from Payload CMS schema (MANDATORY after any schema changes)

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and standalone output
- **CMS**: Payload CMS 3.x with PostgreSQL adapter (MANDATORY for all data operations)
- **UI**: Tailwind CSS v4 with Shadcn/UI, Radix UI components (MANDATORY)
- **Email**: React Email with Nodemailer
- **Payments**: Stripe and Cryptomus integration

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (payload)/         # Payload CMS admin panel
│   └── NOT api/           # FORBIDDEN - Use PayloadCMS instead
├── backend/               # Payload CMS configuration
│   ├── collections/       # CMS collections (Users, Products, etc.)
│   └── migrations/        # Database migrations
├── components/            # React components (Shadcn UI ONLY)
│   ├── billing/           # Billing-specific components
│   └── ui/                # Reusable UI components (Radix-based)
├── functions/             # Server actions and utilities
├── lib/                   # Third-party service configurations
└── types/                 # TypeScript definitions
```

### Key Collections
The CMS manages these core collections:
- **Users**: Authentication with role-based access (admin/user)
- **Products**: Billing products (one-time/subscription)
- **Subscriptions**: User subscription management
- **Purchases**: One-time purchase tracking
- **Coupons**: Discount code system
- **CryptomusPayments**: Crypto payment tracking
- **RenewalReminders**: Subscription renewal system

### Payment Integration
- **Stripe**: Traditional payment processing with webhooks
- **Cryptomus**: Cryptocurrency payment processing
- Both systems integrate with the same user/product/subscription model

### Type Safety
- Auto-generated types from Payload schema at `src/types/payload-types.ts`
- TypeScript paths configured for `@/*` imports
- MANDATORY: Run `npm run generate:types` after any schema changes

## ENFORCEMENT
Any deviation from these rules will result in rejected code. Always follow these guidelines exactly.