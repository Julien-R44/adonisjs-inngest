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
  /**
   * Cache of created Inngest functions, indexed by workflow ID
   */
  #functionCache = new Map<string, any>()

  constructor(protected app: ApplicationService) {}

  /**
   * Create a single Inngest function from a workflow instance
   */
  #createFunction(inngest: Inngest, workflow: any) {
    const inngestFunction = inngest.createFunction(
      workflow.options,
      workflow.trigger,
      async (ctx) => {
        const originalInvoke = ctx.step.invoke
        ctx.step.invoke = this.#createWorkflowInvokeWrapper(originalInvoke)
        return workflow.handler(ctx as any)
      }
    )

    this.#functionCache.set(workflow.options.id, inngestFunction)
    return inngestFunction
  }

  /**
   * Create wrapper for ctx.step.invoke to support workflow classes
   */
  #createWorkflowInvokeWrapper(originalInvoke: any) {
    return async (idOrOptions: any, opts: any): Promise<any> => {
      if (!opts?.workflow) return originalInvoke(idOrOptions, opts)

      const workflowInstance = new opts.workflow()
      const functionId = workflowInstance.options.id

      const cachedFunction = this.#functionCache.get(functionId)
      if (!cachedFunction) throw new Error(`Function with ID "${functionId}" not found in cache`)

      return originalInvoke(idOrOptions, { function: cachedFunction, data: opts.data })
    }
  }

  /**
   * Create Inngest functions from configured workflows
   */
  async #createFunctions(inngest: Inngest) {
    const config = this.app.config.get<InngestConfig>('inngest')

    const workflows = await Promise.all(
      config.workflows.map(async (importWorkflow) => {
        const Workflow = await importWorkflow().then((mod) => mod.default)
        return await this.app.container.make(Workflow)
      })
    )

    return workflows.map((workflow) => this.#createFunction(inngest, workflow))
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

    await connect({ apps: [{ client: inngest, functions }] })
  }
}
