export default defineEventHandler(async (event) => {
  const payload = await readBody(event)

  // Log the entire incoming webhook payload for inspection
  console.log('OneGuard webhook received:', payload)

  return { received: true }
})
