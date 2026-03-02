import { z } from 'incur'

export const heliusEnv = z.object({
  HELIUS_API_KEY: z.string(),
  HELIUS_NETWORK: z.enum(['mainnet', 'devnet']).default('mainnet'),
})

export type HeliusEnv = z.output<typeof heliusEnv>
