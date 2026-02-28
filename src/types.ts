import { z } from 'incur'

export const heliusEnv = z.object({
  HELIUS_API_KEY: z.string(),
})

export type HeliusEnv = z.output<typeof heliusEnv>
