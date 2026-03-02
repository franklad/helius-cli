import { Cli, z } from 'incur'

export const webhooks = Cli.create('webhooks', {
  description: 'Webhook management commands',
})
  .command('list', {
    description: 'List all webhooks',
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const res = await fetch(
        `https://api.helius.xyz/v0/webhooks?api-key=${c.env.HELIUS_API_KEY}`,
      )
      const json = (await res.json()) as unknown[]
      return { count: json.length, webhooks: json }
    },
  })
  .command('create', {
    description: 'Create a new webhook',
    options: z.object({
      url: z.string().url().describe('Webhook destination URL'),
      address: z.string().describe('Wallet address to watch'),
      type: z
        .enum(['enhanced', 'raw', 'discord'])
        .default('enhanced')
        .describe('Webhook type'),
    }),
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const res = await fetch(
        `https://api.helius.xyz/v0/webhooks?api-key=${c.env.HELIUS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookURL: c.options.url,
            accountAddresses: [c.options.address],
            webhookType: c.options.type,
            transactionTypes: ['Any'],
          }),
        },
      )
      const json = (await res.json()) as { webhookID?: string }
      return { webhookId: json.webhookID ?? null, created: true }
    },
  })
  .command('delete', {
    description: 'Delete a webhook by ID',
    args: z.object({
      id: z.string().describe('Webhook ID'),
    }),
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const res = await fetch(
        `https://api.helius.xyz/v0/webhooks/${c.args.id}?api-key=${c.env.HELIUS_API_KEY}`,
        { method: 'DELETE' },
      )
      return { webhookId: c.args.id, deleted: res.ok }
    },
  })
