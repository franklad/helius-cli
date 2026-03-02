import { Cli, z } from 'incur'
import { rpcCall } from '../client.js'
import { heliusEnv } from '../types.js'

export const mint = Cli.create('mint', {
  description: 'Mint a compressed NFT (deprecated — use ZK Compression API for new projects)',
  args: z.object({ to: z.string() }),
  options: z.object({
    name: z.string(),
    description: z.string(),
    symbol: z.string().default(''),
    uri: z.string().default(''),
    collection: z.string().optional(),
  }),
  env: heliusEnv,
  output: z.object({
    signature: z.string(),
    minted: z.boolean(),
    assetId: z.string(),
  }),
  examples: [
    {
      args: { to: '<recipient-address>' },
      options: { name: 'My NFT', description: 'A compressed NFT', symbol: 'MNFT' },
      description: 'Mint a compressed NFT',
    },
  ],
  async run(c) {
    const params: Record<string, unknown> = {
      name: c.options.name,
      description: c.options.description,
      symbol: c.options.symbol,
      owner: c.args.to,
      uri: c.options.uri,
    }
    if (c.options.collection) params.collection = c.options.collection

    const result = (await rpcCall(
      c.env,
      'mintCompressedNft',
      params,
    )) as { signature: string; minted: boolean; assetId: string }

    return c.ok(
      { signature: result.signature, minted: result.minted, assetId: result.assetId },
      {
        cta: {
          description: 'Next steps:',
          commands: [
            {
              command: 'das assets',
              args: { address: c.args.to },
              description: 'View recipient assets',
            },
            {
              command: 'tx parse',
              args: { signature: result.signature },
              description: 'Parse the mint transaction',
            },
          ],
        },
      },
    )
  },
})
