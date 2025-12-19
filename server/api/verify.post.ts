import { setResponseStatus } from 'h3'

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

type ForwardRequest = PublicVerificationRequest & { apiKey?: string; environment?: 'prod' | 'staging' }

export default defineEventHandler(async (event) => {
  const body = await readBody<ForwardRequest>(event)
  const apiKey = (body.apiKey || '').trim()

  if (!apiKey) {
    setResponseStatus(event, 400)
    return { ok: false, status: 400, error: 'Missing API key (provide x-api-key)' }
  }

  if (!body.customerEmail || !body.customerName) {
    setResponseStatus(event, 400)
    return { ok: false, status: 400, error: 'customerEmail and customerName are required' }
  }

  const { apiKey: _removed, environment, ...payload } = body
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

  const targetUrl =
    environment === 'staging'
      ? 'https://platform.staging.oneguard.app/api/public/v1/verification'
      : 'https://platform.oneguard.app/api/public/v1/verification'

  try {
    const response = await $fetch.raw(targetUrl, {
      method: 'POST',
      body: normalizedPayload,
      headers: {
        'x-api-key': apiKey,
      },
      responseType: 'text',
      throw: false,
    })

    const contentType = response.headers.get('content-type') || ''
    const raw = (response as any)._data ?? (response as any).data ?? ''

    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw as string) : null
    } catch {
      parsed = null
    }

    const isHtml = typeof raw === 'string' && raw.trim().startsWith('<')

    const resultPayload = {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
      data: isHtml ? { note: 'text/html response', body: raw } : parsed ?? raw,
      raw,
    }

    setResponseStatus(event, response.status)
    return resultPayload
  } catch (error: any) {
    const status = error?.status || 500
    const detailRaw = error?.data ?? error?.message ?? error
    const detail =
      typeof detailRaw === 'string' && detailRaw.trim().startsWith('<')
        ? { note: 'text/html error response', body: detailRaw }
        : detailRaw
    setResponseStatus(event, status)
    return {
      ok: false,
      status,
      statusText: 'Verification request failed',
      error: detail,
    }
  }
})
