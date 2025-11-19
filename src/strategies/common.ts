import { InngestClient } from '../types.ts'
import type { Router } from '@adonisjs/core/http'

export interface StrategySetupParams {
  client: InngestClient
  functions: any[]
  router?: Router
}

export interface ConnectionStrategy {
  setup(params: StrategySetupParams): Promise<void>
  shutdown(): Promise<void>
}
