# OneGuard API Tester

Simple Nuxt app to send `PublicVerificationRequest` payloads to `https://platform.oneguard.app/api/public/v1/verification` and inspect the response.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
# open http://localhost:3000
```

1. Fill in the request fields and required `customerName`, `customerEmail`, and your API key.
2. Optional: toggle `testMode`, `sendInvite`, and choose Prod vs Staging endpoint.
3. Submit to proxy through `/api/verify` (Nuxt server route sets `x-api-key` and forwards to OneGuard).
4. The raw response (or error) is shown in the Response panel.

## Production

```bash
npm run build
npm run preview
```
