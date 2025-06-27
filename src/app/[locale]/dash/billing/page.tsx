import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getBillingData } from '@/functions/billing'
import DashboardLayout from '../layout'
import { BillingPageContent } from '@/components/billing/BillingPageContent'

async function BillingContent() {
  const billingData = await getBillingData()

  if (!billingData) {
    redirect('/login')
  }

  return (
    <BillingPageContent billingData={billingData} />
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}