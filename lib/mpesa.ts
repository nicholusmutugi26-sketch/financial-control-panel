import axios from 'axios'
import crypto from 'crypto'
import { prisma } from './prisma'

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!
const MPESA_PASSKEY = process.env.MPESA_PASSKEY!
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE!
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL!

interface STKPushParams {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
  userId: string
  budgetId?: string
  expenditureId?: string
}

interface MpesaResponse {
  success: boolean
  data?: any
  error?: string
  checkoutRequestID?: string
}

class MpesaService {
  private token: string | null = null
  private tokenExpiry: Date | null = null

  private async getAccessToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    try {
      const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64')
      
      const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      )

      this.token = response.data.access_token
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000))
      
      return this.token as string
    } catch (error: any) {
      console.error('Error getting M-Pesa access token:', error)
      throw new Error('Failed to get M-Pesa access token')
    }
  }

  async initiateSTKPush(params: STKPushParams): Promise<MpesaResponse> {
    try {
      const token = await this.getAccessToken()
      
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, 14)
      
      const password = Buffer.from(
        `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
      ).toString("base64")

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          type: 'DISBURSEMENT',
          amount: params.amount,
          status: 'PENDING',
          userId: params.userId,
          budgetId: params.budgetId,
          reference: `FIN-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          metadata: {
            phoneNumber: params.phoneNumber,
            expenditureId: params.expenditureId,
            accountReference: params.accountReference,
            transactionDesc: params.transactionDesc,
          }
        }
      })

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: params.amount,
          PartyA: params.phoneNumber,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: params.phoneNumber,
          CallBackURL: `${MPESA_CALLBACK_URL}?transactionId=${transaction.id}`,
          AccountReference: params.accountReference,
          TransactionDesc: params.transactionDesc,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      // Update transaction with checkout request ID
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata as any || {}),
            checkoutRequestID: response.data.CheckoutRequestID,
            merchantRequestID: response.data.MerchantRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
          }
        }
      })

      return {
        success: true,
        data: response.data,
        checkoutRequestID: response.data.CheckoutRequestID,
      }
    } catch (error: any) {
      console.error("STK Push Error:", error.response?.data || error.message)
      
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message,
      }
    }
  }

  async checkTransactionStatus(checkoutRequestID: string) {
    try {
      const token = await this.getAccessToken()
      
      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: Buffer.from(
            `${MPESA_SHORTCODE}${MPESA_PASSKEY}${new Date()
              .toISOString()
              .replace(/[^0-9]/g, "")
              .slice(0, 14)}`
          ).toString("base64"),
          Timestamp: new Date()
            .toISOString()
            .replace(/[^0-9]/g, "")
            .slice(0, 14),
          CheckoutRequestID: checkoutRequestID,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error("Transaction status check error:", error)
      throw error
    }
  }
}

export const mpesaService = new MpesaService()