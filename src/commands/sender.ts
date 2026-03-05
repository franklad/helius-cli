import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

const send = Cli.create('send', {
  description: 'Send transactions — via Helius Sender, standard RPC, or simulate',
  vars: heliusVars,
})

// ── sender (Helius fast-send) ──

send.command('sender', {
  description: 'Send a transaction via Helius Sender (Jito tip required)',
  args: z.object({ transaction: z.string() }),
  options: z.object({
    swqosOnly: z.boolean().default(false),
    encoding: z.enum(['base64', 'base58']).default('base64'),
    skipPreflight: z.boolean().default(true),
    maxRetries: z.number().default(0),
  }),
  output: z.object({ signature: z.string() }),
  examples: [
    { args: { transaction: '<base64-tx>' }, description: 'Send via Helius Sender' },
    { args: { transaction: '<base58-tx>' }, options: { encoding: 'base58' }, description: 'Send base58-encoded' },
    { args: { transaction: '<base64-tx>' }, options: { swqosOnly: true }, description: 'Route via SWQOS only' },
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
          { command: 'send poll', args: { signature: json.result! }, description: 'Poll for confirmation' },
          { command: 'tx parse', args: { signature: json.result! }, description: 'Parse the transaction' },
        ],
      },
    })
  },
})

// ── broadcast (standard RPC sendTransaction) ──

send.command('broadcast', {
  description: 'Broadcast a transaction via standard RPC',
  args: z.object({ transaction: z.string() }),
  options: z.object({
    encoding: z.enum(['base64', 'base58']).default('base64'),
    skipPreflight: z.boolean().default(true),
    maxRetries: z.number().default(0),
  }),
  output: z.object({ signature: z.string() }),
  examples: [
    { args: { transaction: '<base64-tx>' }, description: 'Broadcast via standard RPC' },
  ],
  async run(c) {
    const signature = (await c.var.rpc('sendTransaction', [
      c.args.transaction,
      {
        encoding: c.options.encoding,
        skipPreflight: c.options.skipPreflight,
        maxRetries: c.options.maxRetries,
      },
    ])) as string

    return c.ok({ signature }, {
      cta: {
        commands: [
          { command: 'send poll', args: { signature }, description: 'Poll for confirmation' },
          { command: 'tx parse', args: { signature }, description: 'Parse the transaction' },
        ],
      },
    })
  },
})

// ── poll (wait for confirmation) ──

send.command('poll', {
  description: 'Poll a transaction signature until confirmed or timeout',
  args: z.object({ signature: z.string() }),
  options: z.object({
    commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
    timeout: z.coerce.number().default(60),
  }),
  alias: { commitment: 'c', timeout: 't' },
  output: z.object({
    signature: z.string(),
    status: z.string(),
    slot: z.number().optional(),
    err: z.unknown().optional(),
  }),
  examples: [
    { args: { signature: '<signature>' }, description: 'Wait for confirmation' },
    { args: { signature: '<signature>' }, options: { commitment: 'finalized', timeout: 120 }, description: 'Wait for finalization' },
  ],
  async run(c) {
    const deadline = Date.now() + c.options.timeout * 1000
    const target = c.options.commitment

    while (Date.now() < deadline) {
      const result = (await c.var.rpc('getSignatureStatuses', [
        [c.args.signature],
        { searchTransactionHistory: true },
      ])) as { value: (null | { slot: number; confirmationStatus: string; err: unknown })[] }

      const status = result.value?.[0]
      if (status) {
        const level = status.confirmationStatus
        const reached =
          target === 'processed' ? true :
          target === 'confirmed' ? level === 'confirmed' || level === 'finalized' :
          level === 'finalized'

        if (reached || status.err) {
          return c.ok({
            signature: c.args.signature,
            status: level,
            slot: status.slot,
            ...(status.err ? { err: status.err } : {}),
          }, {
            cta: {
              commands: [
                { command: 'tx parse', args: { signature: c.args.signature }, description: 'Parse the transaction' },
              ],
            },
          })
        }
      }

      await new Promise((r) => setTimeout(r, 2000))
    }

    return c.error({
      code: 'POLL_TIMEOUT',
      message: `Transaction not ${target} after ${c.options.timeout}s`,
      retryable: true,
    })
  },
})

// ── compute-units (simulate to estimate CU) ──

send.command('compute-units', {
  description: 'Simulate a transaction to estimate compute units',
  args: z.object({ transaction: z.string() }),
  options: z.object({
    encoding: z.enum(['base64', 'base58']).default('base64'),
  }),
  output: z.object({
    unitsConsumed: z.number(),
  }),
  examples: [
    { args: { transaction: '<base64-tx>' }, description: 'Estimate compute units' },
  ],
  async run(c) {
    const result = (await c.var.rpc('simulateTransaction', [
      c.args.transaction,
      { encoding: c.options.encoding, sigVerify: false },
    ])) as { value: { unitsConsumed?: number; err?: unknown; logs?: string[] } }

    if (result.value?.err) {
      return c.error({
        code: 'SIMULATION_FAILED',
        message: `Simulation failed: ${JSON.stringify(result.value.err)}`,
        retryable: false,
      })
    }

    return c.ok({
      unitsConsumed: result.value?.unitsConsumed ?? 0,
    }, {
      cta: {
        commands: [
          { command: 'send sender', description: 'Send the transaction' },
          { command: 'priority-fee', description: 'Check priority fee estimates' },
        ],
      },
    })
  },
})

export { send }
