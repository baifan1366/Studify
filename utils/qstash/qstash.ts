import { Client } from "@upstash/qstash"

// Validate environment variables
if (!process.env.QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN environment variable is required");
}

// Initialize QStash client with proper configuration
const client = new Client({
  token: process.env.QSTASH_TOKEN,
  baseUrl: process.env.QSTASH_URL || "https://qstash.upstash.io",
})

// Export the configured client
export { client as qstashClient }

// Debug helper to validate token format
export function validateQStashToken(token: string): { valid: boolean; reason?: string } {
  if (!token) {
    return { valid: false, reason: "Token is empty" };
  }
  
  // QStash tokens typically start with "qstash_" or are JWT-like
  if (token.startsWith('eyJ')) {
    return { valid: false, reason: "Token appears to be base64 encoded credentials, not a QStash token" };
  }
  
  if (!token.startsWith('qstash_') && token.length < 20) {
    return { valid: false, reason: "Token format appears invalid" };
  }
  
  return { valid: true };
}

// Example usage (commented out)
/*
await client.publish({
  url: "https://example.com",
  headers: {
    "Content-Type": "application/json",
  },
})
*/