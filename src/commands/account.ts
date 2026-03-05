import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

const account = Cli.create('account', {
  description: 'Account info, balances, and token holders',
  vars: heliusVars,
})

// ── account info ──

account.command('info', {
  description: 'Get account info for a Solana address',
  args: z.object({ address: z.string() }),
  output: z.object({
    owner: z.string(),
    lamports: z.number(),
    sol: z.number(),
    dataSize: z.number(),
    executable: z.boolean(),
    rentEpoch: z.number(),
  }),
  examples: [
    { args: { address: '<address>' }, description: 'View account details' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getAccountInfo', [
      c.args.address,
      { encoding: 'jsonParsed' },
    ])) as { value: any } | null

    if (!result?.value) {
      return c.error({
        code: 'ACCOUNT_NOT_FOUND',
        message: `Account not found: ${c.args.address}`,
        retryable: false,
      })
    }

    const info = result.value
    return c.ok({
      owner: info.owner as string,
      lamports: info.lamports as number,
      sol: (info.lamports as number) / 1e9,
      dataSize: (info.data?.space ?? 0) as number,
      executable: info.executable as boolean,
      rentEpoch: info.rentEpoch as number,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'account balance', args: { address: c.args.address }, description: 'Check SOL balance' },
          { command: 'account tokens', args: { address: c.args.address }, description: 'View token balances' },
        ],
      },
    })
  },
})

// ── balance ──

account.command('balance', {
  description: 'Get SOL balance for an address',
  args: z.object({ address: z.string() }),
  output: z.object({
    lamports: z.number(),
    sol: z.number(),
  }),
  examples: [
    { args: { address: '<address>' }, description: 'Check SOL balance' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getBalance', [c.args.address])) as { value: number }
    const lamports = result.value

    return c.ok({
      lamports,
      sol: lamports / 1e9,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'account tokens', args: { address: c.args.address }, description: 'View token balances' },
          { command: 'account info', args: { address: c.args.address }, description: 'Full account info' },
        ],
      },
    })
  },
})

// ── tokens (fungible token balances) ──

account.command('tokens', {
  description: 'Get fungible token balances for an address',
  args: z.object({ address: z.string() }),
  options: z.object({
    page: z.number().default(1),
    limit: z.number().default(20),
  }),
  alias: { page: 'p', limit: 'l' },
  output: z.object({
    total: z.number(),
    items: z.array(z.object({
      mint: z.string(),
      name: z.string(),
      symbol: z.string(),
      amount: z.number(),
      decimals: z.number(),
    })),
  }),
  examples: [
    { args: { address: '<address>' }, description: 'List token balances' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getAssetsByOwner', {
      ownerAddress: c.args.address,
      page: c.options.page,
      limit: c.options.limit,
      displayOptions: { showFungible: true },
    })) as { total: number; items: any[] }

    const tokens = result.items
      .filter((item: any) =>
        item.interface === 'FungibleToken' || item.interface === 'FungibleAsset',
      )
      .map((item: any) => ({
        mint: item.id as string,
        name: (item.content?.metadata?.name ?? 'Unknown') as string,
        symbol: (item.content?.metadata?.symbol ?? '') as string,
        amount: (item.token_info?.balance ?? 0) / Math.pow(10, item.token_info?.decimals ?? 0),
        decimals: (item.token_info?.decimals ?? 0) as number,
      }))

    return c.ok({
      total: tokens.length,
      items: tokens,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'account balance', args: { address: c.args.address }, description: 'Check SOL balance' },
          { command: 'account token-holders', description: 'View holders of a token mint' },
        ],
      },
    })
  },
})

// ── token-holders ──

account.command('token-holders', {
  description: 'Get top token holders for a mint address',
  args: z.object({ mint: z.string() }),
  options: z.object({
    page: z.number().default(1),
    limit: z.number().default(20),
  }),
  alias: { page: 'p', limit: 'l' },
  output: z.object({
    total: z.number(),
    items: z.array(z.object({
      owner: z.string(),
      amount: z.number(),
    })),
  }),
  examples: [
    { args: { mint: '<mint-address>' }, description: 'View top holders of a token' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getTokenAccounts', {
      mint: c.args.mint,
      page: c.options.page,
      limit: c.options.limit,
    })) as { total: number; token_accounts: any[] }

    const items = (result.token_accounts ?? []).map((acct: any) => ({
      owner: acct.owner as string,
      amount: (acct.amount ?? 0) as number,
    }))

    return c.ok({
      total: result.total ?? items.length,
      items,
    })
  },
})

export { account }
