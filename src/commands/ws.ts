import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

function wsUrl(c: { var: { network: string; apiKey: string } }): string {
  const host = c.var.network === 'devnet' ? 'devnet.helius-rpc.com' : 'mainnet.helius-rpc.com'
  return `wss://${host}/?api-key=${c.var.apiKey}`
}

function subscribe(
  url: string,
  method: string,
  params: unknown[],
  onNotification: (data: unknown) => void,
  options?: { once?: boolean },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let subscriptionId: number | null = null

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }))
    })

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data)) as any
      // Subscription confirmation
      if (msg.id === 1 && msg.result !== undefined) {
        subscriptionId = msg.result
        return
      }
      // Notification
      if (msg.method && msg.params?.result !== undefined) {
        onNotification(msg.params.result)
        if (options?.once) {
          ws.close()
          resolve()
        }
      }
    })

    ws.addEventListener('error', (event) => {
      reject(new Error(`WebSocket error: ${(event as any).message ?? 'connection failed'}`))
    })

    ws.addEventListener('close', () => {
      resolve()
    })

    const cleanup = () => {
      if (subscriptionId !== null) {
        const unsub = method.replace('Subscribe', 'Unsubscribe')
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: unsub, params: [subscriptionId] }))
      }
      ws.close()
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  })
}

const ws = Cli.create('ws', {
  description: 'WebSocket subscriptions — real-time streaming from Solana RPC',
  vars: heliusVars,
})

// ── account ──

ws.command('account', {
  description: 'Stream account change notifications',
  args: z.object({ address: z.string() }),
  options: z.object({
    commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  }),
  alias: { commitment: 'c' },
  output: z.object({
    lamports: z.number(),
    owner: z.string(),
    executable: z.boolean(),
    rentEpoch: z.number(),
    space: z.number(),
  }),
  examples: [
    { args: { address: '<address>' }, description: 'Stream changes to an account' },
  ],
  async *run(c) {
    const notifications: unknown[] = []
    let resolver: (() => void) | null = null

    const done = subscribe(
      wsUrl(c),
      'accountSubscribe',
      [c.args.address, { encoding: 'jsonParsed', commitment: c.options.commitment }],
      (data) => {
        notifications.push(data)
        resolver?.()
      },
    )

    const raceResult = { done: false }
    done.then(() => { raceResult.done = true; resolver?.() })

    while (!raceResult.done) {
      if (notifications.length === 0) {
        await new Promise<void>((r) => { resolver = r })
        resolver = null
      }
      while (notifications.length > 0) {
        const n = notifications.shift() as any
        const v = n?.value ?? n
        yield {
          lamports: (v?.lamports ?? 0) as number,
          owner: (v?.owner ?? '') as string,
          executable: (v?.executable ?? false) as boolean,
          rentEpoch: (v?.rentEpoch ?? 0) as number,
          space: (v?.space ?? v?.data?.space ?? 0) as number,
        }
      }
    }
  },
})

// ── logs ──

ws.command('logs', {
  description: 'Stream transaction log messages',
  options: z.object({
    mentions: z.string().optional(),
    commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  }),
  alias: { mentions: 'm', commitment: 'c' },
  output: z.object({
    signature: z.string(),
    err: z.unknown().optional(),
    logs: z.array(z.string()),
  }),
  examples: [
    { description: 'Stream all log messages' },
    { options: { mentions: '<program-id>' }, description: 'Filter by program' },
  ],
  async *run(c) {
    const filter = c.options.mentions
      ? { mentions: [c.options.mentions] }
      : 'all'

    const notifications: unknown[] = []
    let resolver: (() => void) | null = null

    const done = subscribe(
      wsUrl(c),
      'logsSubscribe',
      [filter, { commitment: c.options.commitment }],
      (data) => {
        notifications.push(data)
        resolver?.()
      },
    )

    const raceResult = { done: false }
    done.then(() => { raceResult.done = true; resolver?.() })

    while (!raceResult.done) {
      if (notifications.length === 0) {
        await new Promise<void>((r) => { resolver = r })
        resolver = null
      }
      while (notifications.length > 0) {
        const n = notifications.shift() as any
        const v = n?.value ?? n
        yield {
          signature: (v?.signature ?? '') as string,
          ...(v?.err ? { err: v.err } : {}),
          logs: (v?.logs ?? []) as string[],
        }
      }
    }
  },
})

// ── slot ──

ws.command('slot', {
  description: 'Stream slot updates',
  output: z.object({
    slot: z.number(),
    parent: z.number(),
    root: z.number(),
  }),
  examples: [
    { description: 'Stream slot updates' },
  ],
  async *run(c) {
    const notifications: unknown[] = []
    let resolver: (() => void) | null = null

    const done = subscribe(
      wsUrl(c),
      'slotSubscribe',
      [],
      (data) => {
        notifications.push(data)
        resolver?.()
      },
    )

    const raceResult = { done: false }
    done.then(() => { raceResult.done = true; resolver?.() })

    while (!raceResult.done) {
      if (notifications.length === 0) {
        await new Promise<void>((r) => { resolver = r })
        resolver = null
      }
      while (notifications.length > 0) {
        const n = notifications.shift() as any
        yield {
          slot: (n?.slot ?? 0) as number,
          parent: (n?.parent ?? 0) as number,
          root: (n?.root ?? 0) as number,
        }
      }
    }
  },
})

// ── signature ──

ws.command('signature', {
  description: 'Wait for a transaction signature to be confirmed, then exit',
  args: z.object({ signature: z.string() }),
  options: z.object({
    commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  }),
  alias: { commitment: 'c' },
  output: z.object({
    signature: z.string(),
    err: z.unknown().optional(),
  }),
  examples: [
    { args: { signature: '<signature>' }, description: 'Wait for confirmation' },
  ],
  async run(c) {
    let result: any = null

    await subscribe(
      wsUrl(c),
      'signatureSubscribe',
      [c.args.signature, { commitment: c.options.commitment }],
      (data) => { result = data },
      { once: true },
    )

    const v = result?.value ?? result
    if (v?.err) {
      return c.error({
        code: 'TX_ERROR',
        message: `Transaction failed: ${JSON.stringify(v.err)}`,
        retryable: false,
      })
    }

    return c.ok({
      signature: c.args.signature,
      ...(v?.err ? { err: v.err } : {}),
    }, {
      cta: {
        commands: [
          { command: 'tx parse', args: { signature: c.args.signature }, description: 'Parse the transaction' },
        ],
      },
    })
  },
})

// ── program ──

ws.command('program', {
  description: 'Stream program account change notifications',
  args: z.object({ programId: z.string() }),
  options: z.object({
    commitment: z.enum(['processed', 'confirmed', 'finalized']).default('confirmed'),
  }),
  alias: { commitment: 'c' },
  output: z.object({
    pubkey: z.string(),
    lamports: z.number(),
    owner: z.string(),
    space: z.number(),
  }),
  examples: [
    { args: { programId: '<program-id>' }, description: 'Stream program account changes' },
  ],
  async *run(c) {
    const notifications: unknown[] = []
    let resolver: (() => void) | null = null

    const done = subscribe(
      wsUrl(c),
      'programSubscribe',
      [c.args.programId, { encoding: 'jsonParsed', commitment: c.options.commitment }],
      (data) => {
        notifications.push(data)
        resolver?.()
      },
    )

    const raceResult = { done: false }
    done.then(() => { raceResult.done = true; resolver?.() })

    while (!raceResult.done) {
      if (notifications.length === 0) {
        await new Promise<void>((r) => { resolver = r })
        resolver = null
      }
      while (notifications.length > 0) {
        const n = notifications.shift() as any
        const v = n?.value ?? n
        const acct = v?.account ?? v
        yield {
          pubkey: (n?.pubkey ?? v?.pubkey ?? '') as string,
          lamports: (acct?.lamports ?? 0) as number,
          owner: (acct?.owner ?? '') as string,
          space: (acct?.space ?? acct?.data?.space ?? 0) as number,
        }
      }
    }
  },
})

export { ws }
