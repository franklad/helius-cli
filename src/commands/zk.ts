import { Cli, z } from 'incur'
import { rpcCall } from '../client.js'
import { heliusEnv } from '../types.js'

const zk = Cli.create('zk', {
  description: 'ZK Compression — compressed accounts, tokens, proofs',
})

// ── getCompressedAccount ──

zk.command('get-account', {
  description: 'Get a compressed account by address or hash',
  options: z.object({
    address: z.string().optional(),
    hash: z.string().optional(),
  }),
  env: heliusEnv,
  output: z.object({
    hash: z.string(),
    owner: z.string(),
    lamports: z.number(),
    tree: z.string(),
    leafIndex: z.number(),
    slotCreated: z.number(),
  }),
  examples: [
    { options: { address: '<pubkey>' }, description: 'By address' },
    { options: { hash: '<hash>' }, description: 'By hash' },
  ],
  async run(c) {
    if (!c.options.address && !c.options.hash) {
      return c.error({ code: 'MISSING_PARAM', message: 'Provide --address or --hash' })
    }
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedAccount', {
      address: c.options.address ?? null,
      hash: c.options.hash ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      hash: v.hash,
      owner: v.owner,
      lamports: v.lamports,
      tree: v.tree,
      leafIndex: v.leafIndex,
      slotCreated: v.slotCreated,
    }, {
      cta: {
        commands: [
          { command: 'zk get-account-proof', description: 'Get merkle proof' },
          { command: 'zk get-balance', description: 'Get balance' },
        ],
      },
    })
  },
})

// ── getCompressedAccountProof ──

zk.command('get-account-proof', {
  description: 'Get merkle proof for a compressed account',
  args: z.object({ hash: z.string() }),
  env: heliusEnv,
  output: z.object({
    hash: z.string(),
    leafIndex: z.number(),
    merkleTree: z.string(),
    root: z.string(),
    rootSeq: z.number(),
    proof: z.array(z.string()),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedAccountProof', {
      hash: c.args.hash,
    })) as any
    const v = result.value ?? result
    return c.ok({
      hash: v.hash,
      leafIndex: v.leafIndex,
      merkleTree: v.merkleTree,
      root: v.root,
      rootSeq: v.rootSeq,
      proof: v.proof,
    })
  },
})

// ── getCompressedAccountsByOwner ──

zk.command('accounts-by-owner', {
  description: 'Get all compressed accounts for an owner',
  args: z.object({ owner: z.string() }),
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({
      hash: z.string(),
      owner: z.string(),
      lamports: z.number(),
      tree: z.string(),
      leafIndex: z.number(),
    })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedAccountsByOwner', {
      owner: c.args.owner,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        hash: i.hash, owner: i.owner, lamports: i.lamports, tree: i.tree, leafIndex: i.leafIndex,
      })),
    })
  },
})

// ── getCompressedBalance ──

zk.command('get-balance', {
  description: 'Get lamports balance of a compressed account',
  options: z.object({ address: z.string().optional(), hash: z.string().optional() }),
  env: heliusEnv,
  output: z.object({ balance: z.number() }),
  async run(c) {
    if (!c.options.address && !c.options.hash) {
      return c.error({ code: 'MISSING_PARAM', message: 'Provide --address or --hash' })
    }
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedBalance', {
      address: c.options.address ?? null,
      hash: c.options.hash ?? null,
    })) as any
    return c.ok({ balance: result.value ?? result })
  },
})

// ── getCompressedBalanceByOwner ──

zk.command('balance-by-owner', {
  description: 'Get total compressed balance for an owner',
  args: z.object({ owner: z.string() }),
  env: heliusEnv,
  output: z.object({ balance: z.number() }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedBalanceByOwner', {
      owner: c.args.owner,
    })) as any
    return c.ok({ balance: result.value ?? result })
  },
})

// ── getCompressedMintTokenHolders ──

zk.command('mint-holders', {
  description: 'List holders of a compressed token mint',
  args: z.object({ mint: z.string() }),
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ owner: z.string(), balance: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedMintTokenHolders', {
      mint: c.args.mint,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({ owner: i.owner, balance: i.balance })),
    })
  },
})

// ── getCompressedTokenAccountBalance ──

zk.command('token-balance', {
  description: 'Get balance of a compressed token account',
  options: z.object({ address: z.string().optional(), hash: z.string().optional() }),
  env: heliusEnv,
  output: z.object({ amount: z.number() }),
  async run(c) {
    if (!c.options.address && !c.options.hash) {
      return c.error({ code: 'MISSING_PARAM', message: 'Provide --address or --hash' })
    }
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedTokenAccountBalance', {
      address: c.options.address ?? null,
      hash: c.options.hash ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({ amount: v.amount ?? v })
  },
})

// ── getCompressedTokenAccountsByDelegate ──

zk.command('token-accounts-by-delegate', {
  description: 'Get compressed token accounts by delegate',
  args: z.object({ delegate: z.string() }),
  options: z.object({ mint: z.string().optional(), limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({
      hash: z.string(),
      owner: z.string(),
      mint: z.string(),
      amount: z.number(),
      state: z.string(),
    })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedTokenAccountsByDelegate', {
      delegate: c.args.delegate,
      mint: c.options.mint ?? null,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        hash: i.account?.hash ?? '',
        owner: i.tokenData?.owner ?? '',
        mint: i.tokenData?.mint ?? '',
        amount: i.tokenData?.amount ?? 0,
        state: i.tokenData?.state ?? '',
      })),
    })
  },
})

// ── getCompressedTokenAccountsByOwner ──

zk.command('token-accounts-by-owner', {
  description: 'Get compressed token accounts by owner',
  args: z.object({ owner: z.string() }),
  options: z.object({ mint: z.string().optional(), limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({
      hash: z.string(),
      owner: z.string(),
      mint: z.string(),
      amount: z.number(),
      state: z.string(),
    })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedTokenAccountsByOwner', {
      owner: c.args.owner,
      mint: c.options.mint ?? null,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        hash: i.account?.hash ?? '',
        owner: i.tokenData?.owner ?? '',
        mint: i.tokenData?.mint ?? '',
        amount: i.tokenData?.amount ?? 0,
        state: i.tokenData?.state ?? '',
      })),
    })
  },
})

// ── getCompressedTokenBalancesByOwner ──

zk.command('token-balances-by-owner', {
  description: 'Get all compressed token balances for an owner',
  args: z.object({ owner: z.string() }),
  options: z.object({ mint: z.string().optional(), limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ mint: z.string(), balance: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressedTokenBalancesByOwnerV2', {
      owner: c.args.owner,
      mint: c.options.mint ?? null,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? v.token_balances ?? []).map((i: any) => ({ mint: i.mint, balance: i.balance })),
    })
  },
})

// ── getCompressionSignaturesForAccount ──

zk.command('sigs-for-account', {
  description: 'Get tx signatures for a compressed account hash',
  args: z.object({ hash: z.string() }),
  env: heliusEnv,
  output: z.object({
    items: z.array(z.object({ signature: z.string(), slot: z.number(), blockTime: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressionSignaturesForAccount', {
      hash: c.args.hash,
    })) as any
    const v = result.value ?? result
    return c.ok({
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime,
      })),
    })
  },
})

// ── getCompressionSignaturesForAddress ──

zk.command('sigs-for-address', {
  description: 'Get tx signatures for an address',
  args: z.object({ address: z.string() }),
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ signature: z.string(), slot: z.number(), blockTime: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressionSignaturesForAddress', {
      address: c.args.address,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime,
      })),
    })
  },
})

// ── getCompressionSignaturesForOwner ──

zk.command('sigs-for-owner', {
  description: 'Get tx signatures where address is the owner',
  args: z.object({ owner: z.string() }),
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ signature: z.string(), slot: z.number(), blockTime: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressionSignaturesForOwner', {
      owner: c.args.owner,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime,
      })),
    })
  },
})

// ── getCompressionSignaturesForTokenOwner ──

zk.command('sigs-for-token-owner', {
  description: 'Get tx signatures for token transactions by owner',
  args: z.object({ owner: z.string() }),
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ signature: z.string(), slot: z.number(), blockTime: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getCompressionSignaturesForTokenOwner', {
      owner: c.args.owner,
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime,
      })),
    })
  },
})

// ── getIndexerHealth ──

zk.command('indexer-health', {
  description: 'Check ZK compression indexer health',
  env: heliusEnv,
  output: z.object({ status: z.string() }),
  async run(c) {
    const result = await rpcCall(c.env.HELIUS_API_KEY, 'getIndexerHealth')
    return c.ok({ status: String(result) })
  },
})

// ── getIndexerSlot ──

zk.command('indexer-slot', {
  description: 'Get current slot of the compression indexer',
  env: heliusEnv,
  output: z.object({ slot: z.number() }),
  async run(c) {
    const result = await rpcCall(c.env.HELIUS_API_KEY, 'getIndexerSlot')
    return c.ok({ slot: result as number })
  },
})

// ── getLatestCompressionSignatures ──

zk.command('latest-sigs', {
  description: 'Get most recent compression transaction signatures',
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({ signature: z.string(), slot: z.number(), blockTime: z.number() })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getLatestCompressionSignatures', {
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime,
      })),
    })
  },
})

// ── getLatestNonVotingSignatures ──

zk.command('latest-non-voting-sigs', {
  description: 'Get recent non-voting transaction signatures',
  options: z.object({ limit: z.number().optional(), cursor: z.string().optional() }),
  env: heliusEnv,
  output: z.object({
    cursor: z.string().optional(),
    items: z.array(z.object({
      signature: z.string(), slot: z.number(), blockTime: z.number(), error: z.string().optional(),
    })),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getLatestNonVotingSignatures', {
      limit: c.options.limit ?? null,
      cursor: c.options.cursor ?? null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      cursor: v.cursor,
      items: (v.items ?? []).map((i: any) => ({
        signature: i.signature, slot: i.slot, blockTime: i.blockTime, error: i.error ?? undefined,
      })),
    })
  },
})

// ── getMultipleCompressedAccountProofs ──

zk.command('get-multiple-proofs', {
  description: 'Batch-get merkle proofs for compressed accounts',
  args: z.object({ hashes: z.string() }),
  env: heliusEnv,
  output: z.array(z.object({
    hash: z.string(),
    leafIndex: z.number(),
    merkleTree: z.string(),
    root: z.string(),
    proof: z.array(z.string()),
  })),
  examples: [
    { args: { hashes: '<hash1>,<hash2>' }, description: 'Get multiple proofs' },
  ],
  async run(c) {
    const hashes = c.args.hashes.split(',').map((s) => s.trim())
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getMultipleCompressedAccountProofs', hashes)) as any
    const v = result.value ?? result
    return c.ok((Array.isArray(v) ? v : []).map((p: any) => ({
      hash: p.hash, leafIndex: p.leafIndex, merkleTree: p.merkleTree, root: p.root, proof: p.proof,
    })))
  },
})

// ── getMultipleCompressedAccounts ──

zk.command('get-multiple-accounts', {
  description: 'Get multiple compressed accounts by addresses or hashes',
  options: z.object({
    addresses: z.string().optional(),
    hashes: z.string().optional(),
  }),
  env: heliusEnv,
  output: z.object({
    items: z.array(z.object({
      hash: z.string(),
      owner: z.string(),
      lamports: z.number(),
      tree: z.string(),
      leafIndex: z.number(),
    })),
  }),
  async run(c) {
    if (!c.options.addresses && !c.options.hashes) {
      return c.error({ code: 'MISSING_PARAM', message: 'Provide --addresses or --hashes' })
    }
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getMultipleCompressedAccounts', {
      addresses: c.options.addresses ? c.options.addresses.split(',').map((s) => s.trim()) : null,
      hashes: c.options.hashes ? c.options.hashes.split(',').map((s) => s.trim()) : null,
    })) as any
    const v = result.value ?? result
    return c.ok({
      items: (v.items ?? []).map((i: any) => ({
        hash: i.hash, owner: i.owner, lamports: i.lamports, tree: i.tree, leafIndex: i.leafIndex,
      })),
    })
  },
})

// ── getMultipleNewAddressProofs ──

zk.command('new-address-proofs', {
  description: 'Get proofs for multiple new addresses',
  args: z.object({ addresses: z.string() }),
  env: heliusEnv,
  output: z.array(z.object({
    address: z.string(),
    root: z.string(),
    merkleTree: z.string(),
    nextIndex: z.number(),
    proof: z.array(z.string()),
  })),
  async run(c) {
    const addresses = c.args.addresses.split(',').map((s) => s.trim())
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getMultipleNewAddressProofs', addresses)) as any
    const v = result.value ?? result
    return c.ok((Array.isArray(v) ? v : []).map((p: any) => ({
      address: p.address, root: p.root, merkleTree: p.merkleTree, nextIndex: p.nextIndex, proof: p.proof,
    })))
  },
})

// ── getMultipleNewAddressProofsV2 ──

zk.command('new-address-proofs-v2', {
  description: 'Get proofs for new addresses with tree specification',
  args: z.object({ pairs: z.string() }),
  env: heliusEnv,
  output: z.array(z.object({
    address: z.string(),
    root: z.string(),
    merkleTree: z.string(),
    nextIndex: z.number(),
    proof: z.array(z.string()),
  })),
  examples: [
    { args: { pairs: '<addr1>:<tree1>,<addr2>:<tree2>' }, description: 'address:tree pairs' },
  ],
  async run(c) {
    const params = c.args.pairs.split(',').map((pair) => {
      const [address, tree] = pair.trim().split(':')
      return { address, tree }
    })
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getMultipleNewAddressProofsV2', params)) as any
    const v = result.value ?? result
    return c.ok((Array.isArray(v) ? v : []).map((p: any) => ({
      address: p.address, root: p.root, merkleTree: p.merkleTree, nextIndex: p.nextIndex, proof: p.proof,
    })))
  },
})

// ── getTransactionWithCompressionInfo ──

zk.command('tx-compression', {
  description: 'Get transaction with compression metadata',
  args: z.object({ signature: z.string() }),
  env: heliusEnv,
  output: z.object({
    closedAccounts: z.number(),
    openedAccounts: z.number(),
    signature: z.string(),
  }),
  async run(c) {
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getTransactionWithCompressionInfo', {
      signature: c.args.signature,
    })) as any
    const info = result.compression_info ?? result.compressionInfo ?? {}
    return c.ok({
      closedAccounts: (info.closedAccounts ?? []).length,
      openedAccounts: (info.openedAccounts ?? []).length,
      signature: c.args.signature,
    }, {
      cta: {
        commands: [
          { command: 'tx parse', args: { signature: c.args.signature }, description: 'Parse full transaction' },
        ],
      },
    })
  },
})

// ── getValidityProof ──

zk.command('validity-proof', {
  description: 'Get validity proof for compressed data',
  options: z.object({
    hashes: z.string().optional(),
    newAddresses: z.string().optional(),
  }),
  env: heliusEnv,
  output: z.object({
    compressedProof: z.object({ a: z.string(), b: z.string(), c: z.string() }),
    roots: z.array(z.string()),
    leafIndices: z.array(z.number()),
    leaves: z.array(z.string()),
    merkleTrees: z.array(z.string()),
  }),
  examples: [
    { options: { hashes: '<hash1>,<hash2>' }, description: 'Get validity proof for hashes' },
  ],
  async run(c) {
    const params: Record<string, unknown> = {
      hashes: c.options.hashes ? c.options.hashes.split(',').map((s) => s.trim()) : [],
      newAddressesWithTrees: c.options.newAddresses
        ? c.options.newAddresses.split(',').map((pair) => {
            const [address, tree] = pair.trim().split(':')
            return { address, tree }
          })
        : [],
    }
    const result = (await rpcCall(c.env.HELIUS_API_KEY, 'getValidityProof', params)) as any
    const v = result.value ?? result
    return c.ok({
      compressedProof: v.compressedProof,
      roots: v.roots ?? [],
      leafIndices: v.leafIndices ?? [],
      leaves: v.leaves ?? [],
      merkleTrees: v.merkleTrees ?? [],
    })
  },
})

export { zk }
