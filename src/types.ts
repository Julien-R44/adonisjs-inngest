import type { GetEvents, InngestFunction, InngestMiddleware } from 'inngest'
import type {
  Context as OriginalContext,
  EventNameFromTrigger,
  TriggersFromClient,
  ClientOptions,
} from 'inngest/types'

/**
 * Interface to be augmented in user-land to provide type-safe Inngest client
 *
 * @example
 * declare module '@julr/adonisjs-inngest' {
 *   interface InngestTypings {
 *     client: typeof myInngestClient
 *   }
 * }
 */
interface InngestTypings {}

/**
 * Extract the Inngest client type from user augmentation
 */
type InngestClient = InngestTypings extends { client: infer C } ? C : never

/**
 * Utility type for values that can be single or array
 */
type SingleOrArray<T> = T | T[]

/**
 * Ensure a type is wrapped in an array
 */
type AsArray<T> = T extends any[] ? T : [T]

/**
 * Namespace containing type definitions for Inngest workflows in AdonisJS
 */
export namespace Inngest {
  /**
   * Configuration options for Inngest functions (excludes trigger)
   */
  export type Options<T extends Inngest.Workflow = any> = Omit<
    InngestFunction.Options<InngestClient, InngestMiddleware.Stack, AsArray<T['trigger']>, any>,
    'trigger'
  >

  /**
   * Execution context provided to workflow handlers
   */
  export type Context<T extends Inngest.Workflow> = OriginalContext<
    InngestClient,
    EventNameFromTrigger<GetEvents<InngestClient, true>, AsArray<T['trigger']>[number]>,
    Record<never, never>
  >

  /**
   * Trigger configuration
   */
  export type TriggerOptions = SingleOrArray<
    InngestFunction.Trigger<TriggersFromClient<InngestClient>>
  >

  /**
   * Complete workflow definition interface
   */
  export interface Workflow {
    options: Options<any>
    trigger: TriggerOptions

    handler(ctx: Context<any>): void
    onFailure?(ctx: Context<any>): void
  }
}

/**
 * Inngest configuration type
 */
export type InngestConfig = Omit<ClientOptions, 'logger'> & {
  workflows: Array<() => Promise<{ default: new () => Inngest.Workflow }>>
}
