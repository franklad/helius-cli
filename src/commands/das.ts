import { Cli, z } from 'incur'
import { rpcCall } from '../client.js'
import { heliusEnv } from '../types.js'

function mapAsset(item: any) {
  return {
    id: item.id as string,
    name: (item.content?.metadata?.name ?? item.id) as string,
    type: (item.interface ?? 'unknown') as string,
    collection: item.grouping?.find((g: any) => g.group_key === 'collection')
      ?.group_value as string | undefined,
    image: (item.content?.links?.image ?? item.content?.files?.[0]?.uri) as
      | string
      | undefined,
    owner: item.ownership?.owner as string | undefined,
    compressed: item.compression?.compressed as boolean | undefined,
    burnt: item.burnt as boolean | undefined,
  }
}

const assetItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  collection: z.string().optional(),
  image: z.string().optional(),
  owner: z.string().optional(),
  compressed: z.boolean().optional(),
  burnt: z.boolean().optional(),
})

const paginatedAssetsSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  items: z.array(assetItemSchema),
})

const das = Cli.create('das', {
  description: 'Digital Asset Standard — assets, proofs, search, token accounts',
})

// ── assets (getAssetsByOwner) ──

das.command('assets', {
  description: 'Get assets owned by an address',
  args: z.object({ address: z.string() }),
  options: z.object({
    page: z.number().default(1),
    limit: z.number().default(20),
    showFungible: z.boolean().default(false),
    showNativeBalance: z.boolean().default(false),
  }),
  env: heliusEnv,
  output: z.object({
    total: z.number(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      collection: z.string().optional(),
      image: z.string().optional(),
    })),
  }),
  examples: [
    { args: { address: '<wallet-address>' }, description: 'List NFTs for a wallet' },
    { args: { address: '<wallet-address>' }, options: { showFungible: true, limit: 50 }, description: 'Include fungible tokens' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAssetsByOwner', {
      ownerAddress: c.args.address,
      page: c.options.page,
      limit: c.options.limit,
      options: {
        showFungible: c.options.showFungible,
        showNativeBalance: c.options.showNativeBalance,
      },
    })) as { total: number; items: any[] }

    const items = result.items.map(mapAsset)

    return c.ok({ total: result.total, items }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'tx history', args: { address: c.args.address }, description: 'View transaction history' },
          { command: 'das search', description: 'Search assets by collection or creator' },
        ],
      },
    })
  },
})

// ── search (searchAssets) ──

das.command('search', {
  description: 'Search assets by owner, collection, or creator',
  options: z.object({
    owner: z.string().optional(),
    collection: z.string().optional(),
    creator: z.string().optional(),
    compressed: z.boolean().optional(),
    page: z.number().default(1),
    limit: z.number().default(20),
  }),
  env: heliusEnv,
  output: z.object({
    total: z.number(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      collection: z.string().optional(),
      image: z.string().optional(),
    })),
  }),
  examples: [
    { options: { owner: '<wallet-address>' }, description: 'Search by owner' },
    { options: { collection: '<collection-address>', limit: 10 }, description: 'Search by collection' },
  ],
  async run(c) {
    const params: Record<string, unknown> = {
      page: c.options.page,
      limit: c.options.limit,
    }
    if (c.options.owner) params.ownerAddress = c.options.owner
    if (c.options.collection) params.grouping = ['collection', c.options.collection]
    if (c.options.creator) params.creatorAddress = c.options.creator
    if (c.options.compressed !== undefined) params.compressed = c.options.compressed

    const result = (await rpcCall(c.env, 'searchAssets', params)) as { total: number; items: any[] }

    const items = result.items.map(mapAsset)

    return c.ok({ total: result.total, items }, {
      cta: {
        description: 'Next steps:',
        commands: [
          ...(c.options.owner
            ? [{ command: 'das assets' as const, args: { address: c.options.owner }, description: 'View all assets' }]
            : []),
          { command: 'das get', description: 'View a specific asset' },
        ],
      },
    })
  },
})

// ── get (getAsset) ──

das.command('get', {
  description: 'Get details for a single asset by ID',
  args: z.object({ id: z.string() }),
  env: heliusEnv,
  output: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    collection: z.string().optional(),
    image: z.string().optional(),
    owner: z.string().optional(),
    compressed: z.boolean().optional(),
    burnt: z.boolean().optional(),
    mutable: z.boolean().optional(),
    supply: z.number().optional(),
    royaltyPercent: z.number().optional(),
    creators: z.array(z.object({
      address: z.string(),
      share: z.number(),
      verified: z.boolean(),
    })).optional(),
  }),
  examples: [
    { args: { id: '<asset-mint-address>' }, description: 'Get asset details' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAsset', { id: c.args.id })) as any

    return c.ok({
      ...mapAsset(result),
      mutable: result.mutable as boolean | undefined,
      supply: result.supply?.print_current_supply as number | undefined,
      royaltyPercent: result.royalty?.percent as number | undefined,
      creators: result.creators?.map((cr: any) => ({
        address: cr.address as string,
        share: cr.share as number,
        verified: cr.verified as boolean,
      })),
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'das proof', args: { id: c.args.id }, description: 'Get merkle proof' },
          { command: 'das signatures', args: { id: c.args.id }, description: 'Get tx signatures' },
        ],
      },
    })
  },
})

// ── get-batch (getAssetBatch) ──

das.command('get-batch', {
  description: 'Get details for multiple assets by IDs',
  args: z.object({ ids: z.string() }),
  env: heliusEnv,
  output: z.array(assetItemSchema),
  examples: [
    { args: { ids: '<id1>,<id2>,<id3>' }, description: 'Get multiple assets' },
  ],
  async run(c) {
    const ids = c.args.ids.split(',').map((s) => s.trim())
    const result = (await rpcCall(c.env, 'getAssetBatch', { ids })) as any[]

    return c.ok(result.map(mapAsset), {
      cta: {
        commands: [
          { command: 'das get', description: 'Get details for a single asset' },
          { command: 'das search', description: 'Search assets' },
        ],
      },
    })
  },
})

// ── proof (getAssetProof) ──

das.command('proof', {
  description: 'Get merkle proof for a compressed asset',
  args: z.object({ id: z.string() }),
  env: heliusEnv,
  output: z.object({
    root: z.string(),
    proof: z.array(z.string()),
    nodeIndex: z.number(),
    leaf: z.string(),
    treeId: z.string(),
  }),
  examples: [
    { args: { id: '<compressed-asset-id>' }, description: 'Get merkle proof' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAssetProof', { id: c.args.id })) as any

    return c.ok({
      root: result.root,
      proof: result.proof,
      nodeIndex: result.node_index,
      leaf: result.leaf,
      treeId: result.tree_id,
    }, {
      cta: {
        commands: [{ command: 'das get', args: { id: c.args.id }, description: 'View asset details' }],
      },
    })
  },
})

// ── proof-batch (getAssetProofBatch) ──

das.command('proof-batch', {
  description: 'Get merkle proofs for multiple compressed assets',
  args: z.object({ ids: z.string() }),
  env: heliusEnv,
  output: z.array(z.object({
    id: z.string(),
    root: z.string(),
    proof: z.array(z.string()),
    nodeIndex: z.number(),
    leaf: z.string(),
    treeId: z.string(),
  })),
  examples: [
    { args: { ids: '<id1>,<id2>' }, description: 'Get proofs for multiple assets' },
  ],
  async run(c) {
    const ids = c.args.ids.split(',').map((s) => s.trim())
    const result = (await rpcCall(c.env, 'getAssetProofBatch', { ids })) as Record<string, any>

    return c.ok(Object.entries(result).map(([id, p]) => ({
      id,
      root: p.root as string,
      proof: p.proof as string[],
      nodeIndex: p.node_index as number,
      leaf: p.leaf as string,
      treeId: p.tree_id as string,
    })), {
      cta: {
        commands: [{ command: 'das get-batch', description: 'View asset details' }],
      },
    })
  },
})

// ── by-authority (getAssetsByAuthority) ──

das.command('by-authority', {
  description: 'Get assets controlled by an authority address',
  args: z.object({ authority: z.string() }),
  options: z.object({ page: z.number().default(1), limit: z.number().default(20) }),
  env: heliusEnv,
  output: paginatedAssetsSchema,
  examples: [
    { args: { authority: '<authority-address>' }, description: 'List by authority' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAssetsByAuthority', {
      authorityAddress: c.args.authority, page: c.options.page, limit: c.options.limit,
    })) as any

    return c.ok({
      total: result.total, page: result.page ?? c.options.page, limit: result.limit ?? c.options.limit,
      items: result.items.map(mapAsset),
    }, {
      cta: { commands: [{ command: 'das get', description: 'View a specific asset' }, { command: 'das search', description: 'Search assets' }] },
    })
  },
})

// ── by-creator (getAssetsByCreator) ──

das.command('by-creator', {
  description: 'Get assets created by a specific address',
  args: z.object({ creator: z.string() }),
  options: z.object({ page: z.number().default(1), limit: z.number().default(20) }),
  env: heliusEnv,
  output: paginatedAssetsSchema,
  examples: [
    { args: { creator: '<creator-address>' }, description: 'List by creator' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAssetsByCreator', {
      creatorAddress: c.args.creator, page: c.options.page, limit: c.options.limit,
    })) as any

    return c.ok({
      total: result.total, page: result.page ?? c.options.page, limit: result.limit ?? c.options.limit,
      items: result.items.map(mapAsset),
    }, {
      cta: { commands: [{ command: 'das get', description: 'View a specific asset' }, { command: 'das assets', description: 'List assets by owner' }] },
    })
  },
})

// ── by-group (getAssetsByGroup) ──

das.command('by-group', {
  description: 'Get assets in a group/collection',
  args: z.object({ groupValue: z.string() }),
  options: z.object({ groupKey: z.string().default('collection'), page: z.number().default(1), limit: z.number().default(20) }),
  env: heliusEnv,
  output: paginatedAssetsSchema,
  examples: [
    { args: { groupValue: '<collection-address>' }, description: 'List collection assets' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getAssetsByGroup', {
      groupKey: c.options.groupKey, groupValue: c.args.groupValue, page: c.options.page, limit: c.options.limit,
    })) as any

    return c.ok({
      total: result.total, page: result.page ?? c.options.page, limit: result.limit ?? c.options.limit,
      items: result.items.map(mapAsset),
    }, {
      cta: { commands: [{ command: 'das get', description: 'View a specific asset' }, { command: 'das search', description: 'Search assets' }] },
    })
  },
})

// ── editions (getNftEditions) ──

das.command('editions', {
  description: 'Get editions of a master NFT',
  args: z.object({ mint: z.string() }),
  options: z.object({ page: z.number().default(1), limit: z.number().default(20) }),
  env: heliusEnv,
  output: z.object({
    total: z.number(),
    masterEditionAddress: z.string(),
    supply: z.number(),
    maxSupply: z.number(),
    editions: z.array(z.object({ mint: z.string(), editionAddress: z.string(), edition: z.number(), burnt: z.boolean() })),
  }),
  examples: [
    { args: { mint: '<master-edition-mint>' }, description: 'List editions' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getNftEditions', {
      mint: c.args.mint, page: c.options.page, limit: c.options.limit,
    })) as any

    return c.ok({
      total: result.total ?? 0,
      masterEditionAddress: result.master_edition_address ?? '',
      supply: result.supply ?? 0,
      maxSupply: result.max_supply ?? 0,
      editions: (result.editions ?? []).map((e: any) => ({
        mint: e.mint as string, editionAddress: e.edition_address as string, edition: e.edition as number, burnt: (e.burnt ?? false) as boolean,
      })),
    }, {
      cta: { commands: [{ command: 'das get', args: { id: c.args.mint }, description: 'View master NFT' }] },
    })
  },
})

// ── signatures (getSignaturesForAsset) ──

das.command('signatures', {
  description: 'Get transaction signatures for an asset',
  args: z.object({ id: z.string() }),
  options: z.object({ page: z.number().default(1), limit: z.number().default(20) }),
  env: heliusEnv,
  output: z.object({
    total: z.number(),
    items: z.array(z.object({ signature: z.string(), type: z.string() })),
  }),
  examples: [
    { args: { id: '<asset-id>' }, description: 'Get signatures for asset' },
  ],
  async run(c) {
    const result = (await rpcCall(c.env, 'getSignaturesForAsset', {
      id: c.args.id, page: c.options.page, limit: c.options.limit,
    })) as any

    const items = (result.items ?? []).map((item: any) => {
      if (Array.isArray(item)) return { signature: item[0] as string, type: (item[1] ?? '') as string }
      return { signature: item.signature ?? '', type: item.type ?? '' }
    })

    return c.ok({ total: result.total ?? items.length, items }, {
      cta: {
        commands: [
          { command: 'tx parse', description: 'Parse a transaction' },
          { command: 'das get', args: { id: c.args.id }, description: 'View asset' },
        ],
      },
    })
  },
})

// ── token-accounts (getTokenAccounts) ──

das.command('token-accounts', {
  description: 'Get token accounts by owner or mint',
  options: z.object({
    owner: z.string().optional(),
    mint: z.string().optional(),
    page: z.number().default(1),
    limit: z.number().default(20),
    showZeroBalance: z.boolean().default(false),
  }),
  env: heliusEnv,
  output: z.object({
    total: z.number(),
    tokenAccounts: z.array(z.object({
      address: z.string(), mint: z.string(), owner: z.string(), amount: z.number(),
      delegatedAmount: z.number(), frozen: z.boolean(), burnt: z.boolean(),
    })),
  }),
  examples: [
    { options: { owner: '<wallet-address>' }, description: 'Token accounts by owner' },
    { options: { mint: '<mint-address>' }, description: 'Token accounts by mint' },
  ],
  async run(c) {
    if (!c.options.owner && !c.options.mint) {
      return c.error({ code: 'MISSING_PARAM', message: 'Provide --owner or --mint' })
    }
    const params: Record<string, unknown> = {
      page: c.options.page, limit: c.options.limit,
      options: { showZeroBalance: c.options.showZeroBalance },
    }
    if (c.options.owner) params.owner = c.options.owner
    if (c.options.mint) params.mint = c.options.mint

    const result = (await rpcCall(c.env, 'getTokenAccounts', params)) as any

    return c.ok({
      total: result.total ?? 0,
      tokenAccounts: (result.token_accounts ?? []).map((ta: any) => ({
        address: ta.address as string, mint: ta.mint as string, owner: ta.owner as string,
        amount: ta.amount as number, delegatedAmount: (ta.delegated_amount ?? 0) as number,
        frozen: (ta.frozen ?? false) as boolean, burnt: (ta.burnt ?? false) as boolean,
      })),
    }, {
      cta: { commands: [{ command: 'das assets', description: 'View assets by owner' }, { command: 'das get', description: 'View asset details' }] },
    })
  },
})

export { das }
