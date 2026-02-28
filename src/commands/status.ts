import { Cli, z } from 'incur'
import { rpcCall } from '../client.js'
import { heliusEnv } from '../types.js'

export const status = Cli.create('status', {
  description: 'Health check for all Helius services',
  env: heliusEnv,
  output: z.object({
    rpc: z.object({
      healthy: z.boolean(),
      slot: z.number(),
      tps: z.number(),
    }),
    sender: z.object({
      healthy: z.boolean(),
    }),
  }),
  examples: [{ description: 'Check all Helius services' }],
  async run(c) {
    const key = c.env.HELIUS_API_KEY
    const [health, slot, samples, senderOk] = await Promise.all([
      rpcCall(key, 'getHealth').then(() => true).catch(() => false),
      rpcCall(key, 'getSlot') as Promise<number>,
      rpcCall(key, 'getRecentPerformanceSamples', [1]) as Promise<
        { numTransactions: number; samplePeriodSecs: number }[]
      >,
      fetch(`https://sender.helius-rpc.com/ping?api-key=${key}`)
        .then((r) => r.ok)
        .catch(() => false),
    ])

    const tps =
      samples.length > 0
        ? Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs)
        : 0

    return c.ok({
      rpc: { healthy: health, slot, tps },
      sender: { healthy: senderOk },
    }, {
      cta: {
        description: 'Explore further:',
        commands: [
          { command: 'das assets', description: 'View assets for an address' },
          { command: 'priority-fee', description: 'Check priority fee estimates' },
        ],
      },
    })
  },
})
