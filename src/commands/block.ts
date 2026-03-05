import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

export const block = Cli.create('block', {
  description: 'Get block details by slot number',
  args: z.object({ slot: z.coerce.number() }),
  vars: heliusVars,
  output: z.object({
    blockhash: z.string(),
    parentSlot: z.number(),
    blockTime: z.number().nullable(),
    blockHeight: z.number().nullable(),
    transactionCount: z.number(),
  }),
  examples: [
    { args: { slot: 250000000 }, description: 'View block details for a slot' },
  ],
  async run(c) {
    const result = (await c.var.rpc('getBlock', [
      c.args.slot,
      { transactionDetails: 'signatures', rewards: false, maxSupportedTransactionVersion: 0 },
    ])) as any

    if (!result) {
      return c.error({
        code: 'BLOCK_NOT_FOUND',
        message: `Block not found for slot ${c.args.slot}`,
        retryable: false,
      })
    }

    return c.ok({
      blockhash: result.blockhash as string,
      parentSlot: result.parentSlot as number,
      blockTime: (result.blockTime ?? null) as number | null,
      blockHeight: (result.blockHeight ?? null) as number | null,
      transactionCount: (result.signatures?.length ?? 0) as number,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'network', description: 'Check current network status' },
        ],
      },
    })
  },
})
