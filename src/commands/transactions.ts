import { Cli, z } from 'incur'

export const transactions = Cli.create('transactions', {
  description: 'Transaction commands',
})
  .command('get', {
    description: 'Get a parsed transaction by signature',
    args: z.object({
      signature: z.string().describe('Transaction signature'),
    }),
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const url = `https://api.helius.xyz/v0/transactions/?api-key=${c.env.HELIUS_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [c.args.signature] }),
      })
      const json = (await res.json()) as unknown[]
      return { transaction: json[0] ?? null }
    },
  })
  .command('history', {
    description: 'Get transaction history for a wallet address',
    args: z.object({
      address: z.string().describe('Wallet address (base58)'),
    }),
    options: z.object({
      limit: z.number().int().min(1).max(100).default(10).describe('Number of transactions'),
    }),
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const params = new URLSearchParams({ limit: String(c.options.limit) })
      const url = `https://api.helius.xyz/v0/addresses/${c.args.address}/transactions?api-key=${c.env.HELIUS_API_KEY}&${params}`
      const res = await fetch(url)
      const json = (await res.json()) as unknown[]
      return { address: c.args.address, count: json.length, transactions: json }
    },
  })
