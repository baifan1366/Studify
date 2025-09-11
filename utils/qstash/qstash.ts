import { Client } from "@upstash/qstash"

// Initialize QStash client with proper token configuration
const client = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// Export the configured client
export { client as qstashClient }

// Example usage (commented out)
/*
await client.publish({
  url: "https://example.com",
  headers: {
    "Content-Type": "application/json",
  },
})
*/