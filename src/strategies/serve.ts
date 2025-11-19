import type { HttpContext } from '@adonisjs/core/http'
import { InngestCommHandler, type ServeHandlerOptions } from 'inngest'

import { ConnectionStrategy, StrategySetupParams } from './common.ts'

/**
 * The name of the framework, used to identify the framework in Inngest
 * dashboards and during testing.
 */
const frameworkName = 'adonisjs'

/**
 * Serve strategy for Inngest integration. Use HTTP server to handle Inngest
 * events.
 */
export class ServeStrategy implements ConnectionStrategy {
  private options: Omit<ServeHandlerOptions, 'client' | 'functions'>

  constructor(options: Omit<ServeHandlerOptions, 'client' | 'functions'> = {}) {
    this.options = options
  }

  #createHandler(client: any, functions: any[]) {
    const handler = new InngestCommHandler({
      frameworkName,
      client,
      functions,
      ...this.options,
      handler: (ctx: HttpContext) => ({
        body: async () => ctx.request.body(),
        headers: (key: string) => ctx.request.header(key),
        method: () => ctx.request.method(),
        url: () => new URL(ctx.request.completeUrl()),
        queryString: (key: string) => ctx.request.qs()[key],
        env: () => process.env,
        transformResponse: ({ body, status, headers }) => {
          const response = ctx.response.status(status)
          Object.entries(headers).forEach(([key, value]) => response.header(key, String(value)))

          return response.send(body)
        },
      }),
    })

    return handler.createHandler()
  }

  async setup({ client, functions, router }: StrategySetupParams) {
    if (!router) throw new Error('ServeStrategy requires a router instance')

    const handler = this.#createHandler(client, functions)

    const path = this.options.servePath || '/api/inngest'
    router.any(path, (ctx: HttpContext) => handler(ctx))
  }

  async shutdown() {
    // No cleanup needed for serve strategy
  }
}
