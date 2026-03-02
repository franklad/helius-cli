import { Cli, z } from 'incur'

export const balances = Cli.create('balances', {
  description: 'Token balance commands',
})
  .command('get', {
    description: 'Get token balances for a wallet address',
    args: z.object({
      address: z.string().describe('Wallet address (base58)'),
    }),
    env: z.object({
      HELIUS_API_KEY: z.string().describe('Helius API key'),
    }),
    async run(c) {
      const url = `https://mainnet.helius-rpc.com/?api-key=${c.env.HELIUS_API_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            c.args.address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ],
        }),
      })
      const json = (await res.json()) as { result?: { value?: unknown[] } }
      const accounts = json.result?.value ?? []
      return { address: c.args.address, tokenAccounts: accounts.length, accounts }
    },
  })
