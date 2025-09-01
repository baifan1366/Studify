import { Client } from "@upstash/qstash"

const client = new Client()

await client.publish({
  url: "https://example.com",
  headers: {
    "Content-Type": "application/json",
  },
})