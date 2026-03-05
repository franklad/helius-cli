import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

const tx = Cli.create('tx', {
  description: 'Enhanced transactions — parse and history',
  vars: heliusVars,
})

// ── parse (getTransactions) ──

tx.command('parse', {
  description: 'Parse a single Solana transaction',
  args: z.object({ signature: z.string() }),
  output: z.object({
    type: z.string(),
    source: z.string(),
    description: z.string(),
    fee: z.number(),
    feePayer: z.string(),
    signature: z.string(),
    slot: z.number(),
    timestamp: z.number(),
    tokenTransfers: z.array(z.object({
      fromUserAccount: z.string().optional(),
      toUserAccount: z.string().optional(),
      mint: z.string(),
      tokenAmount: z.number(),
    })),
    nativeTransfers: z.array(z.object({
      fromUserAccount: z.string(),
      toUserAccount: z.string(),
      amount: z.number(),
    })),
    accountData: z.array(z.object({
      account: z.string(),
      nativeBalanceChange: z.number(),
      tokenBalanceChanges: z.array(z.unknown()),
    })),
  }),
  examples: [
    { args: { signature: '<tx-signature>' }, description: 'Parse a transaction' },
  ],
  async run(c) {
    const txs = (await c.var.rest('/v0/transactions', {
      body: { transactions: [c.args.signature] },
    })) as any[]

    if (!txs || txs.length === 0) {
      return c.error({
        code: 'TX_NOT_FOUND',
        message: `Transaction ${c.args.signature} not found or not yet parsed`,
        retryable: true,
      })
    }

    const t = txs[0]
    return c.ok({
      type: t.type ?? 'UNKNOWN',
      source: t.source ?? '',
      description: t.description ?? '',
      fee: t.fee ?? 0,
      feePayer: t.feePayer ?? '',
      signature: t.signature ?? c.args.signature,
      slot: t.slot ?? 0,
      timestamp: t.timestamp ?? 0,
      tokenTransfers: (t.tokenTransfers ?? []).map((tr: any) => ({
        fromUserAccount: tr.fromUserAccount,
        toUserAccount: tr.toUserAccount,
        mint: tr.mint,
        tokenAmount: tr.tokenAmount,
      })),
      nativeTransfers: (t.nativeTransfers ?? []).map((tr: any) => ({
        fromUserAccount: tr.fromUserAccount,
        toUserAccount: tr.toUserAccount,
        amount: tr.amount,
      })),
      accountData: (t.accountData ?? []).map((a: any) => ({
        account: a.account,
        nativeBalanceChange: a.nativeBalanceChange ?? 0,
        tokenBalanceChanges: a.tokenBalanceChanges ?? [],
      })),
    }, {
      cta: {
        description: 'Related commands:',
        commands: [
          { command: 'tx history', args: { address: t.feePayer }, description: 'View fee payer history' },
          { command: 'das assets', args: { address: t.feePayer }, description: 'View fee payer assets' },
        ],
      },
    })
  },
})

// ── history (getTransactionsByAddress) ──

tx.command('history', {
  description: 'Parsed transaction history for an address',
  args: z.object({ address: z.string() }),
  options: z.object({
    limit: z.number().default(10),
    before: z.string().optional(),
    after: z.string().optional(),
    type: z.string().optional(),
    source: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  output: z.object({
    type: z.string(),
    description: z.string(),
    fee: z.number(),
    signature: z.string(),
    timestamp: z.number(),
  }),
  examples: [
    { args: { address: '<wallet-address>' }, description: 'Recent transactions' },
    { args: { address: '<wallet-address>' }, options: { limit: 5, type: 'SWAP' }, description: 'Last 5 swaps' },
  ],
  async *run(c) {
    const params = new URLSearchParams()
    if (c.options.limit) params.set('limit', String(c.options.limit))
    if (c.options.before) params.set('before-signature', c.options.before)
    if (c.options.after) params.set('after-signature', c.options.after)
    if (c.options.type) params.set('type', c.options.type)
    if (c.options.source) params.set('source', c.options.source)
    if (c.options.sortOrder !== 'desc') params.set('sort-order', c.options.sortOrder)

    const qs = params.toString()
    const path = `/v0/addresses/${c.args.address}/transactions${qs ? `?${qs}` : ''}`

    const txs = (await c.var.rest(path, undefined)) as any[]

    for (const t of txs) {
      yield {
        type: t.type ?? 'UNKNOWN',
        description: t.description ?? '',
        fee: t.fee ?? 0,
        signature: t.signature ?? '',
        timestamp: t.timestamp ?? 0,
      }
    }
  },
})

export { tx }
