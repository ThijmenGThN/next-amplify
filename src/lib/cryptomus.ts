import crypto from 'crypto'

export interface CryptomusPaymentData {
  amount: string
  currency: string
  order_id: string
  url_return?: string
  url_success?: string
  url_callback?: string
  is_payment_multiple?: boolean
  lifetime?: number
  to_currency?: string
}

export interface CryptomusPaymentResponse {
  uuid: string
  order_id: string
  amount: string
  payment_status: string
  url: string
  address: string
  from: string
  wallet_address_uuid: string
  network: string
  currency: string
  payer_currency: string
  additional_data: string | null
  comment: string | null
  merchant_amount: string
  is_final: boolean
  status: string
  created_at: string
  updated_at: string
}

export interface CryptomusWebhookData {
  uuid: string
  order_id: string
  amount: string
  payment_status: 'paid' | 'fail' | 'wrong_amount' | 'process' | 'confirm_check'
  payer_amount: string
  discount_percent: string
  network: string
  currency: string
  payer_currency: string
  additional_data: string | null
  created_at: string
  updated_at: string
  sign: string
}

class CryptomusClient {
  private apiKey: string
  private merchantId: string
  private baseUrl = 'https://api.cryptomus.com/v1'

  constructor(apiKey: string, merchantId: string) {
    this.apiKey = apiKey
    this.merchantId = merchantId
  }

  private generateSign(data: Record<string, any>): string {
    // Remove any undefined or null values but keep proper types
    const cleanData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined && value !== null)
    )
    
    // Sort the data alphabetically by keys
    const sortedKeys = Object.keys(cleanData).sort()
    const sortedData: Record<string, any> = {}
    
    for (const key of sortedKeys) {
      sortedData[key] = cleanData[key]
    }

    // Create JSON string
    const jsonString = JSON.stringify(sortedData)
    
    // Encode to base64
    const base64Data = Buffer.from(jsonString, 'utf8').toString('base64')
    
    // Create MD5 hash of base64 + api_key
    const signatureString = base64Data + this.apiKey
    
    const hash = crypto
      .createHash('md5')
      .update(signatureString, 'utf8')
      .digest('hex')
    
    return hash
  }

  async createPayment(paymentData: CryptomusPaymentData): Promise<CryptomusPaymentResponse> {
    const data = {
      ...paymentData,
      merchant_id: this.merchantId,
    }

    const sign = this.generateSign(data)

    const response = await fetch(`${this.baseUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': this.merchantId,
        'sign': sign,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Cryptomus API error details:', {
        status: response.status,
        data: errorData,
        sentData: data,
        signature: sign
      })
      throw new Error(`Cryptomus API error: ${response.status} - ${errorData.message || 'Invalid Sign'}`)
    }

    const result = await response.json()
    
    if (result.state !== 0) {
      throw new Error(`Cryptomus payment creation failed: ${result.message || 'Unknown error'}`)
    }

    return result.result
  }

  async getPaymentStatus(uuid: string): Promise<CryptomusPaymentResponse> {
    const data = {
      uuid,
      merchant_id: this.merchantId,
    }

    const sign = this.generateSign(data)

    const response = await fetch(`${this.baseUrl}/payment/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchant': this.merchantId,
        'sign': sign,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Cryptomus API error: ${response.status} - ${errorData.message || 'Unknown error'}`)
    }

    const result = await response.json()
    
    if (result.state !== 0) {
      throw new Error(`Cryptomus payment status check failed: ${result.message || 'Unknown error'}`)
    }

    return result.result
  }

  verifyWebhook(webhookData: CryptomusWebhookData, expectedSign: string): boolean {
    const { sign: _sign, ...dataWithoutSign } = webhookData
    const calculatedSign = this.generateSign(dataWithoutSign)
    return calculatedSign === expectedSign
  }

  static formatPrice(amount: number): string {
    return (amount / 100).toFixed(2)
  }

  static parsePrice(amount: string): number {
    return Math.round(parseFloat(amount) * 100)
  }
}

// Validate environment variables
if (!process.env.CRYPTOMUS_API_KEY) {
  throw new Error('CRYPTOMUS_API_KEY environment variable is required')
}
if (!process.env.CRYPTOMUS_MERCHANT_ID) {
  throw new Error('CRYPTOMUS_MERCHANT_ID environment variable is required')
}

// console.log('Cryptomus config loaded')

export const cryptomus = new CryptomusClient(
  process.env.CRYPTOMUS_API_KEY!,
  process.env.CRYPTOMUS_MERCHANT_ID!
)

export const createCryptomusPayment = async (paymentData: {
  amount: number
  currency: string
  orderId: string
  returnUrl?: string
  successUrl?: string
  callbackUrl?: string
}) => {
  const cryptomusData: CryptomusPaymentData = {
    amount: CryptomusClient.formatPrice(paymentData.amount),
    currency: paymentData.currency.toUpperCase(),
    order_id: paymentData.orderId,
    url_return: paymentData.returnUrl,
    url_success: paymentData.successUrl,
    url_callback: paymentData.callbackUrl,
    is_payment_multiple: false,
    lifetime: 3600,
  }

  // Ensure proper data types for API call and remove undefined values
  const apiData: any = {
    amount: cryptomusData.amount,
    currency: 'USD', // Force USD for now - EUR might not be supported
    order_id: cryptomusData.order_id,
    is_payment_multiple: false, // boolean
    lifetime: 3600, // number
  }

  // Only add optional parameters if they are defined
  if (cryptomusData.url_return) apiData.url_return = cryptomusData.url_return
  if (cryptomusData.url_success) apiData.url_success = cryptomusData.url_success
  if (cryptomusData.url_callback) apiData.url_callback = cryptomusData.url_callback

  return await cryptomus.createPayment(apiData)
}

export const getCryptomusPaymentStatus = async (uuid: string) => {
  return await cryptomus.getPaymentStatus(uuid)
}

export const verifyCryptomusWebhook = (webhookData: CryptomusWebhookData, expectedSign: string): boolean => {
  return cryptomus.verifyWebhook(webhookData, expectedSign)
}