import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

const accountItemSchema = z.object({
  pubkey: z.string(),
  lamports: z.number(),
  space: z.number(),
})

const program = Cli.create('program', {
  description: 'Program accounts — Helius enhanced endpoints (1 credit vs 10)',
  vars: heliusVars,
})

// ── accounts (getProgramAccountsV2) ──

program.command('accounts', {
  description: 'Get accounts owned by a program (paginated)',
  args: z.object({ programId: z.string() }),
  options: z.object({
    dataSize: z.coerce.number().optional(),
    limit: z.coerce.number().default(20),
  }),
  alias: { limit: 'l', dataSize: 'd' },
  output: z.object({
    count: z.number(),
    items: z.array(accountItemSchema),
    paginationKey: z.string().optional(),
  }),
  examples: [
    { args: { programId: '<program-id>' }, description: 'List program accounts' },
    { args: { programId: '<program-id>' }, options: { dataSize: 165 }, description: 'Filter by data size' },
  ],
  async run(c) {
    const config: Record<string, unknown> = { limit: c.options.limit }
    if (c.options.dataSize) config.filters = [{ dataSize: c.options.dataSize }]

    const result = (await c.var.rpc('getProgramAccountsV2', [
      c.args.programId,
      config,
    ])) as { accounts: any[]; paginationKey?: string; count?: number }

    const items = (result.accounts ?? []).map((a: any) => ({
      pubkey: (a.pubkey ?? a.address ?? '') as string,
      lamports: (a.account?.lamports ?? a.lamports ?? 0) as number,
      space: (a.account?.space ?? a.space ?? 0) as number,
    }))

    return c.ok({
      count: result.count ?? items.length,
      items,
      ...(result.paginationKey ? { paginationKey: result.paginationKey } : {}),
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'program accounts-all', description: 'Fetch all accounts with auto-pagination' },
        ],
      },
    })
  },
})

// ── accounts-all (auto-paginated getProgramAccountsV2) ──

program.command('accounts-all', {
  description: 'Get all accounts owned by a program (auto-paginates)',
  args: z.object({ programId: z.string() }),
  options: z.object({
    dataSize: z.coerce.number().optional(),
  }),
  alias: { dataSize: 'd' },
  output: z.object({
    total: z.number(),
    items: z.array(accountItemSchema),
  }),
  examples: [
    { args: { programId: '<program-id>' }, description: 'Fetch all program accounts' },
    { args: { programId: '<program-id>' }, options: { dataSize: 165 }, description: 'Filter by data size' },
  ],
  async run(c) {
    const config: Record<string, unknown> = { limit: 10000 }
    if (c.options.dataSize) config.filters = [{ dataSize: c.options.dataSize }]

    const allItems: { pubkey: string; lamports: number; space: number }[] = []
    let paginationKey: string | undefined

    do {
      const params: Record<string, unknown> = { ...config }
      if (paginationKey) params.after = paginationKey

      const result = (await c.var.rpc('getProgramAccountsV2', [
        c.args.programId,
        params,
      ])) as { accounts: any[]; paginationKey?: string }

      const accounts = result.accounts ?? []
      for (const a of accounts) {
        allItems.push({
          pubkey: (a.pubkey ?? a.address ?? '') as string,
          lamports: (a.account?.lamports ?? a.lamports ?? 0) as number,
          space: (a.account?.space ?? a.space ?? 0) as number,
        })
      }

      paginationKey = result.paginationKey
    } while (paginationKey)

    return c.ok({
      total: allItems.length,
      items: allItems,
    })
  },
})

// ── token-accounts (getTokenAccountsByOwnerV2) ──

program.command('token-accounts', {
  description: 'Get token accounts owned by an address',
  args: z.object({ owner: z.string() }),
  options: z.object({
    limit: z.coerce.number().default(20),
  }),
  alias: { limit: 'l' },
  output: z.object({
    count: z.number(),
    items: z.array(z.object({
      pubkey: z.string(),
      lamports: z.number(),
      space: z.number(),
    })),
  }),
  examples: [
    { args: { owner: '<wallet-address>' }, description: 'List token accounts for a wallet' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getTokenAccountsByOwnerV2', [
      c.args.owner,
      { programId: TOKEN_PROGRAM },
      { encoding: 'base64', limit: c.options.limit },
    ])) as { value: { accounts: any[] }; context?: any }

    const accounts = result.value?.accounts ?? []
    const items = accounts.map((a: any) => ({
      pubkey: (a.pubkey ?? '') as string,
      lamports: (a.account?.lamports ?? 0) as number,
      space: (a.account?.space ?? 0) as number,
    }))

    return c.ok({
      count: items.length,
      items,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'account tokens', description: 'View fungible token balances with names' },
        ],
      },
    })
  },
})

export { program }
