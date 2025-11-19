import type { ApplicationService } from '@adonisjs/core/types'
import { Inngest } from '../src/inngest.ts'
import type { InngestConfig } from '../src/types.ts'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    inngest: Inngest
  }
}

/**
 * AdonisJS provider for Inngest integration
 */
export default class InngestProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register Inngest service in IoC container
   */
  register() {
    this.app.container.singleton('inngest', async () => {
      const config = this.app.config.get<InngestConfig>('inngest')
      const logger = await this.app.container.make('logger')
      const router = await this.app.container.make('router')
      const container = this.app.container

      return new Inngest(container, config, router, logger)
    })
  }

  /**
   * Initialize Inngest connection with registered functions
   */
  async start() {
    const inngest = await this.app.container.make('inngest')
    await inngest.connect()
  }

  /**
   * Gracefully shutdown Inngest connection
   */
  async shutdown() {
    const inngest = await this.app.container.make('inngest')
    await inngest.shutdown()
  }
}
