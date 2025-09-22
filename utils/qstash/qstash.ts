import { Client } from "@upstash/qstash"

// Validate environment variables
if (!process.env.QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN environment variable is required");
}

// Initialize QStash client with proper configuration
const client = new Client({
  token: process.env.QSTASH_TOKEN,
})

// Export the configured client
export { client as qstashClient }