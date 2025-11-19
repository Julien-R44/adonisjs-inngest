import { connect, ConnectHandlerOptions, WorkerConnection } from 'inngest/connect'

import { ConnectionStrategy, StrategySetupParams } from './common.ts'

type ConnectStrategyOptions = Partial<Omit<ConnectHandlerOptions, 'apps'>>

/**
 * Connect strategy for Inngest integration. Use websocket connection to connect
 * to Inngest and handle events.
 */
export class ConnectStrategy implements ConnectionStrategy {
  #options: ConnectStrategyOptions
  #connection!: WorkerConnection

  constructor(options: ConnectStrategyOptions = {}) {
    this.#options = options
  }

  async setup({ client, functions }: StrategySetupParams) {
    this.#connection = await connect({ apps: [{ client, functions }], ...this.#options })
  }

  async shutdown() {
    await this.#connection?.close()
  }
}
