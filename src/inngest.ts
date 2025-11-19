import { Logger } from '@adonisjs/core/logger'
import { InngestClient, InngestConfig } from './types.ts'
import { Inngest as InngestBaseClient } from 'inngest'
import { Container } from '@adonisjs/core/container'
import type { Router } from '@adonisjs/core/http'

export class Inngest {
  /**
   * Cache of created Inngest functions, indexed by workflow ID
   */
  client: InngestClient
  #functionCache = new Map<string, any>()

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
   * Create a single Inngest function from a workflow instance
   */
  #createFunction(workflow: any) {
    const inngestFunction = this.client.createFunction(
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

  constructor(
    private container: Container<any>,
    private config: InngestConfig,
    private router: Router,
    logger: Logger
  ) {
    this.client = new InngestBaseClient({ logger, ...config })
  }

  async loadFunctions() {
    if (!this.config.workflows || this.config.workflows.length === 0) {
      return []
    }

    const workflows = await Promise.all(
      this.config.workflows.map(async (importWorkflow) => {
        const Workflow = await importWorkflow().then((mod) => mod.default)
        return await this.container.make(Workflow)
      })
    )

    return workflows.map((workflow) => this.#createFunction(workflow))
  }

  getLoadedFunctions() {
    return Array.from(this.#functionCache.values())
  }

  async connect() {
    const functions = await this.loadFunctions()
    await this.config.connectionStrategy.setup({
      functions,
      client: this.client,
      router: this.router,
    })
  }

  async shutdown() {
    await this.config.connectionStrategy.shutdown()
  }
}
