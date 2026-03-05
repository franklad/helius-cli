import { Cli } from 'incur'
import { rpcCall, restCall, walletCall } from './client.js'
import { heliusEnv, heliusVars } from './types.js'
import { loadConfig } from './commands/config.js'
import { status } from './commands/status.js'
import { priorityFee } from './commands/priority-fee.js'
import { send } from './commands/sender.js'
import { mint } from './commands/mint.js'
import { das } from './commands/das.js'
import { tx } from './commands/tx.js'
import { wallet } from './commands/wallet.js'
import { webhook } from './commands/webhook.js'
import { zk } from './commands/zk.js'
import { account } from './commands/account.js'
import { block } from './commands/block.js'
import { network } from './commands/network.js'
import { program } from './commands/program.js'
import { ws } from './commands/ws.js'
import { config } from './commands/config.js'
import { simd } from './commands/simd.js'

const cli = Cli.create('helius', {
  description: 'Solana CLI for Helius APIs — DAS, transactions, fees, webhooks, wallet, ZK compression',
  version: '0.1.0',
  env: heliusEnv,
  vars: heliusVars,
}).use(async (c, next) => {
  // Resolve API key: env var → config file
  let apiKey = c.env.HELIUS_API_KEY
  const cfg = !apiKey ? loadConfig() : undefined
  if (!apiKey && cfg?.apiKey) {
    apiKey = cfg.apiKey
    c.env.HELIUS_API_KEY = apiKey
  }

  // Commands that don't require an API key
  const noKeyRequired = c.command.startsWith('config')
  if (!apiKey && !noKeyRequired) {
    return c.error({
      code: 'MISSING_API_KEY',
      message: 'No API key found. Set HELIUS_API_KEY env var or run: helius config set-api-key <key>',
    })
  }

  // Also pick up network from config if not explicitly set via env
  if (cfg && !process.env.HELIUS_NETWORK && cfg.network) {
    c.env.HELIUS_NETWORK = cfg.network
  }

  c.set('rpc', (method: string, params?: unknown[] | Record<string, unknown>) => rpcCall(c.env, method, params))
  c.set('rest', (path: string, options?: { method?: string; body?: unknown }) => restCall(c.env, path, options))
  c.set('wallet', (path: string, options?: { method?: string; body?: unknown }) => walletCall(c.env, path, options))
  c.set('webhook', (path: string, options?: { method?: string; body?: unknown }) => restCall(c.env, path, options))
  c.set('apiKey', apiKey)
  c.set('network', c.env.HELIUS_NETWORK)
  await next()
})

// Top-level commands
cli.command(status)
cli.command(priorityFee)
cli.command(send)
cli.command(mint)

// Grouped sub-CLIs
cli.command(account)
cli.command(config)
cli.command(das)
cli.command(program)
cli.command(tx)
cli.command(wallet)
cli.command(webhook)
cli.command(zk)
cli.command(ws)

cli.command(simd)

// Solana RPC utilities
cli.command(block)
cli.command(network)

cli.serve(process.argv.slice(2))
