import { createError } from 'h3'

type PublicVerificationRequest = {
  orderId?: string | number
  orderName?: string
  orderTimestamp?: string
  customerEmail: string
  customerName: string
  customerAddress?: string
  orderPublicUrl?: string
  customerLocale?: string
  sendInvite?: boolean
  testMode?: boolean
}

type ForwardRequest = PublicVerificationRequest & { apiKey?: string }

export default defineEventHandler(async (event) => {
  const body = await readBody<ForwardRequest>(event)
  const apiKey = (body.apiKey || '').trim()

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing API key (provide x-api-key)',
    })
  }

  if (!body.customerEmail || !body.customerName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'customerEmail and customerName are required',
    })
  }

  const { apiKey: _removed, ...payload } = body
  const normalizedPayload: PublicVerificationRequest = {
    ...payload,
    orderId: payload.orderId === '' ? undefined : payload.orderId,
    orderName: payload.orderName?.trim() || undefined,
    orderTimestamp: payload.orderTimestamp?.trim() || undefined,
    customerEmail: payload.customerEmail.trim(),
    customerName: payload.customerName.trim(),
    customerAddress: payload.customerAddress?.trim() || undefined,
    orderPublicUrl: payload.orderPublicUrl?.trim() || undefined,
    customerLocale: payload.customerLocale?.trim() || undefined,
    sendInvite: payload.sendInvite ?? false,
    testMode: payload.testMode ?? false,
  }

  try {
    const result = await $fetch('https://platform.oneguard.app/api/public/v1/verification', {
      method: 'POST',
      body: normalizedPayload,
      headers: {
        'x-api-key': apiKey,
      },
    })

    return result
  } catch (error: any) {
    throw createError({
      statusCode: error?.status || 500,
      statusMessage: 'Verification request failed',
      data: error?.data ?? error?.message ?? error,
    })
  }
})
