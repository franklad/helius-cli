import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

export const send = Cli.create('send', {
  description: 'Send a transaction via Helius Sender. Requires Jito tip (min 0.0002 SOL) + compute unit price.',
  args: z.object({ transaction: z.string() }),
  options: z.object({
    swqosOnly: z.boolean().default(false),
    encoding: z.enum(['base64', 'base58']).default('base64'),
    skipPreflight: z.boolean().default(true),
    maxRetries: z.number().default(0),
  }),
  vars: heliusVars,
  output: z.object({ signature: z.string() }),
  examples: [
    { args: { transaction: '<base64-tx>' }, description: 'Send a transaction' },
    { args: { transaction: '<base58-tx>' }, options: { encoding: 'base58' }, description: 'Send base58-encoded' },
    { args: { transaction: '<base64-tx>' }, options: { swqosOnly: true }, description: 'Route via SWQOS only (lower tip)' },
  ],
  async run(c) {
    const params = new URLSearchParams({ 'api-key': c.var.apiKey })
    if (c.options.swqosOnly) params.set('swqos_only', 'true')
    const url = `https://sender.helius-rpc.com/fast?${params}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'sendTransaction',
        params: [
          c.args.transaction,
          {
            encoding: c.options.encoding,
            skipPreflight: c.options.skipPreflight,
            maxRetries: c.options.maxRetries,
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return c.error({ code: 'SENDER_ERROR', message: `Sender returned ${res.status}: ${text}`, retryable: true })
    }

    const json = (await res.json()) as { result?: string; error?: { message: string } }
    if (json.error) {
      return c.error({ code: 'TX_REJECTED', message: json.error.message })
    }

    return c.ok({ signature: json.result! }, {
      cta: {
        commands: [
          { command: 'tx parse', args: { signature: json.result! }, description: 'Parse the transaction' },
        ],
      },
    })
  },
})
