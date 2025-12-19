import { createHmac, timingSafeEqual } from 'crypto'
import { createError, getHeader, readRawBody } from 'h3'

// Prefer env override, fall back to provided secret.
const SIGNING_SECRET = process.env.ONEGUARD_WEBHOOK_SECRET || 'whsec_7ad4bfae9ff9f59829a8feedc8b3c4441281ba63e4a52419'
const SIGNATURE_HEADER = 'x-oneguard-signature'

const computeSignature = (payload: string | Buffer, secret: string) => {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export default defineEventHandler(async (event) => {
  const signatureHeader = getHeader(event, SIGNATURE_HEADER)
  console.log(`[webhook] step=received signature=${signatureHeader ?? 'missing'}`)

  if (!signatureHeader) {
    console.log('[webhook] step=error reason=missing-signature-header')
    throw createError({ statusCode: 400, statusMessage: 'Missing X-OneGuard-Signature header' })
  }

  const rawBody = (await readRawBody(event)) ?? ''
  console.log(`[webhook] step=raw-body length=${typeof rawBody === 'string' ? rawBody.length : rawBody.byteLength}`)

  const computedSignature = computeSignature(rawBody, SIGNING_SECRET)
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
    payload = rawBody ? JSON.parse(rawBody as string) : null
  } catch (parseError) {
    console.log('[webhook] step=error reason=invalid-json', parseError)
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' })
  }

  console.log('[webhook] step=payload', payload)

  return { received: true }
})
