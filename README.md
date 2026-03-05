# helius-cli

Solana CLI for [Helius](https://helius.dev) APIs — DAS, transactions, fees, webhooks, wallet, and ZK compression.

Built with [incur](https://github.com/franklad/incur).

## Setup

```sh
bun install
cp .env.example .env  # fill in your API key
```

## Usage

```sh
# dev mode
bun dev <command>

# build + run
bun run build
bun start <command>
```

## Commands

| Command | Description |
|---|---|
| `status` | Helius RPC health, slot, TPS |
| `priority-fee` | Priority fee estimates for accounts |
| `send <sub>` | Send transactions — sender, broadcast, poll, compute-units |
| `mint` | Mint compressed NFTs |
| `account <sub>` | Account info, balance, token balances, token holders |
| `das <sub>` | DAS asset queries (search, get, proof, token-accounts, ...) |
| `program <sub>` | Program accounts via Helius enhanced RPC (1 credit vs 10) |
| `tx <sub>` | Parse transactions, get history |
| `wallet <sub>` | Wallet identity, balances, history, transfers |
| `webhook <sub>` | Create, list, update, delete webhooks |
| `ws <sub>` | WebSocket subscriptions — account, logs, slot, signature, program |
| `zk <sub>` | ZK compression (accounts, tokens, proofs, ...) |
| `config <sub>` | CLI configuration — API key, network, project |
| `simd <sub>` | Solana Improvement Documents — list and read proposals |
| `block <slot>` | Block details by slot number |
| `network` | Solana network status — epoch, version, block height |

Run `helius --help` or `helius <command> --help` for full details.
