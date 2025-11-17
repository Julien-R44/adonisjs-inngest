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
export interface InngestTypings {}

/**
 * Extract the Inngest client type from user augmentation
 */
export type InngestClient = InngestTypings extends { client: infer C } ? C : never

/**
 * Utility type for values that can be single or array
 */
type SingleOrArray<T> = T | T[]

/**
 * Ensure a type is wrapped in an array
 */
type AsArray<T> = T extends any[] ? T : [T]

/**
 * Extract event name from trigger configuration
 */
type ExtractEventName<T> = T extends { event: infer E } ? (E extends string ? E : never) : never

/**
 * Extract the event data type from a workflow class
 */
type ExtractWorkflowEventData<TWorkflow extends Inngest.Workflow> = GetEvents<
  InngestClient,
  true
>[ExtractEventName<AsArray<TWorkflow['trigger']>[number]>]['data']

/**
 * Custom invoke function for workflow classes
 */
type WorkflowInvoke = <TWorkflowClass extends new (...args: any[]) => Inngest.Workflow>(
  id: string,
  opts: {
    workflow: TWorkflowClass
    data: ExtractWorkflowEventData<InstanceType<TWorkflowClass>>
  }
) => Promise<unknown>

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
   * Execution context provided to workflow handlers with custom step.invoke
   */
  export type Context<T extends Inngest.Workflow> = Omit<
    OriginalContext<
      InngestClient,
      EventNameFromTrigger<GetEvents<InngestClient, true>, AsArray<T['trigger']>[number]>,
      Record<never, never>
    >,
    'step'
  > & {
    step: Omit<
      OriginalContext<
        InngestClient,
        EventNameFromTrigger<GetEvents<InngestClient, true>, AsArray<T['trigger']>[number]>,
        Record<never, never>
      >['step'],
      'invoke'
    > & {
      invoke: WorkflowInvoke
    }
  }

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
