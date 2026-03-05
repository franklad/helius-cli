import { Cli, z } from 'incur'

const SIMD_REPO = 'solana-foundation/solana-improvement-documents'
const SIMD_API_URL = `https://api.github.com/repos/${SIMD_REPO}/contents/proposals`
const SIMD_RAW_BASE = `https://raw.githubusercontent.com/${SIMD_REPO}/main/proposals`

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'helius-cli',
    'Accept': 'application/vnd.github.v3+json',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }
  return headers
}

interface SimdEntry {
  number: string
  slug: string
  filename: string
}

async function fetchIndex(): Promise<SimdEntry[]> {
  const res = await fetch(SIMD_API_URL, { headers: githubHeaders() })
  if (!res.ok) {
    const hint = res.status === 403 || res.status === 429
      ? '. Set GITHUB_TOKEN env var to increase rate limit'
      : ''
    throw new Error(`GitHub API returned ${res.status}${hint}`)
  }

  const files = (await res.json()) as { name: string }[]
  return files
    .filter((f) => f.name.endsWith('.md'))
    .map((f) => {
      const m = f.name.match(/^(\d+)-(.+)\.md$/)
      return m ? { number: m[1], slug: m[2], filename: f.name } : null
    })
    .filter((x): x is SimdEntry => x !== null)
}

function extractFrontMatter(md: string): { title: string; status: string; authors: string } {
  const fm = md.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? ''
  return {
    title: fm.match(/^title:\s*(.+)/m)?.[1]?.replace(/^["']|["']$/g, '').trim() ?? '',
    status: fm.match(/^status:\s*(.+)/m)?.[1]?.trim() ?? '',
    authors: fm.match(/^authors:\s*(.+)/m)?.[1]?.trim() ?? '',
  }
}

const simd = Cli.create('simd', {
  description: 'Solana Improvement Documents — list and read proposals',
})

// ── list ──

simd.command('list', {
  description: 'List all Solana Improvement Documents',
  output: z.object({
    total: z.number(),
    items: z.array(z.object({
      number: z.string(),
      title: z.string(),
    })),
  }),
  examples: [
    { description: 'List all SIMDs' },
  ],
  async run(c) {
    const index = await fetchIndex()

    return c.ok({
      total: index.length,
      items: index.map((e) => ({
        number: e.number,
        title: e.slug.replace(/-/g, ' '),
      })),
    }, {
      cta: {
        commands: [
          { command: 'simd get', description: 'Read a specific SIMD' },
        ],
      },
    })
  },
})

// ── get ──

simd.command('get', {
  description: 'Read a specific Solana Improvement Document',
  args: z.object({ number: z.string() }),
  output: z.object({
    number: z.string(),
    title: z.string(),
    status: z.string(),
    authors: z.string(),
    content: z.string(),
    source: z.string(),
  }),
  examples: [
    { args: { number: '96' }, description: 'Read SIMD-0096' },
  ],
  async run(c) {
    const padded = c.args.number.replace(/^0+/, '').padStart(4, '0')

    const index = await fetchIndex()
    const entry = index.find((e) => e.number === padded)

    if (!entry) {
      const target = parseInt(padded, 10)
      const nearby = index
        .filter((e) => Math.abs(parseInt(e.number, 10) - target) <= 10)
        .map((e) => `SIMD-${e.number}: ${e.slug.replace(/-/g, ' ')}`)

      return c.error({
        code: 'SIMD_NOT_FOUND',
        message: `SIMD-${padded} not found` + (nearby.length ? `\n\nNearby proposals:\n  ${nearby.join('\n  ')}` : ''),
        retryable: false,
      })
    }

    const res = await fetch(`${SIMD_RAW_BASE}/${entry.filename}`, {
      headers: { 'User-Agent': 'helius-cli' },
    })
    if (!res.ok) {
      return c.error({
        code: 'FETCH_FAILED',
        message: `Failed to fetch SIMD-${padded}: HTTP ${res.status}`,
        retryable: true,
      })
    }

    const content = await res.text()
    const fm = extractFrontMatter(content)
    const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim()

    return c.ok({
      number: entry.number,
      title: fm.title || entry.slug.replace(/-/g, ' '),
      status: fm.status,
      authors: fm.authors,
      content: body,
      source: `https://github.com/${SIMD_REPO}/blob/main/proposals/${entry.filename}`,
    })
  },
})

export { simd }
