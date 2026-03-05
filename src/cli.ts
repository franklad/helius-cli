import { Cli } from 'incur'
import { rpcCall, restCall, walletCall } from './client.js'
import { heliusEnv, heliusVars } from './types.js'
import { status } from './commands/status.js'
import { priorityFee } from './commands/priority-fee.js'
import { send } from './commands/sender.js'
import { mint } from './commands/mint.js'
import { das } from './commands/das.js'
import { tx } from './commands/tx.js'
import { wallet } from './commands/wallet.js'
import { webhook } from './commands/webhook.js'
import { zk } from './commands/zk.js'

const cli = Cli.create('helius', {
  description: 'Solana CLI for Helius APIs — DAS, transactions, fees, webhooks, wallet, ZK compression',
  version: '0.1.0',
  env: heliusEnv,
  vars: heliusVars,
}).use(async (c, next) => {
  c.set('rpc', (method: string, params?: unknown[] | Record<string, unknown>) => rpcCall(c.env, method, params))
  c.set('rest', (path: string, options?: { method?: string; body?: unknown }) => restCall(c.env, path, options))
  c.set('wallet', (path: string, options?: { method?: string; body?: unknown }) => walletCall(c.env, path, options))
  c.set('webhook', (path: string, options?: { method?: string; body?: unknown }) => restCall(c.env, path, options))
  c.set('apiKey', c.env.HELIUS_API_KEY)
  c.set('network', c.env.HELIUS_NETWORK)
  await next()
})

// Top-level commands
cli.command(status)
cli.command(priorityFee)
cli.command(send)
cli.command(mint)

// Grouped sub-CLIs
cli.command(das)
cli.command(tx)
cli.command(wallet)
cli.command(webhook)
cli.command(zk)

cli.serve(process.argv.slice(2))
