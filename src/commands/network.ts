import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

export const network = Cli.create('network', {
  description: 'Current Solana network status — epoch, block height, version',
  vars: heliusVars,
  output: z.object({
    version: z.string(),
    blockHeight: z.number(),
    epoch: z.number(),
    slot: z.number(),
    slotIndex: z.number(),
    slotsInEpoch: z.number(),
    epochProgress: z.string(),
  }),
  examples: [
    { description: 'Check current network status' },
  ],
  async run(c) {
    const [epochInfo, version] = await Promise.all([
      c.var.rpc('getEpochInfo') as Promise<{
        epoch: number
        slotIndex: number
        slotsInEpoch: number
        absoluteSlot: number
        blockHeight: number
      }>,
      c.var.rpc('getVersion') as Promise<{ 'solana-core': string }>,
    ])

    const progress = ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2)

    return c.ok({
      version: version['solana-core'],
      blockHeight: epochInfo.blockHeight,
      epoch: epochInfo.epoch,
      slot: epochInfo.absoluteSlot,
      slotIndex: epochInfo.slotIndex,
      slotsInEpoch: epochInfo.slotsInEpoch,
      epochProgress: `${progress}%`,
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'status', description: 'Full health check' },
          { command: 'block', description: 'View block details by slot' },
        ],
      },
    })
  },
})
