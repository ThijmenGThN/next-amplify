# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with hot reloading
- `npm run devsafe` - Clean build cache and start development server
- `npm run build` - Build for production (includes standalone output and static files)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js TypeScript rules

### Database & Types
- `npm run generate:types` - Generate TypeScript types from Payload CMS schema
- `npm run generate:importmap` - Generate import map for Payload
- `npm run payload` - Access Payload CMS CLI

### Email Development
- `npm run email` - Start email development server for testing templates

### Docker & Deployment
- `docker compose up -d` - Start development database
- `npm run deploy` - Full deployment command (install, build, start)
- `npm run sync-template` - Sync with upstream template repository

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router and standalone output
- **CMS**: Payload CMS 3.x with PostgreSQL adapter
- **UI**: Tailwind CSS v4 with Shadcn/UI, Radix UI components
- **Email**: React Email with Nodemailer
- **Payments**: Stripe and Cryptomus integration
- **Internationalization**: next-intl (English/Dutch)

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Internationalized routes
│   ├── (payload)/         # Payload CMS admin panel
│   └── api/               # API routes (Stripe, Cryptomus)
├── backend/               # Payload CMS configuration
│   ├── collections/       # CMS collections (Users, Products, etc.)
│   └── migrations/        # Database migrations
├── components/            # React components
│   ├── billing/           # Billing-specific components
│   └── ui/                # Reusable UI components (Radix-based)
├── functions/             # Server actions and utilities
├── lib/                   # Third-party service configurations
├── locales/               # Internationalization files
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

### Environment Configuration
The application uses environment profiles:
- `COMPOSE_PROFILES=dev` for development
- `COMPOSE_PROFILES=prod` for production
- Database connection adjusts automatically based on profile

### Type Safety
- Auto-generated types from Payload schema at `src/types/payload-types.ts`
- Run `npm run generate:types` after schema changes
- TypeScript paths configured for `@/*` imports

### Development Notes
- Always run `npm run generate:types` after modifying Payload collections
- Use `npm run devsafe` if experiencing build cache issues
- Email templates are in `src/emails/` and can be tested with `npm run email`
- The application supports standalone Docker deployment