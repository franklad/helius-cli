const RPC_BASE = 'https://mainnet.helius-rpc.com'
const REST_BASE = 'https://api-mainnet.helius-rpc.com'
const WALLET_BASE = 'https://api.helius.xyz'

export async function rpcCall(
  apiKey: string,
  method: string,
  params: unknown[] | Record<string, unknown> = [],
) {
  const url = `${RPC_BASE}/?api-key=${apiKey}`
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

export async function restCall(
  apiKey: string,
  path: string,
  options?: { method?: string; body?: unknown },
) {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${REST_BASE}${path}${separator}api-key=${apiKey}`
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

export async function walletCall(
  apiKey: string,
  path: string,
  options?: { method?: string; body?: unknown },
) {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${WALLET_BASE}${path}${separator}api-key=${apiKey}`
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

export { restCall as webhookCall }
