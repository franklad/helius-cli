#!/usr/bin/env bun
import { Cli } from 'incur'
import { balances } from './commands/balances.js'
import { transactions } from './commands/transactions.js'
import { webhooks } from './commands/webhooks.js'

Cli.create('helius', {
  description: 'CLI for the Helius Solana API',
})
  .command(balances)
  .command(transactions)
  .command(webhooks)
  .serve()
