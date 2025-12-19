import { createHmac, timingSafeEqual } from 'crypto'
import { createError, getHeader, readRawBody } from 'h3'

// Prefer env override, fall back to provided secret.
const SIGNING_SECRET = process.env.ONEGUARD_WEBHOOK_SECRET || 'whsec_7ad4bfae9ff9f59829a8feedc8b3c4441281ba63e4a52419'
const SIGNATURE_HEADER = 'x-oneguard-signature'
const TIMESTAMP_HEADER = 'x-oneguard-timestamp'

const computeSignature = (timestamp: string, body: string, secret: string) => {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export default defineEventHandler(async (event) => {
  const signatureHeader = getHeader(event, SIGNATURE_HEADER)
  const timestampHeader = getHeader(event, TIMESTAMP_HEADER)
  console.log(
    `[webhook] step=received signature=${signatureHeader ?? 'missing'} timestamp=${timestampHeader ?? 'missing'}`
  )

  if (!signatureHeader) {
    console.log('[webhook] step=error reason=missing-signature-header')
    throw createError({ statusCode: 400, statusMessage: 'Missing X-OneGuard-Signature header' })
  }

  if (!timestampHeader) {
    console.log('[webhook] step=error reason=missing-timestamp-header')
    throw createError({ statusCode: 400, statusMessage: 'Missing X-OneGuard-Timestamp header' })
  }

  if (!/^\d+$/.test(timestampHeader)) {
    console.log('[webhook] step=error reason=invalid-timestamp value=%s', timestampHeader)
    throw createError({ statusCode: 400, statusMessage: 'Invalid X-OneGuard-Timestamp header' })
  }

  const rawBody = (await readRawBody(event)) ?? ''
  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
  console.log(`[webhook] step=raw-body length=${bodyString.length}`)

  const computedSignature = computeSignature(timestampHeader, bodyString, SIGNING_SECRET)
  console.log(`[webhook] step=computed-signature signature=${computedSignature}`)

  const incomingBuf = Buffer.from(signatureHeader, 'utf8')
  const computedBuf = Buffer.from(computedSignature, 'utf8')

  if (incomingBuf.length !== computedBuf.length || !timingSafeEqual(incomingBuf, computedBuf)) {
    console.log('[webhook] step=error reason=signature-mismatch')
    throw createError({ statusCode: 401, statusMessage: 'Invalid webhook signature' })
  }

  console.log('[webhook] step=validated status=ok')

  let payload: unknown = null
  try {
    payload = bodyString ? JSON.parse(bodyString) : null
  } catch (parseError) {
    console.log('[webhook] step=error reason=invalid-json', parseError)
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' })
  }

  console.log('[webhook] step=payload', payload)

  return { received: true }
})
