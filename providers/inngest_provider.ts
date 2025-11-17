import { Inngest } from 'inngest'
import { connect } from 'inngest/connect'
import type { ApplicationService } from '@adonisjs/core/types'
import type { InngestConfig } from '../src/types.ts'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    inngest: Inngest
  }
}

/**
 * AdonisJS provider for Inngest integration.
 * Handles client registration and workflow function creation.
 */
export default class InngestProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Create Inngest functions from configured workflows
   */
  async #createFunctions(inngest: Inngest) {
    const config = this.app.config.get<InngestConfig>('inngest')

    return config.workflows.map(async (importWorkflow) => {
      const Workflow = await importWorkflow().then((mod) => mod.default)
      const workflow = await this.app.container.make(Workflow)

      return inngest.createFunction(workflow.options, workflow.trigger, async (ctx) =>
        workflow.handler(ctx as any)
      )
    })
  }

  /**
   * Register Inngest client in IoC container
   */
  register() {
    const config = this.app.config.get<InngestConfig>('inngest')

    this.app.container.singleton('inngest', async () => {
      const logger = await this.app.container.make('logger')

      return new Inngest({ ...config, logger })
    })
  }

  /**
   * Initialize Inngest connection with registered functions
   */
  async ready() {
    const inngest = await this.app.container.make('inngest')
    const functions = await this.#createFunctions(inngest)

    await connect({
      apps: [{ client: inngest, functions: await Promise.all(functions) }],
    })
  }
}
