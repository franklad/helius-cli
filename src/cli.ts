import { Cli } from 'incur'
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
