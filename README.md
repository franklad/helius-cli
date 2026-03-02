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
| `send` | Send transactions via Helius Sender |
| `mint` | Mint compressed NFTs |
| `das <sub>` | DAS asset queries (search, get, proof, token-accounts, ...) |
| `tx <sub>` | Parse transactions, get history |
| `wallet <sub>` | Wallet identity, balances, history, transfers |
| `webhook <sub>` | Create, list, update, delete webhooks |
| `zk <sub>` | ZK compression (accounts, tokens, proofs, ...) |

Run `helius --help` or `helius <command> --help` for full details.
