# helius-cli

CLI for the [Helius](https://helius.dev) Solana API, built with [incur](https://github.com/wevm/incur).

## Install

```bash
bun add -g helius-cli
```

Or run without installing:

```bash
bunx helius-cli --help
```

## Setup

Export your Helius API key:

```bash
export HELIUS_API_KEY=your_api_key_here
```

## Commands

### `balances`

```bash
# Get token balances for a wallet
helius balances get <address>
```

### `transactions`

```bash
# Get a parsed transaction by signature
helius transactions get <signature>

# Get transaction history for a wallet (default: 10)
helius transactions history <address>
helius transactions history <address> --limit 50
```

### `webhooks`

```bash
# List all webhooks
helius webhooks list

# Create a webhook
helius webhooks create --url https://example.com/hook --address <wallet>

# Delete a webhook
helius webhooks delete <webhookId>
```

## Global flags

Every command supports:

| Flag | Description |
|------|-------------|
| `--format <toon\|json\|yaml\|md\|jsonl>` | Output format (default: toon) |
| `--json` | Shorthand for `--format json` |
| `--verbose` | Show full output envelope |
| `--help` | Show help |
| `--version` | Show version |
| `--llms` | Print LLM-readable manifest |
| `--mcp` | Start as MCP stdio server |

## Agent / MCP support

Register as an MCP server so AI agents can call it directly:

```bash
helius mcp add
```

Or sync skill files:

```bash
helius skills add
```

## License

MIT
