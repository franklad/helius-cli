import { z } from 'incur'

export const heliusEnv = z.object({
  HELIUS_API_KEY: z.string().default(''),
  HELIUS_NETWORK: z.enum(['mainnet', 'devnet']).default('mainnet'),
})

export type HeliusEnv = z.output<typeof heliusEnv>

export const heliusVars = z.object({
  rpc: z.custom<(method: string, params?: unknown[] | Record<string, unknown>) => Promise<unknown>>(),
  rest: z.custom<(path: string, options?: { method?: string; body?: unknown }) => Promise<unknown>>(),
  wallet: z.custom<(path: string, options?: { method?: string; body?: unknown }) => Promise<unknown>>(),
  webhook: z.custom<(path: string, options?: { method?: string; body?: unknown }) => Promise<unknown>>(),
  apiKey: z.custom<string>(),
  network: z.custom<string>(),
})
