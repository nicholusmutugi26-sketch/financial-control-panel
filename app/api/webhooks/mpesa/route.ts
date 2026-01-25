// M-PESA WEBHOOK - DISABLED FOR NOW
// This route was initially planned for M-Pesa integration but has been replaced with
// a simpler form-based disbursement system. Kept for future reference.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { message: 'M-Pesa integration is currently disabled. Using form-based disbursement instead.' },
    { status: 200 }
  )
}

/*
// ORIGINAL M-PESA IMPLEMENTATION (DISABLED)
// To re-enable: uncomment below and ensure Transaction model has phoneNumber field
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { Body: bodyData } = body

    if (!bodyData?.stkCallback) {
      return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })
    }

    const { stkCallback } = bodyData
    const { CallbackMetadata, ResultCode, ResultDesc, CheckoutRequestID } = stkCallback

    const transaction = await prisma.transaction.findFirst({
      where: {
        metadata: {
          path: ['checkoutRequestID'],
          equals: CheckoutRequestID,
        }
      },
      include: {
        budget: true,
        user: true,
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (ResultCode === 0) {
      const metadata = CallbackMetadata?.Item || []
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          mpesaCode: mpesaReceiptNumber,
          amount: metadata.find((item: any) => item.Name === 'Amount')?.Value || transaction.amount,
          updatedAt: new Date(),
          metadata: {
            ...(transaction.metadata as Record<string, any>),
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            mpesaReceiptNumber,
            callbackData: bodyData,
          }
        }
      })
    } else {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            ...(transaction.metadata as Record<string, any>),
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            callbackData: bodyData,
          }
        }
      })
    }

    return NextResponse.json({ ResultCode: 0 })
  } catch (error) {
    console.error('M-Pesa webhook error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
*/