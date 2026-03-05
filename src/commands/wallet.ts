import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

const wallet = Cli.create('wallet', {
  description: 'Wallet API — balances, history, transfers, identity',
  vars: heliusVars,
})

// ── identity ──

wallet.command('identity', {
  description: 'Get identity info for a wallet address',
  args: z.object({ address: z.string() }),
  output: z.object({
    address: z.string(),
    type: z.string(),
    name: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
  }),
  examples: [
    { args: { address: '<wallet-address>' }, description: 'Look up wallet identity' },
  ],
  async run(c) {
    const result = (await c.var.wallet(
      `/v1/wallet/${c.args.address}/identity`,
    )) as any

    return c.ok({
      address: result.address ?? c.args.address,
      type: result.type ?? '',
      name: result.name ?? '',
      category: result.category ?? '',
      tags: result.tags ?? [],
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'wallet balances', args: { address: c.args.address }, description: 'View balances' },
          { command: 'wallet history', args: { address: c.args.address }, description: 'View history' },
        ],
      },
    })
  },
})

// ── batch-identity ──

wallet.command('batch-identity', {
  description: 'Batch identity lookup for multiple addresses',
  args: z.object({ addresses: z.string() }),
  output: z.array(z.object({
    address: z.string(),
    type: z.string(),
    name: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
  })),
  examples: [
    { args: { addresses: '<addr1>,<addr2>' }, description: 'Batch lookup (max 100)' },
  ],
  async run(c) {
    const addresses = c.args.addresses.split(',').map((s) => s.trim())
    const result = (await c.var.wallet('/v1/wallet/batch-identity', {
      body: { addresses },
    })) as any[]

    return c.ok((result ?? []).map((r: any) => ({
      address: r.address ?? '',
      type: r.type ?? '',
      name: r.name ?? '',
      category: r.category ?? '',
      tags: r.tags ?? [],
    })), {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'wallet identity', description: 'Look up a single wallet' },
        ],
      },
    })
  },
})

// ── balances ──

wallet.command('balances', {
  description: 'Get all token balances with USD values',
  args: z.object({ address: z.string() }),
  options: z.object({
    page: z.number().default(1),
    limit: z.number().default(100),
    showZeroBalance: z.boolean().default(false),
    showNative: z.boolean().default(true),
    showNfts: z.boolean().default(false),
  }),
  alias: { page: 'p', limit: 'l' },
  output: z.object({
    totalUsdValue: z.number(),
    hasMore: z.boolean(),
    balances: z.array(z.object({
      mint: z.string(),
      symbol: z.string(),
      name: z.string(),
      balance: z.number(),
      decimals: z.number(),
      pricePerToken: z.number().optional(),
      usdValue: z.number().optional(),
    })),
    nfts: z.array(z.object({
      mint: z.string(),
      name: z.string(),
      collectionName: z.string().optional(),
    })).optional(),
  }),
  examples: [
    { args: { address: '<wallet>' }, description: 'View token balances' },
    { args: { address: '<wallet>' }, options: { showNfts: true }, description: 'Include NFTs' },
  ],
  async run(c) {
    const params = new URLSearchParams({
      page: String(c.options.page),
      limit: String(c.options.limit),
      showZeroBalance: String(c.options.showZeroBalance),
      showNative: String(c.options.showNative),
      showNfts: String(c.options.showNfts),
    })

    const result = (await c.var.wallet(
      `/v1/wallet/${c.args.address}/balances?${params}`,
    )) as any

    return c.ok({
      totalUsdValue: result.totalUsdValue ?? 0,
      hasMore: result.pagination?.hasMore ?? false,
      balances: (result.balances ?? []).map((b: any) => ({
        mint: b.mint as string,
        symbol: (b.symbol ?? '') as string,
        name: (b.name ?? '') as string,
        balance: b.balance as number,
        decimals: b.decimals as number,
        pricePerToken: b.pricePerToken as number | undefined,
        usdValue: b.usdValue as number | undefined,
      })),
      nfts: c.options.showNfts
        ? (result.nfts ?? []).map((n: any) => ({
            mint: n.mint as string,
            name: (n.name ?? '') as string,
            collectionName: n.collectionName as string | undefined,
          }))
        : undefined,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'wallet history', args: { address: c.args.address }, description: 'View tx history' },
          { command: 'wallet transfers', args: { address: c.args.address }, description: 'View transfers' },
          { command: 'wallet identity', args: { address: c.args.address }, description: 'Look up identity' },
        ],
      },
    })
  },
})

// ── history ──

wallet.command('history', {
  description: 'Transaction history with balance changes',
  args: z.object({ address: z.string() }),
  options: z.object({
    limit: z.number().default(20),
    before: z.string().optional(),
    after: z.string().optional(),
    type: z.string().optional(),
    tokenAccounts: z.enum(['none', 'balanceChanged', 'all']).default('balanceChanged'),
  }),
  alias: { limit: 'l', before: 'b', after: 'a', type: 't' },
  output: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().optional(),
    data: z.array(z.object({
      signature: z.string(),
      timestamp: z.number().optional(),
      slot: z.number(),
      fee: z.number(),
      feePayer: z.string(),
      error: z.string().optional(),
      balanceChanges: z.array(z.object({
        mint: z.string(),
        amount: z.number(),
        decimals: z.number(),
      })),
    })),
  }),
  examples: [
    { args: { address: '<wallet>' }, description: 'Recent history' },
    { args: { address: '<wallet>' }, options: { type: 'SWAP', limit: 5 }, description: 'Last 5 swaps' },
  ],
  async run(c) {
    const params = new URLSearchParams({ limit: String(c.options.limit) })
    if (c.options.before) params.set('before', c.options.before)
    if (c.options.after) params.set('after', c.options.after)
    if (c.options.type) params.set('type', c.options.type)
    if (c.options.tokenAccounts !== 'balanceChanged') params.set('tokenAccounts', c.options.tokenAccounts)

    const result = (await c.var.wallet(
      `/v1/wallet/${c.args.address}/history?${params}`,
    )) as any

    return c.ok({
      hasMore: result.pagination?.hasMore ?? false,
      nextCursor: result.pagination?.nextCursor as string | undefined,
      data: (result.data ?? []).map((tx: any) => ({
        signature: tx.signature as string,
        timestamp: tx.timestamp as number | undefined,
        slot: tx.slot as number,
        fee: tx.fee as number,
        feePayer: tx.feePayer as string,
        error: tx.error as string | undefined,
        balanceChanges: (tx.balanceChanges ?? []).map((bc: any) => ({
          mint: bc.mint as string,
          amount: bc.amount as number,
          decimals: bc.decimals as number,
        })),
      })),
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'tx parse', description: 'Parse a specific transaction' },
          { command: 'wallet balances', args: { address: c.args.address }, description: 'View balances' },
        ],
      },
    })
  },
})

// ── transfers ──

wallet.command('transfers', {
  description: 'Token transfer activity with sender/recipient',
  args: z.object({ address: z.string() }),
  options: z.object({
    limit: z.number().default(50),
    cursor: z.string().optional(),
  }),
  alias: { limit: 'l', cursor: 'c' },
  output: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().optional(),
    data: z.array(z.object({
      signature: z.string(),
      timestamp: z.number(),
      direction: z.string(),
      counterparty: z.string(),
      mint: z.string(),
      symbol: z.string().optional(),
      amount: z.number(),
      decimals: z.number(),
    })),
  }),
  examples: [
    { args: { address: '<wallet>' }, description: 'Recent transfers' },
  ],
  async run(c) {
    const params = new URLSearchParams({ limit: String(c.options.limit) })
    if (c.options.cursor) params.set('cursor', c.options.cursor)

    const result = (await c.var.wallet(
      `/v1/wallet/${c.args.address}/transfers?${params}`,
    )) as any

    return c.ok({
      hasMore: result.pagination?.hasMore ?? false,
      nextCursor: result.pagination?.nextCursor as string | undefined,
      data: (result.data ?? []).map((t: any) => ({
        signature: t.signature as string,
        timestamp: t.timestamp as number,
        direction: t.direction as string,
        counterparty: t.counterparty as string,
        mint: t.mint as string,
        symbol: t.symbol as string | undefined,
        amount: t.amount as number,
        decimals: t.decimals as number,
      })),
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'tx parse', description: 'Parse a specific transfer' },
          { command: 'wallet balances', args: { address: c.args.address }, description: 'View balances' },
        ],
      },
    })
  },
})

// ── funded-by ──

wallet.command('funded-by', {
  description: 'Find the original funding source of a wallet',
  args: z.object({ address: z.string() }),
  output: z.object({
    funder: z.string(),
    funderName: z.string().optional(),
    funderType: z.string().optional(),
    mint: z.string(),
    symbol: z.string(),
    amount: z.number(),
    decimals: z.number(),
    signature: z.string(),
    timestamp: z.number(),
    slot: z.number(),
  }),
  examples: [
    { args: { address: '<wallet>' }, description: 'Find who funded this wallet' },
  ],
  async run(c) {
    const result = (await c.var.wallet(
      `/v1/wallet/${c.args.address}/funded-by`,
    )) as any

    return c.ok({
      funder: result.funder as string,
      funderName: result.funderName as string | undefined,
      funderType: result.funderType as string | undefined,
      mint: (result.mint ?? '') as string,
      symbol: (result.symbol ?? '') as string,
      amount: result.amount as number,
      decimals: (result.decimals ?? 0) as number,
      signature: result.signature as string,
      timestamp: result.timestamp as number,
      slot: result.slot as number,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'wallet identity', args: { address: result.funder }, description: 'Look up funder' },
          { command: 'wallet balances', args: { address: c.args.address }, description: 'View balances' },
        ],
      },
    })
  },
})

export { wallet }
