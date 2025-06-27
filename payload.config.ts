import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { migrations } from '@/backend/migrations'
import { Users } from '@/backend/collections/Users'
import { Products } from '@/backend/collections/Products'
import { Subscriptions } from '@/backend/collections/Subscriptions'
import { Purchases } from '@/backend/collections/Purchases'
import { Coupons } from '@/backend/collections/Coupons'
import { Media } from '@/backend/collections/Media'
import { CryptomusPayments } from '@/backend/collections/CryptomusPayments'
import { RenewalReminders } from '@/backend/collections/RenewalReminders'

const collections = [
  Users,
  Products,
  Subscriptions,
  Purchases,
  Coupons,
  Media,
  CryptomusPayments,
  RenewalReminders,
]

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const email = process.env.SMTP_HOST ? nodemailerAdapter({
  defaultFromName: process.env.MAIL_DEFAULT_NAME ?? "Next Leaflet",
  defaultFromAddress: process.env.MAIL_DEFAULT_ADDRESS ?? "next@leaflet.app",
  transportOptions: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  },
}) : undefined

const databaseHost = process.env.COMPOSE_PROFILES === 'prod' && process.env.DATABASE_HOST === '0.0.0.0'
  ? 'database'
  : process.env.DATABASE_HOST

export default buildConfig({
  email,
  sharp,
  collections,
  secret: process.env.PAYLOAD_SECRET as string,
  serverURL: process.env.NEXT_PUBLIC_DOMAIN as string,
  csrf: [process.env.NEXT_PUBLIC_DOMAIN as string],
  cors: [process.env.NEXT_PUBLIC_DOMAIN as string],
  db: postgresAdapter({
    prodMigrations: migrations,
    migrationDir: path.resolve(dirname, './src/backend/migrations'),
    pool: {
      connectionString: `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASS}@${databaseHost}:${process.env.COMPOSE_PROFILES === 'prod' ? '5432' : process.env.DATABASE_PORT}/${process.env.DATABASE_TABLE}`
    },
  }),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname)
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, './src/types/payload-types.ts')
  },
})
