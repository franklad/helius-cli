import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

export const status = Cli.create('status', {
  description: 'Health check for all Helius services',
  vars: heliusVars,
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
    const [health, slot, samples, senderOk] = await Promise.all([
      c.var.rpc('getHealth').then(() => true).catch(() => false),
      c.var.rpc('getSlot') as Promise<number>,
      c.var.rpc('getRecentPerformanceSamples', [1]) as Promise<
        { numTransactions: number; samplePeriodSecs: number }[]
      >,
      fetch(`https://sender.helius-rpc.com/ping?api-key=${c.var.apiKey}`)
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
