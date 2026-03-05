import { Cli, z } from 'incur'
import { heliusVars } from '../types.js'

export const priorityFee = Cli.create('priority-fee', {
  description: 'Priority fee estimates in microlamports',
  options: z.object({
    accounts: z.string().optional(),
    lookbackSlots: z.number().optional(),
    recommended: z.boolean().default(false),
    evaluateEmptySlotAsZero: z.boolean().default(false),
  }),
  alias: { accounts: 'a' },
  vars: heliusVars,
  output: z.object({
    min: z.number(),
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    veryHigh: z.number(),
    unsafeMax: z.number(),
  }),
  examples: [
    { description: 'Global fee estimate' },
    {
      options: { accounts: 'JUP6...abc,So11...def' },
      description: 'Fee estimate for specific accounts',
    },
  ],
  async run(c) {
    const options: Record<string, unknown> = { includeAllPriorityFeeLevels: true }
    if (c.options.lookbackSlots) options.lookbackSlots = c.options.lookbackSlots
    if (c.options.recommended) options.recommended = true
    if (c.options.evaluateEmptySlotAsZero) options.evaluateEmptySlotAsZero = true

    const params: Record<string, unknown> = { options }
    if (c.options.accounts) {
      params.accountKeys = c.options.accounts.split(',').map((s) => s.trim())
    }

    const result = (await c.var.rpc(
      'getPriorityFeeEstimate',
      [params],
    )) as { priorityFeeLevels: Record<string, number> }

    const levels = result.priorityFeeLevels

    return c.ok(
      {
        min: levels.min ?? 0,
        low: levels.low ?? 0,
        medium: levels.medium ?? 0,
        high: levels.high ?? 0,
        veryHigh: levels.veryHigh ?? 0,
        unsafeMax: levels.unsafeMax ?? 0,
      },
      {
        cta: {
          description: 'Related commands:',
          commands: [
            { command: 'status', description: 'Check RPC health and slot' },
            { command: 'tx parse', description: 'Parse a transaction' },
          ],
        },
      },
    )
  },
})
