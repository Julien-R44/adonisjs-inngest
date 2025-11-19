import vine from '@vinejs/vine'
import type { SchemaTypes } from '@vinejs/vine/types'

import { Inngest } from './types.ts'

type VineObjectValidator<T extends Record<string, SchemaTypes>> = ReturnType<
  typeof vine.compile<ReturnType<typeof vine.object<T>>>
>

/**
 * Define workflow options
 */
export function defineOptions<T extends Inngest.Options>(options: T) {
  return options
}

/**
 * Define workflow trigger
 */
export function defineTrigger<T extends Inngest.TriggerOptions>(options: T) {
  return options
}

/**
 * Define a vine validator. Shortcut for `vine.compile(vine.object(schema))`
 */
export function defineVineValidator<Properties extends Record<string, SchemaTypes>>(
  schema: Properties
): VineObjectValidator<Properties> {
  return vine.compile(vine.object(schema))
}

export { Inngest } from './inngest.ts'
export { ServeStrategy } from './strategies/serve.ts'
export { ConnectStrategy } from './strategies/connect.ts'
export { type ConnectionStrategy } from './strategies/common.ts'
export { defineConfig } from './define_config.ts'
