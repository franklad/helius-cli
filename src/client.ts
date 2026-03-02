import type { HeliusEnv } from './types.js'

type Network = 'mainnet' | 'devnet'

const BASES = {
  mainnet: {
    rpc: 'https://mainnet.helius-rpc.com',
    rest: 'https://api-mainnet.helius-rpc.com',
    wallet: 'https://api.helius.xyz',
  },
  devnet: {
    rpc: 'https://devnet.helius-rpc.com',
    rest: 'https://api-devnet.helius-rpc.com',
    wallet: 'https://api.helius.xyz',
  },
} as const

function net(env: HeliusEnv): Network {
  return env.HELIUS_NETWORK === 'devnet' ? 'devnet' : 'mainnet'
}

export async function rpcCall(
  env: HeliusEnv,
  method: string,
  params: unknown[] | Record<string, unknown> = [],
) {
  const url = `${BASES[net(env)].rpc}/?api-key=${env.HELIUS_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`RPC ${method} failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { result?: unknown; error?: { code: number; message: string } }
  if (json.error) {
    throw new Error(`RPC ${method} error ${json.error.code}: ${json.error.message}`)
  }

  return json.result
}

async function httpCall(
  base: string,
  apiKey: string,
  path: string,
  options?: { method?: string; body?: unknown },
) {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${base}${path}${separator}api-key=${apiKey}`
  const init: RequestInit = {
    method: options?.method ?? (options?.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json' },
  }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Helius ${init.method} ${path} failed (${res.status}): ${text}`)
  }

  if (res.status === 204) return undefined
  return res.json()
}

export function restCall(
  env: HeliusEnv,
  path: string,
  options?: { method?: string; body?: unknown },
) {
  return httpCall(BASES[net(env)].rest, env.HELIUS_API_KEY, path, options)
}

export function walletCall(
  env: HeliusEnv,
  path: string,
  options?: { method?: string; body?: unknown },
) {
  return httpCall(BASES[net(env)].wallet, env.HELIUS_API_KEY, path, options)
}

export { restCall as webhookCall }
