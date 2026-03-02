import { Cli, z } from 'incur'
import { webhookCall } from '../client.js'
import { heliusEnv } from '../types.js'

const webhook = Cli.create('webhook', {
  description: 'Manage Helius webhooks (create, get, list, update, delete)',
})

webhook.command('create', {
  description: 'Create a new webhook',
  options: z.object({
    url: z.string(),
    addresses: z.string(),
    types: z.string().default('*'),
    webhookType: z.string().default('enhanced'),
    authHeader: z.string().optional(),
    txnStatus: z.enum(['success', 'failed', 'all']).optional(),
  }),
  env: heliusEnv,
  output: z.object({
    webhookId: z.string(),
    url: z.string(),
  }),
  examples: [
    {
      options: {
        url: 'https://example.com/hook',
        addresses: 'So11...abc,JUP6...def',
      },
      description: 'Create enhanced webhook',
    },
  ],
  async run(c) {
    const body: Record<string, unknown> = {
      webhookURL: c.options.url,
      accountAddresses: c.options.addresses.split(',').map((s) => s.trim()),
      webhookType: c.options.webhookType,
    }
    body.transactionTypes =
      c.options.types === '*'
        ? ['ANY']
        : c.options.types.split(',').map((s) => s.trim())
    if (c.options.authHeader) body.authHeader = c.options.authHeader
    if (c.options.txnStatus) body.txnStatus = c.options.txnStatus

    const result = (await webhookCall(c.env, '/v0/webhooks', {
      body,
    })) as { webhookID: string; webhookURL: string }

    return c.ok(
      { webhookId: result.webhookID, url: result.webhookURL },
      {
        cta: {
          description: 'Next steps:',
          commands: [
            { command: 'webhook list', description: 'List all webhooks' },
            {
              command: 'webhook delete',
              description: 'Delete this webhook',
            },
          ],
        },
      },
    )
  },
})

webhook.command('get', {
  description: 'Get details of a specific webhook',
  args: z.object({ id: z.string() }),
  env: heliusEnv,
  output: z.object({
    webhookId: z.string(),
    url: z.string(),
    type: z.string(),
    addresses: z.array(z.string()),
    transactionTypes: z.array(z.string()),
  }),
  examples: [
    { args: { id: '<webhook-id>' }, description: 'Get webhook details' },
  ],
  async run(c) {
    const result = (await webhookCall(
      c.env,
      `/v0/webhooks/${c.args.id}`,
    )) as any

    return c.ok({
      webhookId: result.webhookID as string,
      url: result.webhookURL as string,
      type: result.webhookType as string,
      addresses: (result.accountAddresses ?? []) as string[],
      transactionTypes: (result.transactionTypes ?? []) as string[],
    }, {
      cta: {
        description: 'Next steps:',
        commands: [
          { command: 'webhook update', description: 'Update this webhook' },
          { command: 'webhook delete', args: { id: c.args.id }, description: 'Delete this webhook' },
        ],
      },
    })
  },
})

webhook.command('list', {
  description: 'List all webhooks',
  env: heliusEnv,
  output: z.array(
    z.object({
      webhookId: z.string(),
      url: z.string(),
      type: z.string(),
      addresses: z.array(z.string()),
    }),
  ),
  examples: [{ description: 'List all webhooks' }],
  async run(c) {
    const result = (await webhookCall(
      c.env,
      '/v0/webhooks',
    )) as any[]

    const webhooks = (result ?? []).map((w: any) => ({
      webhookId: w.webhookID as string,
      url: w.webhookURL as string,
      type: w.webhookType as string,
      addresses: (w.accountAddresses ?? []) as string[],
    }))

    return c.ok(webhooks, {
      cta: {
        description: 'Manage webhooks:',
        commands: [
          { command: 'webhook create', description: 'Create a new webhook' },
          { command: 'webhook delete', description: 'Delete a webhook' },
        ],
      },
    })
  },
})

webhook.command('update', {
  description: 'Update an existing webhook',
  args: z.object({ id: z.string() }),
  options: z.object({
    url: z.string().optional(),
    addresses: z.string().optional(),
    types: z.string().optional(),
    webhookType: z.string().optional(),
    authHeader: z.string().optional(),
    txnStatus: z.enum(['success', 'failed', 'all']).optional(),
  }),
  env: heliusEnv,
  output: z.object({
    webhookId: z.string(),
    url: z.string(),
  }),
  examples: [
    {
      args: { id: '<webhook-id>' },
      options: { url: 'https://example.com/new-hook' },
      description: 'Update webhook URL',
    },
  ],
  async run(c) {
    const body: Record<string, unknown> = {}
    if (c.options.url) body.webhookURL = c.options.url
    if (c.options.addresses) body.accountAddresses = c.options.addresses.split(',').map((s) => s.trim())
    if (c.options.webhookType) body.webhookType = c.options.webhookType
    if (c.options.types) body.transactionTypes = c.options.types.split(',').map((s) => s.trim())
    if (c.options.authHeader) body.authHeader = c.options.authHeader
    if (c.options.txnStatus) body.txnStatus = c.options.txnStatus

    const result = (await webhookCall(c.env, `/v0/webhooks/${c.args.id}`, {
      method: 'PUT',
      body,
    })) as any

    return c.ok(
      { webhookId: result.webhookID ?? c.args.id, url: result.webhookURL ?? '' },
      {
        cta: {
          description: 'Next steps:',
          commands: [
            { command: 'webhook get', args: { id: c.args.id }, description: 'Verify update' },
            { command: 'webhook list', description: 'List all webhooks' },
          ],
        },
      },
    )
  },
})

webhook.command('delete', {
  description: 'Delete a webhook by ID',
  args: z.object({ id: z.string() }),
  env: heliusEnv,
  output: z.object({ deleted: z.boolean(), webhookId: z.string() }),
  examples: [
    {
      args: { id: '<webhook-id>' },
      description: 'Delete a webhook',
    },
  ],
  async run(c) {
    await webhookCall(c.env, `/v0/webhooks/${c.args.id}`, {
      method: 'DELETE',
    })

    return c.ok(
      { deleted: true, webhookId: c.args.id },
      {
        cta: {
          description: 'Next steps:',
          commands: [
            { command: 'webhook list', description: 'Verify deletion' },
            { command: 'webhook create', description: 'Create a new webhook' },
          ],
        },
      },
    )
  },
})

export { webhook }
