import { Cli, z } from 'incur'
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export const CONFIG_DIR = join(homedir(), '.helius')
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface Config {
  apiKey?: string
  network?: 'mainnet' | 'devnet'
  projectId?: string
  jwt?: string
}

export function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {}
  return {}
}

function save(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

const config = Cli.create('config', {
  description: 'Manage CLI configuration — API key, network, project',
})

// ── show ──

config.command('show', {
  description: 'Show current CLI configuration',
  options: z.object({
    reveal: z.boolean().default(false),
  }),
  alias: { reveal: 'r' },
  output: z.object({
    apiKey: z.string().nullable(),
    network: z.string(),
    projectId: z.string().nullable(),
    loggedIn: z.boolean(),
    configPath: z.string(),
  }),
  examples: [
    { description: 'Show config (API key masked)' },
    { options: { reveal: true }, description: 'Show full API key' },
  ],
  async run(c) {
    const cfg = loadConfig()
    const displayKey = cfg.apiKey
      ? (c.options.reveal ? cfg.apiKey : cfg.apiKey.slice(0, 8) + '...')
      : null

    return c.ok({
      apiKey: displayKey,
      network: cfg.network ?? 'mainnet',
      projectId: cfg.projectId ?? null,
      loggedIn: !!cfg.jwt,
      configPath: CONFIG_FILE,
    })
  },
})

// ── set-api-key ──

config.command('set-api-key', {
  description: 'Set the Helius API key',
  args: z.object({ key: z.string() }),
  output: z.object({
    apiKey: z.string(),
  }),
  examples: [
    { args: { key: '<your-api-key>' }, description: 'Save API key to config' },
  ],
  async run(c) {
    const cfg = loadConfig()
    cfg.apiKey = c.args.key
    save(cfg)

    return c.ok({
      apiKey: c.args.key.slice(0, 8) + '...',
    })
  },
})

// ── set-network ──

config.command('set-network', {
  description: 'Set the default network (mainnet or devnet)',
  args: z.object({ network: z.enum(['mainnet', 'devnet']) }),
  output: z.object({
    network: z.string(),
  }),
  examples: [
    { args: { network: 'devnet' }, description: 'Switch to devnet' },
  ],
  async run(c) {
    const cfg = loadConfig()
    cfg.network = c.args.network
    save(cfg)

    return c.ok({
      network: c.args.network,
    })
  },
})

// ── set-project ──

config.command('set-project', {
  description: 'Set the default project ID',
  args: z.object({ projectId: z.string() }),
  output: z.object({
    projectId: z.string(),
  }),
  examples: [
    { args: { projectId: '<project-id>' }, description: 'Set default project' },
  ],
  async run(c) {
    const cfg = loadConfig()
    cfg.projectId = c.args.projectId
    save(cfg)

    return c.ok({
      projectId: c.args.projectId,
    })
  },
})

// ── clear ──

config.command('clear', {
  description: 'Clear all CLI configuration',
  output: z.object({
    cleared: z.boolean(),
  }),
  async run(c) {
    if (existsSync(CONFIG_FILE)) {
      rmSync(CONFIG_FILE)
    }

    return c.ok({
      cleared: true,
    })
  },
})

export { config }
