<template>
  <div class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">OneGuard API Tester</p>
        <h1>Public verification request</h1>
        <p class="muted">
          Fill in the payload, include your API key, and submit to see the live response.
        </p>
      </div>
      <div class="hero-actions">
        <button class="ghost" type="button" @click="resetForm" :disabled="loading">Clear form</button>
        <button class="primary" type="submit" form="verification-form" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send request' }}
        </button>
      </div>
    </header>

    <form id="verification-form" class="grid" @submit.prevent="sendRequest">
      <section class="card">
        <div class="card-header">
          <h2>Order</h2>
          <p class="muted">Optional details to help identify the verification.</p>
        </div>
        <div class="fields">
          <label>
            <span>Order ID</span>
            <input v-model="form.orderId" type="text" placeholder="12345 or external id" />
          </label>
          <label>
            <span>Order name</span>
            <input v-model="form.orderName" type="text" placeholder="Winter bundle" />
          </label>
          <label>
            <span>Order timestamp</span>
            <input v-model="form.orderTimestamp" type="text" placeholder="2024-12-20T10:00:00Z" />
          </label>
          <label>
            <span>Order public URL</span>
            <input v-model="form.orderPublicUrl" type="text" placeholder="https://example.com/order/123" />
          </label>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>Customer</h2>
          <p class="muted">Required contact details for the verification.</p>
        </div>
        <div class="fields">
          <label>
            <span>Customer name *</span>
            <input v-model="form.customerName" type="text" placeholder="Ava Oneguard" required />
          </label>
          <label>
            <span>Customer email *</span>
            <input v-model="form.customerEmail" type="email" placeholder="ava@example.com" required />
          </label>
          <label>
            <span>Customer address</span>
            <textarea
              v-model="form.customerAddress"
              rows="2"
              placeholder="123 Main Street, Springfield"
            ></textarea>
          </label>
          <label>
            <span>Customer locale</span>
            <input v-model="form.customerLocale" type="text" placeholder="en-US" />
          </label>
        </div>
      </section>

      <section class="card options">
        <div class="card-header">
          <h2>Options</h2>
          <p class="muted">Toggle invites, test mode, and target environment.</p>
        </div>
        <div class="switches">
          <div class="pill-group" role="group" aria-label="Environment">
            <button
              type="button"
              class="pill"
              :class="{ active: form.environment === 'prod' }"
              @click="form.environment = 'prod'"
            >
              Prod
              <span class="pill-sub">platform.oneguard.app</span>
            </button>
            <button
              type="button"
              class="pill"
              :class="{ active: form.environment === 'staging' }"
              @click="form.environment = 'staging'"
            >
              Staging
              <span class="pill-sub">platform.staging.oneguard.app</span>
            </button>
          </div>
          <label class="switch">
            <input v-model="form.sendInvite" type="checkbox" />
            <span>Send invite</span>
          </label>
          <label class="switch">
            <input v-model="form.testMode" type="checkbox" />
            <span>Test mode</span>
          </label>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>API key</h2>
          <p class="muted">Used as the <code>x-api-key</code> header on the outbound request.</p>
        </div>
        <div class="fields">
          <label>
            <span>API key *</span>
            <input v-model="form.apiKey" type="password" placeholder="sk_live_..." required />
          </label>
        </div>
      </section>
    </form>

    <section class="card response">
      <div class="card-header">
        <h2>Response</h2>
        <p class="muted">
          Raw response from <code>{{ targetUrl }}</code>.
        </p>
      </div>
      <div class="status-line">
        <span class="status-dot" :class="statusDotClass" />
        <span class="muted">
          {{ loading ? 'Sending request…' : statusMessage }}
        </span>
      </div>
      <div class="output">
        <pre v-if="formattedResponse">{{ formattedResponse }}</pre>
        <pre v-else class="placeholder">No response yet.</pre>
        <pre v-if="formattedError" class="error">{{ formattedError }}</pre>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

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

type FormModel = PublicVerificationRequest & { apiKey: string; environment: 'prod' | 'staging' }

const initialForm: FormModel = {
  orderId: '',
  orderName: '',
  orderTimestamp: '',
  customerEmail: '',
  customerName: '',
  customerAddress: '',
  orderPublicUrl: '',
  customerLocale: '',
  sendInvite: false,
  testMode: true,
  apiKey: '',
  environment: 'prod',
}

const form = reactive<FormModel>({ ...initialForm })
const loading = ref(false)
const response = ref<unknown | null>(null)
const error = ref<unknown | null>(null)

const formattedResponse = computed(() =>
  response.value ? JSON.stringify(response.value, null, 2) : null
)
const formattedError = computed(() => (error.value ? JSON.stringify(error.value, null, 2) : null))
const targetUrl = computed(() =>
  form.environment === 'staging'
    ? 'https://platform.staging.oneguard.app/api/public/v1/verification'
    : 'https://platform.oneguard.app/api/public/v1/verification'
)
const statusMessage = computed(() => {
  if (loading.value) return 'Sending request…'
  if (error.value) return 'Request failed'
  if (response.value) return 'Request succeeded'
  return 'Waiting to send'
})
const statusDotClass = computed(() => {
  if (loading.value) return 'warn'
  if (error.value) return 'danger'
  if (response.value) return 'success'
  return 'muted'
})

const normalize = (value: string | number | undefined) => {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const buildPayload = (): PublicVerificationRequest => ({
  orderId: normalize(form.orderId),
  orderName: normalize(form.orderName),
  orderTimestamp: normalize(form.orderTimestamp),
  customerEmail: form.customerEmail.trim(),
  customerName: form.customerName.trim(),
  customerAddress: normalize(form.customerAddress),
  orderPublicUrl: normalize(form.orderPublicUrl),
  customerLocale: normalize(form.customerLocale),
  sendInvite: form.sendInvite,
  testMode: form.testMode,
})

const sendRequest = async () => {
  error.value = null
  response.value = null

  if (!form.apiKey.trim()) {
    error.value = 'API key is required'
    return
  }
  if (!form.customerEmail.trim() || !form.customerName.trim()) {
    error.value = 'customerEmail and customerName are required'
    return
  }

  loading.value = true
  try {
    response.value = await $fetch('/api/verify', {
      method: 'POST',
      body: { apiKey: form.apiKey.trim(), environment: form.environment, ...buildPayload() },
    })
  } catch (err: any) {
    error.value = err?.data ?? err?.message ?? err
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, initialForm)
  response.value = null
  error.value = null
}
</script>

<style scoped>
:global(body) {
  font-family: "IBM Plex Sans", "Manrope", "Helvetica Neue", sans-serif;
  background: radial-gradient(circle at 20% 20%, rgba(13, 148, 136, 0.08), transparent 30%),
    radial-gradient(circle at 80% 0%, rgba(79, 70, 229, 0.05), transparent 30%),
    #0b1120;
  color: #e2e8f0;
}

.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 56px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #22d3ee;
  margin: 0 0 4px;
}

h1 {
  font-size: 28px;
  margin: 0 0 6px;
  color: #f8fafc;
}

.muted {
  color: #cbd5e1;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.card-header h2 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #f1f5f9;
}

.fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 10px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #e2e8f0;
}

input,
textarea {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  padding: 10px 12px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus,
textarea:focus {
  border-color: #22d3ee;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
}

.switches {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.pill-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  flex: 1;
}

.pill {
  width: 100%;
  text-align: left;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.pill:hover {
  transform: translateY(-1px);
  border-color: #22d3ee;
}

.pill.active {
  background: linear-gradient(130deg, rgba(34, 211, 238, 0.1), rgba(14, 165, 233, 0.08));
  border-color: #22d3ee;
}

.pill-sub {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.25);
  cursor: pointer;
}

.switch input {
  width: 16px;
  height: 16px;
  accent-color: #22d3ee;
  margin: 0;
}

.ghost,
.primary {
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: #e2e8f0;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
}

.primary {
  background: linear-gradient(120deg, #22d3ee, #0ea5e9);
  border: none;
  color: #0b1120;
}

.ghost:hover,
.primary:hover {
  transform: translateY(-1px);
}

.ghost:disabled,
.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.response .output {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

pre {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 12px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

.placeholder {
  color: #94a3b8;
}

.error {
  border-color: rgba(248, 113, 113, 0.5);
  color: #fecdd3;
}

.status-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-dot.success {
  background: #22c55e;
}

.status-dot.danger {
  background: #ef4444;
}

.status-dot.warn {
  background: #fbbf24;
}

.status-dot.muted {
  background: #94a3b8;
}

.options {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
